// Cycle-Aligned Seasonality — the pure, data-free core (PR-V2A).
//
// Months are ANCHORED at each halving date: month k of a cycle is
// [halving + k calendar months, halving + (k+1) calendar months), with
// day-of-month arithmetic clamped to month length (2012-11-28 + 3 months →
// 2013-02-28). Month-k return = last available daily UTC close STRICTLY
// BEFORE the month-(k+1) boundary vs the last close strictly before the
// month-k boundary; month 0's baseline is the halving-day close itself.
// A month cut short — by the next halving (a completed cycle's stub) or by
// today (the current cycle's running month) — is PARTIAL: rendered, never
// fed to agreement facts.
//
// FRAMING (founder-approved discovery): with three completed cycles this is
// cycle COMPARISON, never seasonality statistics. The only generated
// cross-cycle claims are agreement facts — months where every completed
// cycle moved strictly the same way — and classification uses the UNROUNDED
// value with display-zero treated as neutral (a value that would render as
// 0.0% can never ground an "all rose" claim). Historical cycle comparison,
// not an expected path and not a forecast.

import type { OnchainPoint } from "./data/types";
import { round1 } from "./seasonalityCore";

const DIM = (y: number, m: number): number =>
  [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

/** Anchored month arithmetic: same day-of-month, clamped to month length. */
export function addMonthsClamped(iso: string, k: number): string {
  const y0 = Number(iso.slice(0, 4));
  const m0 = Number(iso.slice(5, 7));
  const d0 = Number(iso.slice(8, 10));
  const y = y0 + Math.floor((m0 - 1 + k) / 12);
  const m = ((m0 - 1 + k) % 12 + 12) % 12 + 1;
  const d = Math.min(d0, DIM(y, m));
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Month k's boundaries for a cycle anchored at `anchor` — [from, to). */
export function monthBoundaries(anchor: string, k: number): { from: string; to: string } {
  return { from: addMonthsClamped(anchor, k), to: addMonthsClamped(anchor, k + 1) };
}

/** Last observation with date < isoExclusive (series sorted ascending). */
export function lastBefore(series: readonly OnchainPoint[], isoExclusive: string): OnchainPoint | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].date < isoExclusive) return series[i];
  }
  return null;
}

/** Last observation with date <= iso. */
export function lastOnOrBefore(series: readonly OnchainPoint[], iso: string): OnchainPoint | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].date <= iso) return series[i];
  }
  return null;
}

export interface CycleMonthCell {
  cycleId: number;
  month: number; // 0-based months since halving
  /** Rounded for presentation (0.1pt). */
  value: number | null;
  /** Unrounded — classification only, never rendered. */
  raw: number | null;
  partial: boolean;
  from: string;
  /** Exclusive end actually used (clipped by cycle end / today). */
  to: string;
}

/** Month-k return of a cycle. `endExclusive` clips the month (next halving
 *  for completed cycles; the day after the last close for the current one).
 *  Returns null when the month has no baseline or no observation. */
export function cycleMonthReturn(
  closes: readonly OnchainPoint[],
  anchor: string,
  k: number,
  endExclusive: string,
  cycleId: number,
): CycleMonthCell | null {
  const { from, to } = monthBoundaries(anchor, k);
  if (from >= endExclusive) return null; // month never started — no cell
  const clippedTo = to < endExclusive ? to : endExclusive;
  const partial = to > endExclusive;
  const base = k === 0 ? lastOnOrBefore(closes, anchor) : lastBefore(closes, from);
  const end = lastBefore(closes, clippedTo);
  if (!base || !end || end.date < from || base.value <= 0) return null;
  const raw = (end.value / base.value - 1) * 100;
  return { cycleId, month: k, value: round1(raw), raw, partial, from, to: clippedTo };
}

/** Average daily gap (%) of market vs a reference over [from, to), counted
 *  only over days present in BOTH series — the calendar engine's valuation
 *  semantics on anchored boundaries. */
