// Market Movers — the pure statistics half (PR-SB1). No data imports, so
// every function here is drivable by fixtures covering ordinary moves, rare
// moves, short histories, flat weeks and missing data.
//
// Methodology (documented deliberately — it is the whole basis of every
// rarity claim the platform will make):
//   · A metric's movement over N calendar days is measured against the last
//     observation on or before (anchor − N). Series may be daily, weekly or
//     trading-day; the calendar anchor makes them comparable.
//   · The historical distribution is every equivalent-period movement
//     available in the metric's own honest window, computed at every
//     observation as anchor. Windows OVERLAP (a 7-day distribution on a
//     daily series steps one day at a time); this is standard and stated —
//     overlapping samples are autocorrelated, so the percentile is a
//     descriptive rank, never a probability.
//   · Rarity is the percentile of the ABSOLUTE movement: "how big was this
//     move for this metric, regardless of direction". Direction is carried
//     separately and never folded into significance.

import type { MoverPeriod } from "./types";

export interface Point {
  date: string;
  value: number;
}

const DAY = 86_400_000;
export const dayNum = (iso: string): number => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY);

/** Last point on or before `iso`, or null. Assumes ascending order. */
export function valueOn(series: readonly Point[], iso: string): Point | null {
  let lo = 0;
  let hi = series.length - 1;
  let best: Point | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].date <= iso) {
      best = series[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best;
}

/** Median spacing of a series, in days — its effective cadence. */
export function cadenceDays(series: readonly Point[]): number {
  if (series.length < 2) return 1;
  const gaps: number[] = [];
  for (let i = 1; i < series.length; i++) gaps.push(dayNum(series[i].date) - dayNum(series[i - 1].date));
  gaps.sort((a, b) => a - b);
  return Math.max(1, gaps[Math.floor(gaps.length / 2)]);
}

/** A period is only supported when the series resolves finer than it. */
export function periodSupported(series: readonly Point[], period: MoverPeriod): boolean {
  return period >= cadenceDays(series);
}

const isoAt = (n: number): string => new Date(n * DAY).toISOString().slice(0, 10);

/** Signed movement of a LEVEL series over `period` days, ending at `anchor`.
 *  `pct` expresses it as a percentage of the earlier level (only valid for
 *  strictly-positive series); otherwise it is a raw difference in points. */
export function levelMove(
  series: readonly Point[],
  anchor: string,
  period: MoverPeriod,
  pct: boolean,
): { movement: number; current: number; previous: number } | null {
  const now = valueOn(series, anchor);
  const then = valueOn(series, isoAt(dayNum(anchor) - period));
  if (!now || !then || !Number.isFinite(now.value) || !Number.isFinite(then.value)) return null;
  if (then.date === now.date) return null; // no earlier observation to compare against
  if (pct && then.value <= 0) return null; // a percentage off a non-positive base is meaningless
  const movement = pct ? (now.value / then.value - 1) * 100 : now.value - then.value;
  return { movement, current: now.value, previous: then.value };
}

/** Net FLOW across (anchor − period, anchor]. */
export function flowSum(series: readonly Point[], anchor: string, period: MoverPeriod): number | null {
  const from = dayNum(anchor) - period;
  const to = dayNum(anchor);
  let sum = 0;
  let n = 0;
  for (const p of series) {
    const d = dayNum(p.date);
    if (d > from && d <= to && Number.isFinite(p.value)) {
      sum += p.value;
      n++;
    }
  }
  return n > 0 ? sum : null;
}

/** Every equivalent-period movement available in the series' own window.
 *  One entry per observation that has a valid comparison point. */
export function historicalMoves(
  series: readonly Point[],
  period: MoverPeriod,
  kind: "level" | "flow",
  pct: boolean,
): number[] {
  const out: number[] = [];
  if (kind === "flow") {
    // Anchor on each observation; require the full period to be inside the
    // observed window so early partial windows never look like small flows.
    const firstDay = series.length ? dayNum(series[0].date) : 0;
    for (const p of series) {
      if (dayNum(p.date) - period < firstDay) continue;
      const v = flowSum(series, p.date, period);
      if (v != null) out.push(v);
    }
    return out;
  }
  for (const p of series) {
    const m = levelMove(series, p.date, period, pct);
    if (m) out.push(m.movement);
  }
  return out;
}

/** Percentile (0–100) of |x| within |moves| — the share of historical moves
 *  this one is at least as large as. Null when the sample is empty. */
export function absPercentile(moves: readonly number[], x: number): number | null {
  if (moves.length === 0) return null;
  const target = Math.abs(x);
  let atOrBelow = 0;
  for (const m of moves) if (Math.abs(m) <= target) atOrBelow++;
  return Math.round((atOrBelow / moves.length) * 100);
}

/** Minimum equivalent-period observations before ANY rarity claim is made.
 *  Below this the caller must print an honest unavailable state. */
export const RARITY_MIN_OBSERVATIONS = 100;

/** A categorical crossing is by construction at least as notable as a
 *  top-quintile move, so it raises significance to this floor — a floor,
 *  never an addition, so it can never reorder two larger moves. */
export const CROSSING_SIGNIFICANCE_FLOOR = 80;

/** Movements at or above this significance are treated as material; below
 *  it a metric is reported as steady. */
export const MATERIAL_SIGNIFICANCE = 60;

/** The boundary bandFor draws for "exceptional" — named so consumers that
 *  must expose the number (e.g. Metric Watch evidence objects) reference
 *  THIS definition rather than minting a second threshold authority. */
export const EXCEPTIONAL_SIGNIFICANCE = 95;

export function bandFor(significance: number): "routine" | "notable" | "unusual" | "exceptional" {
  if (significance >= EXCEPTIONAL_SIGNIFICANCE) return "exceptional";
  if (significance >= 80) return "unusual";
  if (significance >= 50) return "notable";
  return "routine";
}
