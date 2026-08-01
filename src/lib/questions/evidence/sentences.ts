// EngineSentences — complete sentences whose wording depends on engine state.
// Every formatter here is a PURE function over a small read shape, so CI can
// drive it through every state (including stale/unavailable) with fixtures.
// The controlled vocabulary below is founder-approved (PR-Q1 commission §2a);
// no other wording can render. Building the reads from the live engines
// happens in ./index.ts — this module never touches data.

import { proseDate } from "./atoms";

// One shared naming vocabulary for the three references the market price is
// measured against (the Four Reference Prices framework: market price + these
// three). Pages must not coin alternative labels ad hoc.
export const REFERENCE_PROSE = {
  trend: "the 200-day trend",
  holders: "the average holder's cost basis",
  miners: "the estimated mining cost",
} as const;
export type ReferenceKey = keyof typeof REFERENCE_PROSE;

const list = (xs: string[]): string =>
  xs.length <= 1 ? (xs[0] ?? "") : xs.length === 2 ? `${xs[0]} and ${xs[1]}` : `${xs.slice(0, -1).join(", ")}, and ${xs[xs.length - 1]}`;

const usd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;

// ── es:frp.position ──────────────────────────────────────────────────────────

export interface FrpRead {
  available: boolean;
  /** ISO date of the reading. */
  dataDate: string | null;
  aboveTrend: boolean | null;
  aboveHolders: boolean | null;
  aboveMiners: boolean | null;
}

export function frpPositionSentence(r: FrpRead): string {
  if (!r.available || r.dataDate == null || r.aboveTrend == null) {
    return "Live reference-price data is temporarily unavailable; the most recent reliable reading appears in Today's Data below.";
  }
  const asOf = `As of ${proseDate(r.dataDate)}`;
  const flags: Array<[ReferenceKey, boolean | null]> = [
    ["trend", r.aboveTrend],
    ["holders", r.aboveHolders],
    ["miners", r.aboveMiners],
  ];
  const observed = flags.filter(([, v]) => v != null) as Array<[ReferenceKey, boolean]>;
  const missing = flags.filter(([, v]) => v == null).map(([k]) => REFERENCE_PROSE[k]);
  const above = observed.filter(([, v]) => v).map(([k]) => REFERENCE_PROSE[k]);
  const below = observed.filter(([, v]) => !v).map(([k]) => REFERENCE_PROSE[k]);
  const suffix = missing.length ? ` (${list(missing)} series is not observable for this period)` : "";

  if (observed.length === 3 && below.length === 0) {
    return `${asOf}, Bitcoin's market price sits above all three of the reference prices it is measured against — the 200-day trend, the average holder's cost basis, and the estimated mining cost.`;
  }
  if (observed.length === 3 && above.length === 0) {
    return `${asOf}, Bitcoin's market price sits below all three of the reference prices it is measured against — the 200-day trend, the average holder's cost basis, and the estimated mining cost.`;
  }
  if (below.length === 0) return `${asOf}, Bitcoin's market price sits above ${list(above)}${suffix}.`;
  if (above.length === 0) return `${asOf}, Bitcoin's market price sits below ${list(below)}${suffix}.`;
  return `${asOf}, Bitcoin's market price sits above ${list(above)} but below ${list(below)}${suffix}.`;
}

// ── es:frp.spell ─────────────────────────────────────────────────────────────

export interface SpellRead {
  available: boolean;
  /** Consecutive weeks (ending now) in today's configuration. */
  spellWeeks: number | null;
  /** Share of the weekly record spent in configurations like today's. */
  matchingPct: number | null;
  /** Size of that weekly record. */
  recordWeeks: number | null;
}

export function frpSpellSentence(r: SpellRead): string {
  if (!r.available) return ""; // approved empty resolution (commission §2a)
  if (r.spellWeeks == null || r.matchingPct == null || r.recordWeeks == null) {
    return "Today's configuration is too recent to have a meaningful historical sample yet.";
  }
  const s = r.spellWeeks === 1 ? "week" : "weeks";
  return `Price has held today's configuration for ${r.spellWeeks} consecutive ${s}; configurations like today's account for ${r.matchingPct}% of the ${r.recordWeeks.toLocaleString("en-US")}-week record.`;
}

// ── es:accumulation.read ─────────────────────────────────────────────────────
// The engine's own sentence (accumulationRead().reasoning) is reused verbatim —
// no second formatter exists for the index's language.

export interface AccumRead {
  available: boolean;
  reasoning: string | null;
}

export function accumulationSentence(r: AccumRead): string {
  if (!r.available || !r.reasoning) {
    return "The live Accumulation Index reading appears in Today's Data below.";
  }
  return r.reasoning;
}

// ── es:peak.status ───────────────────────────────────────────────────────────

export interface PeakRead {
  available: boolean;
  latest: { date: string; close: number } | null;
  peak: { date: string; close: number } | null;
}

export function peakStatusSentence(r: PeakRead): string {
  if (!r.available || !r.latest || !r.peak) {
    return "Live price data is temporarily unavailable; the most recent reliable close appears in Today's Data below.";
  }
  const { latest, peak } = r;
  if (latest.close >= peak.close) {
    return `The latest close, ${usd(latest.close)} on ${proseDate(latest.date)}, is the highest of the current cycle so far.`;
  }
  const gapPct = (1 - latest.close / peak.close) * 100;
  if (gapPct < 1) {
    return `The latest close, ${usd(latest.close)} on ${proseDate(latest.date)}, sits within 1% of the current cycle's highest close (${usd(peak.close)}, set ${proseDate(peak.date)}).`;
  }
  return `The current cycle's highest close so far is ${usd(peak.close)}, set on ${proseDate(peak.date)}; the latest close (${usd(latest.close)}, ${proseDate(latest.date)}) sits ${Math.round(gapPct)}% below it.`;
}

// ── es:ath.recency ───────────────────────────────────────────────────────────

export interface AthRead {
  available: boolean;
  lastAthDate: string | null;
  daysAgo: number | null;
}

export function athRecencySentence(r: AthRead): string {
  if (!r.available || r.lastAthDate == null || r.daysAgo == null) return ""; // approved empty resolution
  const ago = r.daysAgo === 0 ? "today" : r.daysAgo === 1 ? "1 day ago" : `${r.daysAgo.toLocaleString("en-US")} days ago`;
  return `Bitcoin last set a new all-time high on ${proseDate(r.lastAthDate)}, ${ago}.`;
}
