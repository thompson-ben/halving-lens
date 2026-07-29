// The one shared period + comparison substrate.
//
// Replaces the ~5 ad-hoc WoW/delta helpers scattered across the business stack
// with a single deterministic, no-future-leak comparison. Direction semantics
// are explicit per call (goodUp) so "lost visitors down" reads as an improvement
// while "WEAS up" also does.

import type { Period, Trend } from "./types";

const DAY = 86_400_000;
export const DEFAULT_TZ = "Europe/London";

// The reporting week: [now-7d, now). Deterministic from `now`.
export function weekPeriod(now: number, tz: string = DEFAULT_TZ): Period {
  return trailingPeriod(7, now, tz);
}

// A trailing window of any length: [now-days, now). Deterministic from `now`.
// weekPeriod is the days=7 case; the Founder Intelligence dashboard uses 30
// (default) and 90.
export function trailingPeriod(days: number, now: number, tz: string = DEFAULT_TZ): Period {
  return { start: new Date(now - days * DAY).toISOString(), end: new Date(now).toISOString(), label: `Last ${days} days`, timezone: tz, days };
}

// The immediately-prior comparable window, same length.
export function priorPeriod(p: Period): Period {
  const start = Date.parse(p.start);
  const end = Date.parse(p.end);
  const span = end - start;
  return { start: new Date(start - span).toISOString(), end: new Date(start).toISOString(), label: `Previous ${p.days} days`, timezone: p.timezone, days: p.days };
}

export function inWindow(ts: number, p: Period): boolean {
  return ts >= Date.parse(p.start) && ts < Date.parse(p.end);
}

export interface Comparison {
  current: number | null;
  previous: number | null;
  absChange: number | null;
  pctChange: number | null;
  trend: Trend; // raw direction of the value (up/down/flat), NOT good/bad
}

// Compare two period values. `eps` is the flat threshold in the value's own unit.
export function compare(current: number | null, previous: number | null, eps = 0): Comparison {
  if (current == null || previous == null) {
    return { current, previous, absChange: null, pctChange: null, trend: "unknown" };
  }
  const abs = current - previous;
  const pct = previous !== 0 ? Math.round((abs / Math.abs(previous)) * 1000) / 10 : null;
  const trend: Trend = Math.abs(abs) <= eps ? "flat" : abs > 0 ? "up" : "down";
  return { current, previous, absChange: Math.round(abs * 100) / 100, pctChange: pct, trend };
}

// Whether a raw trend is GOOD given the metric's polarity (e.g. unsubscribes:
// goodUp=false). Returns "good" | "bad" | "flat" | "unknown".
export function goodness(trend: Trend, goodUp: boolean): "good" | "bad" | "flat" | "unknown" {
  if (trend === "flat") return "flat";
  if (trend === "unknown") return "unknown";
  return (trend === "up") === goodUp ? "good" : "bad";
}
