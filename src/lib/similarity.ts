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

function distance(a: Feat, b: Feat): number {
  const d =
    W.progress * (a.progress - b.progress) ** 2 +
    W.ddMag * (a.ddMag - b.ddMag) ** 2 +
    W.mayer * (a.mayer - b.mayer) ** 2 +
    W.gain * (a.gain - b.gain) ** 2;
  const wsum = W.progress + W.ddMag + W.mayer + W.gain;
  return Math.sqrt(d / wsum);
}

export interface SimilarMoment {
  cycleId: number;
  short: string;
  color: string;
  year: string;
  day: number;
  dateLabel: string; // "Mar 2017"
  similarity: number; // 0..100
  metrics: {
    price: number;
    cycleDay: number;
    drawdown: number; // %, ≤ 0
    mayer: number;
    gainMult: number;
    fearGreed: number | null; // only where the index existed
  };
  context: string;
  // Price path around the moment (±150d within that cycle), as multiple of the
  // moment's price, for a sparkline. `markerDay` is the moment itself.
  spark: { day: number; mult: number }[];
  markerDay: number;
}

function todayFeat(): { feat: Feat; drawdown: number } {
  const dds = drawdowns(CURRENT_CYCLE);
  const idx = CURRENT_CYCLE.samples.length - 1;
  const drawdown = dds[idx] ?? 0;
  return { feat: featOf(CURRENT_CYCLE, TODAY, drawdown), drawdown };
}

export function similarMoments(limit = 4): SimilarMoment[] {
  const ref = todayFeat().feat;
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
