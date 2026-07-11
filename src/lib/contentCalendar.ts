// The social content editorial calendar — the "what do we publish today?" plan
// for the content-pack studio. Distinct from editorial.ts (which rotates the
// Daily Brief's hero narrative): this maps each weekday to a content pack so the
// publishing schedule is varied and never repeats the same type two days running.
//
// Deterministic from the date. Two packs are event-driven rather than scheduled —
// ETF Flow (when flows become materially interesting) and Accumulation Index
// (only on a historically significant reading) — surfaced via the trigger checks
// below so the operator knows when to publish them off-calendar.

import { briefDate } from "./briefArchive";
import { etfStats, ETF } from "./etf";
import { accumulationRead } from "./accumulation";
import { fmtUsd } from "./format";
import type { PackId } from "./contentCards";

export interface CalendarSlot {
  key: string;
  label: string;
  packId?: PackId; // present ⇒ generatable directly in the studio
  note: string;
}

// Indexed by UTC day of week (0 = Sunday) so it lines up with getUTCDay().
// Matches the requested cadence: Mon Research · Tue Daily Brief · Wed Similar ·
// Thu Cycle Comparison · Fri Market Health · Sat Metric Deep Dive · Sun Weekly.
export const WEEKLY_PLAN: CalendarSlot[] = [
  { key: "weekly", label: "Weekly Report", note: "This week's HalvingLens Weekly Research." }, // 0 Sun
  { key: "research", label: "Research Findings", note: "A finding from the research library." }, // 1 Mon
  { key: "daily", label: "Daily Brief", packId: "daily", note: "Today's cycle read." }, // 2 Tue
  { key: "similar", label: "Similar Moments", packId: "similar", note: "What this moment rhymes with." }, // 3 Wed
  { key: "historical", label: "Cycle Comparison", packId: "historical", note: "Today vs previous cycles." }, // 4 Thu
  { key: "market_health", label: "Market Health", packId: "market_health", note: "How healthy is the market today?" }, // 5 Fri
  { key: "metric", label: "Metric Deep Dive", packId: "metric", note: "One metric, explained." }, // 6 Sat
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function todaysPlan(): { day: string; slot: CalendarSlot } {
  const d = briefDate().getUTCDay();
  return { day: DAY_NAMES[d], slot: WEEKLY_PLAN[d] };
}

function signed(n: number): string {
  return `${n >= 0 ? "+" : "-"}${fmtUsd(Math.abs(n), { compact: true })}`;
}

export interface TriggerCheck {
  flagged: boolean;
  reason: string;
}

// ETF Flow — publish when flows become materially interesting: today lands in
// the top ~15% of daily flows by size, or the trailing week is large (> $2B net).
export function etfIsInteresting(): TriggerCheck {
  const e = etfStats();
  if (!ETF.connected || !e.latest) return { flagged: false, reason: "ETF feed not connected." };
  const todayFlow = e.latest.netFlow;
  const abs = ETF.points.map((p) => Math.abs(p.netFlow)).sort((a, b) => a - b);
  const pctile = abs.length ? Math.round((abs.filter((v) => v <= Math.abs(todayFlow)).length / abs.length) * 100) : 0;
  const bigWeek = Math.abs(e.trailingWeek) > 2e9;
  if (pctile >= 85) return { flagged: true, reason: `Today's ${signed(todayFlow)} is in the ${pctile}th percentile of daily flows.` };
  if (bigWeek) return { flagged: true, reason: `${signed(e.trailingWeek)} over the last 7 days.` };
  return { flagged: false, reason: "Flows are within the normal range." };
}

// Accumulation Index — publish only on a historically significant reading (a
// score sitting in the rare ends of its own historical distribution).
export function accumulationIsInteresting(): TriggerCheck {
  const r = accumulationRead();
  if (r.historicalPercentile <= 15 || r.historicalPercentile >= 85) {
    return {
      flagged: true,
      reason: `Reads ${r.score}/100 (${r.band.label}) — a historically ${r.historicalPercentile <= 15 ? "rare, attractive" : "stretched"} reading.`,
    };
  }
  return { flagged: false, reason: `Reads ${r.score}/100 — no historically significant change.` };
}