export function cycleMonthGap(
  closes: readonly OnchainPoint[],
  reference: readonly OnchainPoint[],
  anchor: string,
  k: number,
  endExclusive: string,
  cycleId: number,
): CycleMonthCell | null {
  const { from, to } = monthBoundaries(anchor, k);
  if (from >= endExclusive) return null;
  const clippedTo = to < endExclusive ? to : endExclusive;
  const partial = to > endExclusive;
  const ref = new Map<string, number>();
  for (const p of reference) {
    if (p.date >= from && p.date < clippedTo && p.value > 0) ref.set(p.date, p.value);
  }
  let sum = 0;
  let n = 0;
  for (const p of closes) {
    if (p.date < from || p.date >= clippedTo) continue;
    const r = ref.get(p.date);
    if (r == null) continue;
    sum += (p.value / r - 1) * 100;
    n++;
  }
  if (n === 0) return null;
  const raw = sum / n;
  return { cycleId, month: k, value: round1(raw), raw, partial, from, to: clippedTo };
}

/** Strict sign that survives rounding: a raw zero OR a value that would
 *  display as 0.0% is NEUTRAL — it can never ground an agreement claim. */
export function signClass(raw: number): "+" | "-" | "0" {
  if (round1(raw) === 0) return "0";
  return raw > 0 ? "+" : "-";
}

export interface AgreementFact {
  month: number;
  direction: "rose" | "fell";
  values: Array<{ cycleId: number; label: string; value: number }>;
  /** Always the completed-cycle count — the language is "all N completed
   *  cycles", never "all historical cycles". */
  n: number;
  text: string;
}

const fmtV = (v: number): string => `${v > 0 ? "+" : ""}${v}%`;

/** The ONLY generated cross-cycle claims. A fact exists for a month only
 *  when EVERY completed cycle has a COMPLETE observation there and all of
 *  them moved strictly the same way (unrounded sign, display-zero neutral).
 *  Months observed by fewer than all completed cycles produce nothing,
 *  even if the available observations agree. */
export function agreementFactsFrom(
  cellsByCycle: ReadonlyMap<number, readonly CycleMonthCell[]>,
  completed: ReadonlyArray<{ id: number; label: string }>,
): AgreementFact[] {
  if (completed.length === 0) return [];
  const out: AgreementFact[] = [];
  const maxMonth = Math.max(0, ...[...cellsByCycle.values()].flat().map((c) => c.month));
  for (let m = 0; m <= maxMonth; m++) {
    const obs = completed.map(({ id, label }) => {
      const cell = cellsByCycle.get(id)?.find((c) => c.month === m);
      return cell && !cell.partial && cell.raw != null ? { id, label, cell } : null;
    });
    if (obs.some((o) => o == null)) continue; // every completed cycle, or no claim
    const signs = obs.map((o) => signClass(o!.cell.raw!));
    if (signs.some((s) => s === "0")) continue;
    if (!signs.every((s) => s === signs[0])) continue;
    const direction = signs[0] === "+" ? "rose" : "fell";
    const values = obs.map((o) => ({ cycleId: o!.id, label: o!.label, value: o!.cell.value! }));
    const list = values.map((v, i) => (i === 0 ? `${fmtV(v.value)} in the ${v.label}` : `${fmtV(v.value)} in ${v.label.replace(" cycle", "")}`)).join(", ");
    out.push({
      month: m,
      direction,
      values,
      n: completed.length,
      text: `In all ${completed.length} completed cycles, month ${m} ${direction} (${list}).`,
    });
  }
  return out;
}

/** Highest month index carrying ANY observation — the grid horizon comes
 *  from the observed record (today: 47, via the 2020 cycle's partial month
 *  47), never from the projected next halving. */
export function maxObservedMonth(cellsByCycle: ReadonlyMap<number, readonly CycleMonthCell[]>): number {
  let max = 0;
  for (const cells of cellsByCycle.values()) {
    for (const c of cells) if (c.value != null && c.month > max) max = c.month;
  }
  return max;
}
