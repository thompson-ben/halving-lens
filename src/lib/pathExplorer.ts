// Historical Path Explorer engine — replays the ACTUAL forward price path each
// completed halving cycle took from today's equivalent cycle day, rebased to
// 100%. No smoothing, no interpolation, no modelling, no forecasting — just the
// real weekly closes that happened next. Historical evidence, not prediction.
//
// Future-proof by construction: the comparison day is today's day-since-halving,
// so it advances automatically. As the current cycle passes the point where a
// prior cycle had already topped, that cycle is flagged "past peak" instead of
// drawing a misleading continuation.

import { CYCLES, CURRENT_CYCLE, SPOT, TODAY, TODAY_DAY_IN_CYCLE } from "./btcData";
import type { Cycle, CycleSample } from "./data/types";

const WINDOW_DAYS = 365;
export const PATH_MARKERS = [30, 60, 90, 180, 365] as const;

export interface PathPoint {
  day: number; // offset in days from today's equivalent point (0 = today)
  pct: number; // price rebased to 100 at day 0
}

export interface CyclePath {
  cycleId: number;
  short: string;
  label: string; // "2016"
  color: string;
  basePrice: number; // that cycle's price at the equivalent day
  points: PathPoint[]; // real rebased path across the 365-day window
  windowHighPct: number; // highest point reached within the window
  windowHighDay: number; // day-offset of that in-window high
  peakPct: number; // that cycle's eventual peak vs today's equivalent price (%)
  daysToPeak: number; // days from the equivalent point to that cycle's peak (negative ⇒ already past)
  pastPeak: boolean; // the cycle's peak was on/before the equivalent day
  markers: { day: number; pct: number | null }[]; // rebased % at 30/60/90/180/365d
}

export interface DiminishingReturns {
  observed: boolean;
  perCycle: { year: string; totalReturnMult: number }[];
  decayRatios: number[]; // successive ratios (each cycle ÷ the prior)
  note: string;
}

export interface EnvelopePoint {
  day: number; // forward offset
  lo: number; // lowest of the prior cycles at this offset (rebased %)
  mid: number; // median
  hi: number; // highest
}

export interface PathExplorer {
  available: boolean;
  currentPrice: number;
  cycleDay: number;
  windowDays: number;
  leadInDays: number; // how far back the current-cycle lead-in reaches
  current: { points: PathPoint[] }; // the current cycle's real recent path, ending at today (100%)
  paths: CyclePath[];
  envelope: EnvelopePoint[]; // min/median/max band across the prior cycles (real data, n=3)
  divergenceDay: number | null; // offset where the prior paths first spread apart materially
  agreementSpread: number | null; // band width (hi−lo, pp) around the +6-month mark
  stillClimbing: number; // prior cycles not yet past their peak from this point
  diminishing: DiminishingReturns;
  generatedAt: string | null;
}

const LEAD_IN_DAYS = 168; // ~24 weeks of current-cycle context before today

