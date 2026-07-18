// Similar-moments engine — "Have we seen conditions like this before?"
//
// Ranks historical moments in the 2012/2016/2020 cycles by how closely their
// market STATE resembles today's. Built only on signals that exist across all
// of history (no Fear & Greed in the model — it begins in 2018): how far
// through the cycle, how far below the running peak, price heat (Mayer
// Multiple) and the gain since the halving. Honest, price-derived, historical
// context — not a prediction.

import { CYCLES, CURRENT_CYCLE, TODAY, TODAY_DAY_IN_CYCLE, type Cycle, type CycleSample } from "./btcData";
import { sentimentValueNear } from "./sentiment";
import { format } from "date-fns";

const MS_DAY = 86_400_000;

interface Feat {
  progress: number;
  ddMag: number; // 0..1 (|drawdown| / 100)
  mayer: number; // normalised 0..1
  gain: number; // normalised 0..1 (log gain vs halving)
}

// Weighted so market STATE (drawdown + heat) matters most, calendar position
// less. Distance is a weighted RMS over the four features.
const W: Feat = { progress: 0.7, ddMag: 1.25, mayer: 1.25, gain: 0.8 };

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// Running-peak drawdown (%) per sample for one cycle. ≤ 0.
function drawdowns(c: Cycle): number[] {
  let peak = 0;
  return c.samples.map((s) => {
    if (s.price > peak) peak = s.price;
    return peak > 0 ? (s.price / peak - 1) * 100 : 0;
  });
}

function featOf(c: Cycle, s: CycleSample, drawdown: number): Feat {
  const gainMult = s.price / c.samples[0].price;
  return {
    progress: clamp01(s.day / 1458),
    ddMag: clamp01(Math.abs(drawdown) / 100),
    mayer: clamp01((s.mayer - 0.5) / 2.0), // ~0.5..2.5 → 0..1
    gain: clamp01(Math.log10(Math.max(1, gainMult)) / 2), // 1×..100× → 0..1
  };
}

// Per-feature closeness (0..100) between today's reference vector and a
// candidate. Each feature is already normalised to 0..1, so the closeness is
// just 100·(1 − |diff|). Descriptive only — the ranking uses `distance`, never
// this.
const FACTOR_LABEL: Record<SimilarFactorKey, string> = {
  drawdown: "Drawdown from high",
  cycleTiming: "Point in the cycle",
  marketHeat: "Market heat",
  gainSinceHalving: "Gain since halving",
};

function factorsOf(ref: Feat, cand: Feat): SimilarFactor[] {
  const closeness = (diff: number) => Math.max(0, Math.min(100, Math.round(100 * (1 - Math.abs(diff)))));
  return [
    { key: "drawdown", label: FACTOR_LABEL.drawdown, closeness: closeness(cand.ddMag - ref.ddMag) },
    { key: "cycleTiming", label: FACTOR_LABEL.cycleTiming, closeness: closeness(cand.progress - ref.progress) },
    { key: "marketHeat", label: FACTOR_LABEL.marketHeat, closeness: closeness(cand.mayer - ref.mayer) },
    { key: "gainSinceHalving", label: FACTOR_LABEL.gainSinceHalving, closeness: closeness(cand.gain - ref.gain) },
  ];
}

function distance(a: Feat, b: Feat): number {
  const d =
    W.progress * (a.progress - b.progress) ** 2 +
    W.ddMag * (a.ddMag - b.ddMag) ** 2 +
    W.mayer * (a.mayer - b.mayer) ** 2 +
    W.gain * (a.gain - b.gain) ** 2;
  const wsum = W.progress + W.ddMag + W.mayer + W.gain;
  return Math.sqrt(d / wsum);
}

// Per-feature closeness for the "why is this the closest match?" read. Additive
// and optional — existing consumers ignore it. `closeness` is 0..100 (100 =
// near-identical on that feature); it is NOT part of the ranking math, only an
// honest, after-the-fact breakdown of which features the match shares.
export type SimilarFactorKey = "drawdown" | "cycleTiming" | "marketHeat" | "gainSinceHalving";
export interface SimilarFactor {
  key: SimilarFactorKey;
  label: string;
  closeness: number; // 0..100
}

