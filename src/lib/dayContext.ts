// Daily context for the State of Bitcoin (PR128). The seven-day comparison is
// always primary; this adds the SECONDARY 24-hour read so a big weekly move can
// be told apart from a calm week that moved yesterday. Pure lookups over the
// shared metric-change service (period 1 = latest day, period 7 = week) — no new
// calculations, and it degrades silently when a 1-day change isn't available.

import { metricChange, type MetricChange, type PeriodChange } from "./metricChange";

export function changeOver(m: MetricChange, period: 1 | 7): PeriodChange | undefined {
  return m.changes.find((c) => c.period === period && c.available);
}

// One short, deterministic sentence relating today's move to the week's — only
// when it materially aids understanding (i.e. the week actually moved). Returns
// null otherwise, so we never add filler commentary.
export function dailyVsWeeklyPrice(): string | null {
  const p = metricChange("price");
  const c7 = changeOver(p, 7);
  const c1 = changeOver(p, 1);
  if (!c7 || c7.pctChange == null || Math.abs(c7.pctChange) < 1) return null; // weekly move not material
  if (!c1 || c1.pctChange == null) return null;

  const w = c7.pctChange;
  const d = c1.pctChange;
  const rose = w >= 0;
  const noun = rose ? "gain" : "decline";

  // Today reversed against the week.
  if (Math.sign(d) !== Math.sign(w) && Math.abs(d) >= 0.3) {
    return `Today's move only partially reversed the week's ${noun}.`;
  }
  // Most of the week's move happened in the last 24 hours.
  const share = Math.abs(w) > 0 ? Math.abs(d) / Math.abs(w) : 0;
  if (Math.sign(d) === Math.sign(w) && share >= 0.6) {
    return `Most of this week's ${noun} occurred in the last 24 hours.`;
  }
  // Steady through the week rather than a single day.
  if (Math.abs(d) < 0.3) {
    return `Bitcoin ${rose ? "rose" : "fell"} steadily through the week rather than in a single day.`;
  }
  return `The weekly trend stayed ${rose ? "positive" : "negative"} through today's move.`;
}