function median(sorted: number[]): number {
  const n = sorted.length;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

function nearestSample(c: Cycle, day: number): CycleSample {
  return c.samples.reduce((best, x) => (Math.abs(x.day - day) < Math.abs(best.day - day) ? x : best));
}

// Rebased % at a target day-offset, from the nearest real sample within tolerance
// (no interpolation — we snap to the closest actual weekly close). Null if the
// cycle's data doesn't reach that far.
function pctAtOffset(c: Cycle, equivDay: number, base: number, offset: number): number | null {
  const targetDay = equivDay + offset;
  const lastDay = c.samples[c.samples.length - 1]?.day ?? 0;
  if (targetDay > lastDay + 15) return null;
  const s = nearestSample(c, targetDay);
  if (Math.abs(s.day - targetDay) > 20 || s.price <= 0) return null;
  return (s.price / base) * 100;
}

export function pathExplorer(): PathExplorer {
  const currentPrice = SPOT?.price ?? TODAY.price;
  const equivDay = TODAY_DAY_IN_CYCLE;
  const priors = CYCLES.filter((c) => c.id !== CURRENT_CYCLE.id);

  const paths: CyclePath[] = [];
  for (const c of priors) {
    const at = nearestSample(c, equivDay);
    if (at.price <= 0) continue;
    const base = at.price;

    // Real weekly path across the window (no smoothing / interpolation).
    const points: PathPoint[] = [];
    for (const s of c.samples) {
      const off = s.day - at.day;
      if (off < 0 || off > WINDOW_DAYS || s.price <= 0) continue;
      points.push({ day: off, pct: (s.price / base) * 100 });
    }
    if (points.length && points[0].day !== 0) points.unshift({ day: 0, pct: 100 });
    let windowHighPct = 100;
    let windowHighDay = 0;
    for (const p of points) if (p.pct > windowHighPct) { windowHighPct = p.pct; windowHighDay = p.day; }

    paths.push({
      cycleId: c.id,
      short: c.short,
      label: c.halvingDate.slice(0, 4),
      color: c.color,
      basePrice: base,
      points,
      windowHighPct,
      windowHighDay,
      peakPct: (c.peakPrice / base) * 100,
      daysToPeak: c.peakDay - at.day,
      pastPeak: c.peakDay <= at.day,
      markers: PATH_MARKERS.map((d) => ({ day: d, pct: pctAtOffset(c, at.day, base, d) })),
    });
  }

  // Current cycle's real recent path, rebased to 100% at today — the bright
  // lead-in that anchors the eye at "you are here".
  const curBase = nearestSample(CURRENT_CYCLE, equivDay).price;
  const curPoints: PathPoint[] = [];
  for (const s of CURRENT_CYCLE.samples) {
    const off = s.day - equivDay;
    if (off < -LEAD_IN_DAYS || off > 0 || s.price <= 0) continue;
    curPoints.push({ day: off, pct: (s.price / curBase) * 100 });
  }
  if (!curPoints.some((p) => p.day === 0)) curPoints.push({ day: 0, pct: 100 });
  curPoints.sort((a, b) => a.day - b.day);

  // Historical envelope — the real min / median / max of the prior cycles at each
  // forward step. Not modelled: just the range the three real paths occupied.
  const envelope: EnvelopePoint[] = [];
  for (let off = 0; off <= WINDOW_DAYS; off += 7) {
    const vals: number[] = [];
    for (const c of priors) {
      const at = nearestSample(c, equivDay);
      if (at.price <= 0) continue;
      const v = pctAtOffset(c, at.day, at.price, off);
      if (v != null) vals.push(v);
    }
    if (vals.length >= 2) {
      const sorted = [...vals].sort((a, b) => a - b);
      envelope.push({ day: off, lo: sorted[0], hi: sorted[sorted.length - 1], mid: median(sorted) });
    }
  }
  const divergenceDay = envelope.find((e) => e.hi - e.lo > 20)?.day ?? null;
  const near180 = envelope.reduce<EnvelopePoint | null>((best, e) => (best == null || Math.abs(e.day - 182) < Math.abs(best.day - 182) ? e : best), null);
  const agreementSpread = near180 ? Math.round(near180.hi - near180.lo) : null;
  const stillClimbing = paths.filter((p) => !p.pastPeak).length;

  // Diminishing returns — measured, not assumed. Total cycle return = each
  // completed cycle's peak price ÷ its halving-day price.
  const completed = priors.filter((c) => c.samples.length > 2 && c.samples[0].price > 0);
  const perCycle = completed
    .map((c) => ({ year: c.halvingDate.slice(0, 4), totalReturnMult: c.peakPrice / c.samples[0].price }))
    .sort((a, b) => Number(a.year) - Number(b.year));
  const decayRatios: number[] = [];
  for (let i = 1; i < perCycle.length; i++) decayRatios.push(perCycle[i].totalReturnMult / perCycle[i - 1].totalReturnMult);
  const monotonic = perCycle.length >= 3 && perCycle.every((c, i) => i === 0 || c.totalReturnMult < perCycle[i - 1].totalReturnMult);
  const observed = monotonic && decayRatios.every((r) => r < 0.9);
  const note = observed
    ? `Each completed cycle's peak return has been markedly smaller than the last (${perCycle.map((c) => `${Math.round(c.totalReturnMult)}×`).join(" → ")}), each roughly ${Math.round((1 - decayRatios.reduce((a, b) => a + b, 0) / decayRatios.length) * 100)}% smaller than the cycle before. A consistent pattern across all three completed cycles — historical observation, not a law.`
    : "Across the completed cycles the peak returns do not show a consistent, reliable trend, so no diminishing-returns conclusion is drawn.";

  return {
    available: paths.length > 0,
    currentPrice,
    cycleDay: equivDay,
    windowDays: WINDOW_DAYS,
    leadInDays: LEAD_IN_DAYS,
    current: { points: curPoints },
    paths,
    envelope,
    divergenceDay,
    agreementSpread,
    stillClimbing,
    diminishing: { observed, perCycle, decayRatios, note },
    generatedAt: SPOT ? new Date(SPOT.ts).toISOString() : null,
  };
}
