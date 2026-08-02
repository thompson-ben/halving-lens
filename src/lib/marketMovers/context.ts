// Market Movers — Broader context (SoB 2.0).
//
// One restrained, factual line whose ONLY job is to stop an unusually large
// short-term move being read out of context. It never influences ranking or
// significance, never carries direction or emphasis, and never becomes a
// second headline: the canonical movement stays the 7-day figure.
//
// The engine picks the most appropriate context for the metric rather than
// forcing a fixed "30-day change" on everything. Rules are evaluated in a
// fixed order and the FIRST that applies wins, so output is deterministic:
//
//   1 flow metrics        → the direction of the longer-window net total
//   2 banded metrics      → how long the published band has persisted
//   3 counter-move        → the safety rule: when the longer window moved
//                           the OTHER way, say where the level still sits
//                           ("Still 16% below 2 Jul.")
//   4 window extreme      → currently the highest/lowest of the window
//   5 inside the range    → the calm default
//   otherwise             → unavailable, stated honestly, never invented
//
// Historical context. Not forecasts.

import type { MovementUnit } from "./types";
import { dayNum, valueOn, type Point } from "./distribution";

export interface BroaderContext {
  /** The rendered line, e.g. "Still 16% below 2 Jul." */
  text: string;
  /** Which rule produced it — for tests and debugging, never displayed. */
  rule: "flow-window" | "band-streak" | "counter-move" | "window-extreme" | "off-extreme" | "in-range";
  /** The window, in days, the context is drawn from. */
  windowDays: number;
}

/** The longer window every context rule reads from. */
export const CONTEXT_WINDOW_DAYS = 30;

/** Material thresholds below which a counter-move is not worth stating. */
const MIN_COUNTER_PCT = 5;
const MIN_COUNTER_POINTS = 1;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso: string): string => `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const isoAt = (n: number): string => new Date(n * 86_400_000).toISOString().slice(0, 10);

/** "1 point" / "3 points" — never the "1 points" a naive template produces. */
const plural = (v: number, decimals: number): string => {
  const s = roundish(v, decimals);
  return `${s} ${Number(s) === 1 ? "point" : "points"}`;
};

const roundish = (v: number, decimals: number): string => {
  const abs = Math.abs(v);
  const d = abs >= 100 ? 0 : decimals;
  return abs.toFixed(d);
};

export interface ContextInput {
  series: readonly Point[];
  anchor: string;
  unit: MovementUnit;
  kind: "level" | "flow";
  decimals: number;
  /** Canonical 7-day movement — used only to detect a counter-move. */
  movement: number;
  /** Band label at a value, when the metric publishes a vocabulary. */
  bandLabel?: (v: number) => string;
}

/** Net total of a flow series across the trailing window. */
function windowFlow(series: readonly Point[], anchor: string, days: number): number | null {
  const from = dayNum(anchor) - days;
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

/** Consecutive whole weeks the published band has been unchanged, counting
 *  back from the anchor. Capped so the claim never outruns the window. */
function bandStreakWeeks(series: readonly Point[], anchor: string, bandLabel: (v: number) => string, maxWeeks = 12): number {
  const now = valueOn(series, anchor);
  if (!now) return 0;
  const current = bandLabel(now.value);
  let weeks = 0;
  for (let w = 1; w <= maxWeeks; w++) {
    const past = valueOn(series, isoAt(dayNum(anchor) - w * 7));
    if (!past || bandLabel(past.value) !== current) break;
    weeks = w;
  }
  return weeks;
}

export function broaderContext(input: ContextInput): BroaderContext | null {
  const { series, anchor, unit, kind, decimals, movement, bandLabel } = input;
  if (series.length < 2) return null;
  const days = CONTEXT_WINDOW_DAYS;
  const now = valueOn(series, anchor);
  if (!now) return null;

  // 1 · Flow metrics — the direction of the longer-window net total.
  if (kind === "flow") {
    const net = windowFlow(series, anchor, days);
    if (net == null) return null;
    const first = series[0].date;
    if (dayNum(anchor) - days < dayNum(first)) return null; // window predates the record
    const word = net > 0 ? "remain positive" : net < 0 ? "remain negative" : "are balanced";
    return { text: `Monthly net flows ${word}.`, rule: "flow-window", windowDays: days };
  }

  const then = valueOn(series, isoAt(dayNum(anchor) - days));
  if (!then || then.date === now.date) return null; // no comparison exists — say nothing

  // 2 · Banded metrics — how long the published band has persisted.
  if (bandLabel) {
    const weeks = bandStreakWeeks(series, anchor, bandLabel);
    if (weeks >= 2) {
      return {
        text: `Has remained in ${bandLabel(now.value)} for ${weeks} consecutive weeks.`,
        rule: "band-streak",
        windowDays: weeks * 7,
      };
    }
  }

  // 3 · Counter-move — the safety rule this field exists for.
  const longMove = unit === "pct" ? (then.value > 0 ? (now.value / then.value - 1) * 100 : NaN) : now.value - then.value;
  const minimum = unit === "pct" ? MIN_COUNTER_PCT : MIN_COUNTER_POINTS;
  if (
    Number.isFinite(longMove) &&
    Math.abs(longMove) >= minimum &&
    movement !== 0 &&
    Math.sign(longMove) !== Math.sign(movement)
  ) {
    const side = longMove < 0 ? "below" : "above";
    const size = unit === "pct" ? `${roundish(longMove, 0)}%` : plural(longMove, decimals);
    return { text: `Still ${size} ${side} ${shortDate(then.date)}.`, rule: "counter-move", windowDays: days };
  }

  // 4 · Window extreme — factual, and useful precisely when it is true.
  const inWindow = series.filter((p) => dayNum(p.date) >= dayNum(anchor) - days && dayNum(p.date) <= dayNum(anchor));
  if (inWindow.length >= 3) {
    const max = Math.max(...inWindow.map((p) => p.value));
    const min = Math.min(...inWindow.map((p) => p.value));
    if (now.value >= max) return { text: `Now at its highest in ${days} days.`, rule: "window-extreme", windowDays: days };
    if (now.value <= min) return { text: `Now at its lowest in ${days} days.`, rule: "window-extreme", windowDays: days };

    // 5 · Distance from the extreme the weekly move ran TOWARDS — the
    //     counterweight for a big rise that is still short of the window's
    //     high (or a big fall still above its low). This is the general
    //     form of the safety rule when the longer window agrees in sign.
    const towards = movement > 0 ? max : min;
    const gapPct = towards > 0 ? Math.abs(now.value / towards - 1) * 100 : NaN;
    const gapPts = Math.abs(now.value - towards);
    const gapEnough = unit === "pct" ? Number.isFinite(gapPct) && gapPct >= 3 : gapPts >= MIN_COUNTER_POINTS;
    if (movement !== 0 && gapEnough) {
      const size = unit === "pct" ? `${roundish(gapPct, 0)}%` : plural(gapPts, decimals);
      const side = movement > 0 ? `below its ${days}-day high` : `above its ${days}-day low`;
      return { text: `Still ${size} ${side}.`, rule: "off-extreme", windowDays: days };
    }
  }

  // 6 · Inside the range — the calm default.
  return { text: `Still within its ${days}-day range.`, rule: "in-range", windowDays: days };
}
