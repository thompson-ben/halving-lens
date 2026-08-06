// Reference-gap trajectories (Four Reference Prices enhancement, PR-FRP1).
//
// The Four Reference Prices read the market AGAINST references; a reference's
// own movement is only mechanics. This module owns the relationship: where
// the market sits relative to each reference (the gap), how that gap moved
// over a period (the trajectory — the real story), and how unusual that
// shift is within the gap's OWN history (the same significance framework
// that grounds the Market Snapshot).
//
// Honesty rules, in order:
//   · No interpolation anywhere — valueOn is an at-or-before step lookup.
//   · A period must be supported by the reference series' own cadence.
//   · mining_cost never shows a 24-hour comparison, whatever its cadence
//     maths says: the daily model output is noisy (median |1d| move 7.6%),
//     and a 24-hour figure would present model noise as signal. Encoded
//     explicitly so the omission survives the day the series' median
//     cadence turns daily.
//   · Rarity is only claimed above the shared observation floor; below it
//     the state says "maturing", never a percentile.
//   · The phrasing never attributes cause — either side of a gap may move.
//
// Deliberately presentation-free: no React, no markup. The Four Reference
// Prices page and State of Bitcoin Act 2 are renderers of this one engine.
//
// Historical context. Not forecasts.

import { metricById } from "./marketMovers/registry";
import {
  valueOn,
  dayNum,
  cadenceDays,
  periodSupported,
  historicalMoves,
  absPercentile,
  bandFor,
  RARITY_MIN_OBSERVATIONS,
  type Point,
} from "./marketMovers/distribution";
import type { MoverPeriod } from "./marketMovers/types";
import { ordinal } from "./format";

export const REFERENCE_IDS = ["ma200", "realized_price", "mining_cost"] as const;
export type ReferenceId = (typeof REFERENCE_IDS)[number];

export const GAP_PERIODS: MoverPeriod[] = [1, 7, 30];

/** Below this many percentage points, a gap reads as "level" and a shift
 *  reads as "held" — stability is a finding, not a blank. */
export const LEVEL_PP = 0.5;

/** Periods a reference may NEVER show, whatever its cadence maths says.
 *  The reason string is user-facing: members get the why, not the plumbing. */
const EXCLUDED_PERIODS: Partial<Record<ReferenceId, Partial<Record<number, string>>>> = {
  mining_cost: {
    1: "24-hour comparisons are intentionally omitted — the daily model output is too noisy to compare honestly.",
  },
};

export type GapRarityState = "available" | "maturing" | "unavailable";

export interface GapReading {
  referenceId: ReferenceId;
  label: string;
  nature: "observed" | "derived" | "estimated" | "synthetic";
  period: MoverPeriod;
  available: true;
  /** The date both sides are honestly measured to — min of the two series'
   *  last observations; carried so a lagging series is disclosed, never
   *  silently stretched. */
  asOf: string;
  /** Market relative to the reference, in signed percent. Positive = market
   *  above the reference. */
  gapNow: number;
  gapThen: number;
  /** gapNow − gapThen, in percentage points. */
  changePp: number;
  /** The trajectory passed zero — the relationship flipped sides. */
  crossed: boolean;
  rarityState: GapRarityState;
  /** Percentile of |changePp| within the gap's own equivalent-period
   *  history; null unless rarityState is "available". */
  rarityPercentile: number | null;
  observations: number;
  firstObserved: string;
}

export interface GapUnavailable {
  referenceId: ReferenceId;
  label: string;
  period: MoverPeriod;
  available: false;
  /** User-facing sentence: why this comparison is not shown. */
  reason: string;
}

export type GapResult = GapReading | GapUnavailable;

// ── the gap series ──────────────────────────────────────────────────────────

/** The gap, sampled at every REFERENCE observation (the coarser side); the
 *  market side is the complete daily archive, so every reference date has a
 *  same-day market close. */
export function gapSeries(market: readonly Point[], ref: readonly Point[]): Point[] {
  const out: Point[] = [];
  for (const p of ref) {
    if (!Number.isFinite(p.value) || p.value <= 0) continue;
    const m = valueOn(market, p.date);
    if (!m || m.date !== p.date || !Number.isFinite(m.value) || m.value <= 0) continue;
    out.push({ date: p.date, value: (m.value / p.value - 1) * 100 });
  }
  return out;
}

// ── one reading, fixture-drivable ───────────────────────────────────────────