export interface SimilarMoment {
  cycleId: number;
  short: string;
  color: string;
  year: string;
  day: number;
  dateLabel: string; // "Mar 2017"
  similarity: number; // 0..100
  factors?: SimilarFactor[]; // per-feature closeness vs today (additive, optional)
  metrics: {
    price: number;
    cycleDay: number;
    drawdown: number; // %, ≤ 0
    mayer: number;
    gainMult: number;
    fearGreed: number | null; // only where the index existed
  };
  context: string;
  // What followed this exact moment, in its own cycle: price change 30/60/90
  // days later. Null where that cycle lacks data that far out. Historical only.
  next: { d30: number | null; d60: number | null; d90: number | null };
  // Price path around the moment (±150d within that cycle), as multiple of the
  // moment's price, for a sparkline. `markerDay` is the moment itself.
  spark: { day: number; mult: number }[];
  markerDay: number;
}

function nearestSample(c: Cycle, day: number): CycleSample {
  return c.samples.reduce((best, x) => (Math.abs(x.day - day) < Math.abs(best.day - day) ? x : best));
}

// Price change `days` after a moment, within its own cycle. Null when the cycle
// doesn't extend that far (weekly tolerance).
function fwd(c: Cycle, baseDay: number, basePrice: number, days: number): number | null {
  const target = baseDay + days;
  const lastDay = c.samples[c.samples.length - 1].day;
  if (target > lastDay + 10) return null;
  const f = nearestSample(c, target);
  if (f.day <= baseDay) return null;
  return Math.round((f.price / basePrice - 1) * 100);
}

function todayFeat(): { feat: Feat; drawdown: number } {
  const dds = drawdowns(CURRENT_CYCLE);
  const idx = CURRENT_CYCLE.samples.length - 1;
  const drawdown = dds[idx] ?? 0;
  return { feat: featOf(CURRENT_CYCLE, TODAY, drawdown), drawdown };
}

export function similarMoments(limit = 4, ref: Feat = todayFeat().feat): SimilarMoment[] {
  const priors = CYCLES.filter((c) => c.id !== 5);

  type Scored = { c: Cycle; s: CycleSample; drawdown: number; sim: number };
  const scored: Scored[] = [];
  for (const c of priors) {
    const dds = drawdowns(c);
    c.samples.forEach((s, i) => {
      if (s.day < 30 || s.price <= 0) return;
      const sim = Math.max(0, 1 - distance(ref, featOf(c, s, dds[i]))) * 100;
      scored.push({ c, s, drawdown: dds[i], sim });
    });
  }
  scored.sort((a, b) => b.sim - a.sim);

  // Dedupe for a varied, ranked shortlist: skip anything within 100 days of an
  // already-kept moment in the same cycle (avoids adjacent weekly samples), and
  // cap each cycle to 2 so the list spans eras rather than one bear market —
  // while staying strictly ordered by true similarity.
  const kept: Scored[] = [];
  for (const cand of scored) {
    if (kept.length >= limit) break;
    const sameCycle = kept.filter((k) => k.c.id === cand.c.id);
    if (sameCycle.length >= 2) continue;
    if (sameCycle.some((k) => Math.abs(k.s.day - cand.s.day) < 100)) continue;
    kept.push(cand);
  }

  return kept.map(({ c, s, drawdown, sim }) => {
    const halvingMs = new Date(c.halvingDate).getTime();
    const ts = halvingMs + s.day * MS_DAY;
    const gainMult = s.price / c.samples[0].price;
    const year = c.halvingDate.slice(0, 4);

    const spark = c.samples
      .filter((x) => Math.abs(x.day - s.day) <= 150 && x.price > 0)
      .map((x) => ({ day: x.day, mult: x.price / s.price }));

    const ddTxt = Math.round(drawdown);
    return {
      cycleId: c.id,
      short: c.short,
      color: c.color,
      year,
      day: s.day,
      dateLabel: monthYear(ts),
      similarity: Math.round(sim),
      factors: factorsOf(ref, featOf(c, s, drawdown)),
      metrics: {
        price: s.price,
        cycleDay: s.day,
        drawdown,
        mayer: s.mayer,
        gainMult,
        fearGreed: sentimentValueNear(ts),
      },
      context:
        ddTxt <= -3
          ? `Day ${s.day} of the ${year} cycle — about ${Math.abs(ddTxt)}% below its high, with price ${gainMult.toFixed(1)}× its halving level.`
          : `Day ${s.day} of the ${year} cycle — near its highs, price ${gainMult.toFixed(1)}× its halving level.`,
      next: {
        d30: fwd(c, s.day, s.price, 30),
        d60: fwd(c, s.day, s.price, 60),
        d90: fwd(c, s.day, s.price, 90),
      },
      spark,
      markerDay: s.day,
    };
  });
}

function monthYear(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

// The current moment, for the "you are here" reference shown alongside matches.
export function currentMoment(): { day: number; drawdown: number; mayer: number; gainMult: number } {
  const { drawdown } = todayFeat();
  return {
    day: TODAY_DAY_IN_CYCLE,
    drawdown,
    mayer: TODAY.mayer,
    gainMult: TODAY.price / CURRENT_CYCLE.samples[0].price,
  };
}

// Reconstruct the current cycle's feature vector as it stood `days` ago, from
// the nearest weekly sample at or before that point. Running-peak drawdown uses
// only data up to that sample, so this is a legitimate point-in-time reference
// with no look-ahead. Null when history doesn't reach back that far.
function refFeatDaysAgo(days: number): { feat: Feat; dayAtRef: number; ts: number } | null {
  const dds = drawdowns(CURRENT_CYCLE);
  const samples = CURRENT_CYCLE.samples;
  const todayDay = samples[samples.length - 1]?.day ?? TODAY_DAY_IN_CYCLE;
  const targetDay = todayDay - days;
  if (targetDay < 30) return null;
  let idx = -1;
  for (let i = 0; i < samples.length; i++) {
    if (samples[i].day <= targetDay) idx = i;
    else break;
  }
  if (idx < 0 || samples[idx].price <= 0) return null;
  const halvingMs = new Date(CURRENT_CYCLE.halvingDate).getTime();
  return { feat: featOf(CURRENT_CYCLE, samples[idx], dds[idx] ?? 0), dayAtRef: samples[idx].day, ts: halvingMs + samples[idx].day * MS_DAY };
}

export interface SimilarityTrend {
  available: boolean;
  current: { dateLabel: string; similarity: number } | null;
  prior: { dateLabel: string; similarity: number } | null; // the top match as it stood ~`days` ago
  delta: number | null; // change in the top match's similarity score
  topChanged: boolean; // did the #1 historical match itself change?
  cycleDay: number;
  drawdown: number; // current, ≤ 0
  sinceLabel: string | null; // date of the prior reference point
}

// How the closest-historical-match read has shifted over the past `days`. The
// prior read recomputes the ranking from the point-in-time reference vector, so
// it answers "what did the model say a week ago?" honestly. Descriptive only —
// a match is context for what happened before, never a forecast.
export function similarityTrend(days = 7): SimilarityTrend {
  const curTop = similarMoments(1)[0] ?? null;
  const cur = curTop ? { dateLabel: curTop.dateLabel, similarity: curTop.similarity } : null;
  const cm = currentMoment();

  const priorRef = refFeatDaysAgo(days);
  let prior: SimilarityTrend["prior"] = null;
  let sinceLabel: string | null = null;
  if (priorRef) {
    const priorTop = similarMoments(1, priorRef.feat)[0] ?? null;
    if (priorTop) {
      prior = { dateLabel: priorTop.dateLabel, similarity: priorTop.similarity };
      sinceLabel = format(priorRef.ts, "d MMM");
    }
  }

  return {
    available: !!cur,
    current: cur,
    prior,
    delta: cur && prior ? cur.similarity - prior.similarity : null,
    topChanged: !!cur && !!prior && cur.dateLabel !== prior.dateLabel,
    cycleDay: cm.day,
    drawdown: cm.drawdown,
    sinceLabel,
  };
}