export function gapReadingFrom(
  market: readonly Point[],
  ref: readonly Point[],
  period: MoverPeriod,
  meta: { referenceId: ReferenceId; label: string; nature: GapReading["nature"] },
  globalAnchor?: string,
): GapResult {
  const un = (reason: string): GapUnavailable => ({ referenceId: meta.referenceId, label: meta.label, period, available: false, reason });

  const excluded = EXCLUDED_PERIODS[meta.referenceId]?.[period];
  if (excluded) return un(excluded);
  if (market.length < 2 || ref.length < 2) return un("Not enough observations to compare.");
  if (!periodSupported(ref, period)) {
    return un(`${meta.label} resolves every ${cadenceDays(ref)} days — a ${period}-day comparison is not observable.`);
  }

  const series = gapSeries(market, ref);
  if (series.length < 2) return un("The two series share no observation dates.");

  const last = series[series.length - 1].date;
  const anchor = globalAnchor && globalAnchor < last ? globalAnchor : last;
  const now = valueOn(series, anchor);
  const then = valueOn(series, new Date((dayNum(anchor) - period) * 86_400_000).toISOString().slice(0, 10));
  if (!now || !then || then.date === now.date) return un("No earlier observation to compare against.");

  const changePp = now.value - then.value;
  const moves = historicalMoves(series, period, "level", false);
  const observations = moves.length;
  const rarityState: GapRarityState = observations >= RARITY_MIN_OBSERVATIONS ? "available" : observations > 0 ? "maturing" : "unavailable";
  const rarityPercentile = rarityState === "available" ? absPercentile(moves, Math.abs(changePp)) : null;

  return {
    referenceId: meta.referenceId,
    label: meta.label,
    nature: meta.nature,
    period,
    available: true,
    asOf: now.date,
    gapNow: now.value,
    gapThen: then.value,
    changePp,
    crossed: now.value >= 0 !== then.value >= 0,
    rarityState,
    rarityPercentile,
    observations,
    firstObserved: series[0].date,
  };
}

// ── registry-bound entry point ──────────────────────────────────────────────

let cache: Map<string, GapResult> | null = null;

/** The gap trajectory for one reference over one period, on live data. */
export function referenceGap(id: ReferenceId, period: MoverPeriod): GapResult {
  cache ??= new Map();
  const key = `${id}:${period}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const market = metricById("price")!.series();
  const m = metricById(id)!;
  const out = gapReadingFrom(market, m.series(), period, { referenceId: id, label: m.label, nature: m.nature });
  cache.set(key, out);
  return out;
}

/** All references × all periods, exclusions and gates applied. */
export function allReferenceGaps(): GapResult[] {
  return REFERENCE_IDS.flatMap((id) => GAP_PERIODS.map((p) => referenceGap(id, p)));
}

// ── describe: the shared phrasing both renderers quote ──────────────────────

const monthLabel = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

const periodLabel = (period: MoverPeriod): string => (period === 1 ? "24 hours" : `${period} days`);

/** The market relative to a reference, as a phrase: "9% above" · "level".
 *  Positive gap = market above the reference. The subject (Market Price) is
 *  supplied by the renderer, so the phrase never flips perspective. */
export function gapPhrase(pp: number): string {
  if (Math.abs(pp) < LEVEL_PP) return "level";
  return `${Math.abs(pp).toFixed(0)}% ${pp >= 0 ? "above" : "below"}`;
}

/** One sentence for the trajectory — the enhancement's headline fact. An
 *  unchanged gap says "held", plainly. Never attributes cause. */
export function gapTrajectoryLine(g: GapReading): string {
  const span = `over the last ${periodLabel(g.period)}`;
  if (Math.abs(g.changePp) < LEVEL_PP) {
    return Math.abs(g.gapNow) < LEVEL_PP ? `Held level ${span}.` : `Held at ${gapPhrase(g.gapNow)} ${span}.`;
  }
  return `${gapPhrase(g.gapThen)} → ${gapPhrase(g.gapNow)} ${span}.`;
}

export interface GapRarity {
  /** The narrative — what the percentile MEANS, so the reader never has to
   *  interpret a number: "One of the largest…", "Larger than 71%…", or
   *  "An ordinary shift within its own history." */
  line: string;
  /** The supporting evidence beneath it; null when the line IS the evidence. */
  evidence: string | null;
}

/** Adaptive rarity narrative, tiered on the SAME band cut-offs as the Market
 *  Snapshot (bandFor: exceptional ≥95, notable ≥50) so the gap language and
 *  the movers language can never disagree about what "rare" means. */
export function gapRarity(g: GapReading): GapRarity | null {
  const span = g.period === 1 ? "24-hour" : `${g.period}-day`;
  const obs = `${g.observations.toLocaleString("en-US")} observations since ${monthLabel(g.firstObserved)}`;

  if (g.rarityState === "available" && g.rarityPercentile != null) {
    const band = bandFor(g.rarityPercentile);
    if (band === "exceptional") {
      return {
        line: `One of the largest ${span} gap shifts on record.`,
        evidence: `Larger than ${g.rarityPercentile}% of its own ${span} record · ${obs}`,
      };
    }
    if (band === "unusual" || band === "notable") {
      return {
        line: `Larger than ${g.rarityPercentile}% of its own ${span} record.`,
        evidence: obs,
      };
    }
    return {
      line: "An ordinary shift within its own history.",
      evidence: `${ordinal(g.rarityPercentile)} percentile · ${obs}`,
    };
  }
  if (g.rarityState === "maturing") {
    return { line: `Historical comparison still maturing · ${g.observations} equivalent observations`, evidence: null };
  }
  return null;
}
