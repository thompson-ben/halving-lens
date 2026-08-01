// Seasonality core — the pure, CLIENT-SAFE half of the engine (PR-C).
// Everything here is data-free: no snapshot, no archive, no fetches — only
// ./data/types for the HALVINGS constant and the OnchainPoint shape. The
// server engine (seasonality.ts) re-exports this module, so PR-B callers and
// tests are unchanged; the interactive explorer imports THIS module directly
// and recomputes statistics, insights and current-month context client-side
// from precomputed cells without dragging data modules into the bundle.

import { HALVINGS } from "./data/types";
import type { OnchainPoint } from "./data/types";

export type SeriesKey = "market" | "trend" | "holders" | "miners";
/** Valuation mode compares the market against a reference — comparing the
 *  market with itself is meaningless, so the type simply excludes it. */
export type ValuationSeries = Exclude<SeriesKey, "market">;
export type Mode = "returns" | "valuation";
export type WindowFilter =
  | "all"
  | "current-cycle"
  | "previous-cycles"
  | "above-trend"
  | "below-trend"
  | "post-halving"
  | "election"
  | "midterm";

export const SERIES_META: Record<SeriesKey, { label: string; nature: "observed" | "derived" | "estimated" }> = {
  market: { label: "Market Price", nature: "observed" },
  trend: { label: "200-Day Average", nature: "derived" },
  holders: { label: "Realised Price", nature: "observed" },
  miners: { label: "Est. Mining Cost", nature: "estimated" },
};

/** Month-level claims (stats table renders any n; INSIGHTS need this floor). */
export const MIN_INSIGHT_N = 8;

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Mode-specific user language for the share-above-zero statistic — the
 *  neutral engine field is never shown raw (founder clarification). */
export function shareLabel(mode: Mode, series: SeriesKey): string {
  if (mode === "valuation") return "Months above reference";
  return series === "market" ? "Positive months" : "Months higher";
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface MonthCell {
  year: number;
  month: number; // 1–12
  value: number | null; // return % or avg gap %, per mode
  partial: boolean; // the running month (month-to-date)
  nature: "observed" | "derived" | "estimated" | null; // null = no data
}

export interface MonthStat {
  month: number;
  label: string;
  avg: number;
  median: number;
  positivePct: number; // share of observations > 0 — UI phrases via shareLabel
  best: { year: number; value: number };
  worst: { year: number; value: number };
  dispersion: number; // stdev — presented to users as "Typical variation"
  n: number;
}

export interface CurrentMonthContext {
  month: number;
  label: string;
  mtdPct: number | null;
  stat: MonthStat | null;
  rank: { position: number; of: number } | null;
  similarYears: number[];
  sentence: string | null;
}

export interface Insight {
  text: string;
  n: number;
  window: string;
  estimated: boolean;
}

// ── Filter membership (pure set logic) ───────────────────────────────────────

export interface FilterContext {
  electionYears: Set<number>;
  midtermYears: Set<number>; // US midterm years: 2010 + 4k
  postHalvingYears: Set<number>;
  currentCycleFrom: string; // ISO day of the latest past halving
  aboveTrendMonths: Set<string>; // "YYYY-MM" where month-end close > MA200
}

/** Serializable twin of FilterContext for the server→client boundary. */
export interface SerialFilterContext {
  electionYears: number[];
  midtermYears: number[];
  postHalvingYears: number[];
  currentCycleFrom: string;
  aboveTrendMonths: string[];
}

export function serializeCtx(ctx: FilterContext): SerialFilterContext {
  return {
    electionYears: [...ctx.electionYears].sort(),
    midtermYears: [...ctx.midtermYears].sort(),
    postHalvingYears: [...ctx.postHalvingYears].sort(),
    currentCycleFrom: ctx.currentCycleFrom,
    aboveTrendMonths: [...ctx.aboveTrendMonths].sort(),
  };
}

export function deserializeCtx(s: SerialFilterContext): FilterContext {
  return {
    electionYears: new Set(s.electionYears),
    midtermYears: new Set(s.midtermYears),
    postHalvingYears: new Set(s.postHalvingYears),
    currentCycleFrom: s.currentCycleFrom,
    aboveTrendMonths: new Set(s.aboveTrendMonths),
  };
}

/** Whether a (year, month) belongs to the filter. Year-scoped filters admit
 *  whole years; trend filters admit individual months. */
export function inFilter(year: number, month: number, filter: WindowFilter, ctx: FilterContext): boolean {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  switch (filter) {
    case "all":
      return true;
    case "election":
      return ctx.electionYears.has(year);
    case "midterm":
      return ctx.midtermYears.has(year);
    case "post-halving":
      return ctx.postHalvingYears.has(year);
    case "current-cycle":
      return key >= ctx.currentCycleFrom.slice(0, 7);
    case "previous-cycles":
      return key < ctx.currentCycleFrom.slice(0, 7);
    case "above-trend":
      return ctx.aboveTrendMonths.has(key);
    case "below-trend":
      return !ctx.aboveTrendMonths.has(key);
  }
}

// ── Series primitives that need no committed data ───────────────────────────

/** 200-day simple moving average, emitted only once fully warmed up. */
export function ma200From(closes: readonly OnchainPoint[]): OnchainPoint[] {
  const out: OnchainPoint[] = [];
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i].value;
    if (i >= 200) sum -= closes[i - 200].value;
    if (i >= 199) out.push({ date: closes[i].date, value: Math.round((sum / 200) * 100) / 100 });
  }
  return out;
}

/** Mean gap % of market vs reference over the days present in BOTH series
 *  within (year, month). Null when no overlapping days — never interpolated. */
export function avgGapPctInMonth(
  closes: readonly OnchainPoint[],
  ref: readonly OnchainPoint[],
  year: number,
  month: number,
): number | null {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const refByDate = new Map<string, number>();
  for (const p of ref) if (p.date.startsWith(prefix) && p.value > 0) refByDate.set(p.date, p.value);
  let sum = 0;
  let n = 0;
  for (const p of closes) {
    const r = p.date.startsWith(prefix) ? refByDate.get(p.date) : undefined;
    if (r != null) {
      sum += p.value / r - 1;
      n++;
    }
  }
  return n > 0 ? Math.round((sum / n) * 1000) / 10 : null;
}

/** The latest past halving date on or before `todayIso`. */
export function latestHalvingOnOrBefore(todayIso: string): string {
  const past = Object.values(HALVINGS).filter((d) => d <= todayIso);
  return past[past.length - 1];
}

/** Calendar years of every halving on or before `todayIso` (real dates). */
export function pastHalvingYears(todayIso: string): number[] {
  return Object.values(HALVINGS)
    .filter((d) => d <= todayIso)
    .map((d) => Number(d.slice(0, 4)));
}

/** The honest empty current-month context (no data for the series). */
export function buildEmptyCurrent(curMonth: number): CurrentMonthContext {
  return { month: curMonth, label: MONTHS[curMonth - 1], mtdPct: null, stat: null, rank: null, similarYears: [], sentence: null };
}

// ── Statistics ──────────────────────────────────────────────────────────────

export function monthStatsFrom(values: { year: number; value: number }[], month: number): MonthStat | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a.value - b.value);
  const n = sorted.length;
  const avg = sorted.reduce((s, v) => s + v.value, 0) / n;
  const median = n % 2 === 1 ? sorted[(n - 1) / 2].value : (sorted[n / 2 - 1].value + sorted[n / 2].value) / 2;
  const dispersion = Math.sqrt(sorted.reduce((s, v) => s + (v.value - avg) ** 2, 0) / n);
  return {
    month,
    label: MONTHS[month - 1],
    avg: round1(avg),
    median: round1(median),
    positivePct: round1((sorted.filter((v) => v.value > 0).length / n) * 100),
    best: { year: sorted[n - 1].year, value: sorted[n - 1].value },
    worst: { year: sorted[0].year, value: sorted[0].value },
    dispersion: round1(dispersion),
    n,
  };
}

/** Per-calendar-month statistics over COMPLETE, filter-member cells. */
export function statsFromCells(cells: readonly MonthCell[], filter: WindowFilter, ctx: FilterContext): MonthStat[] {
  const stats: MonthStat[] = [];
  for (let m = 1; m <= 12; m++) {
    const vals = cells
      .filter((c) => c.month === m && c.value != null && !c.partial && inFilter(c.year, m, filter, ctx))
      .map((c) => ({ year: c.year, value: c.value as number }));
    const s = monthStatsFrom(vals, m);
    if (s) stats.push(s);
  }
  return stats;
}

/** Current month vs its own full record (always unfiltered). `closeLine` is
 *  the standing close, injected so this module stays data-free. */
export function currentContextFrom(
  cells: readonly MonthCell[],
  curYear: number,
  curMonth: number,
  closeLine: string,
): CurrentMonthContext {
  const mtd = cells.find((c) => c.year === curYear && c.month === curMonth)?.value ?? null;
  const completed = cells
    .filter((c) => c.month === curMonth && c.value != null && !c.partial)
    .map((c) => ({ year: c.year, value: c.value as number }));
  const stat = monthStatsFrom(completed, curMonth);
  let rank: CurrentMonthContext["rank"] = null;
  let similarYears: number[] = [];
  let sentence: string | null = null;
  if (mtd != null && stat) {
    rank = { position: 1 + completed.filter((c) => c.value > mtd).length, of: completed.length + 1 };
    similarYears = [...completed]
      .sort((a, b) => Math.abs(a.value - mtd) - Math.abs(b.value - mtd))
      .slice(0, 3)
      .map((c) => c.year);
    const inRange = mtd >= stat.worst.value && mtd <= stat.best.value;
    const vsAvg = mtd > stat.avg ? "above" : mtd < stat.avg ? "below" : "in line with";
    sentence = `So far this ${MONTHS[curMonth - 1]} is running ${vsAvg} its historical average (${mtd > 0 ? "+" : ""}${mtd}% vs ${stat.avg > 0 ? "+" : ""}${stat.avg}% across ${stat.n} observed years), ${inRange ? "inside" : "outside"} the observed range. ${closeLine}`;
  }
  return { month: curMonth, label: MONTHS[curMonth - 1], mtdPct: mtd, stat, rank, similarYears, sentence };
}

// ── Deterministic insights ───────────────────────────────────────────────────

/** Claims are generated only from months clearing MIN_INSIGHT_N, ties are
 *  named honestly, and every claim carries its sample and window. */
export function insightsFrom(stats: MonthStat[], windowLabel: string, estimated: boolean): Insight[] {
  const eligible = stats.filter((s) => s.n >= MIN_INSIGHT_N);
  if (eligible.length === 0) return [];
  const out: Insight[] = [];
  const tieList = (list: MonthStat[]) => list.map((s) => s.label).join(" and ");

  const maxAvg = Math.max(...eligible.map((s) => s.avg));
  const strongest = eligible.filter((s) => s.avg === maxAvg);
  out.push({
    text: `${tieList(strongest)} has the highest average monthly change in the record (${maxAvg > 0 ? "+" : ""}${maxAvg}%, n=${strongest[0].n}).`,
    n: strongest[0].n,
    window: windowLabel,
    estimated,
  });

  const minAvg = Math.min(...eligible.map((s) => s.avg));
  const weakest = eligible.filter((s) => s.avg === minAvg);
  out.push({
    text: `${tieList(weakest)} has the lowest average monthly change in the record (${minAvg > 0 ? "+" : ""}${minAvg}%, n=${weakest[0].n}).`,
    n: weakest[0].n,
    window: windowLabel,
    estimated,
  });

  const maxPos = Math.max(...eligible.map((s) => s.positivePct));
  const steadiest = eligible.filter((s) => s.positivePct === maxPos);
  out.push({
    text: `${tieList(steadiest)} closed higher most often: ${maxPos}% of ${steadiest[0].n} observed years.`,
    n: steadiest[0].n,
    window: windowLabel,
    estimated,
  });

  const maxDisp = Math.max(...eligible.map((s) => s.dispersion));
  const wildest = eligible.filter((s) => s.dispersion === maxDisp);
  out.push({
    text: `${tieList(wildest)} shows the widest typical variation (±${maxDisp} points around its average, n=${wildest[0].n}).`,
    n: wildest[0].n,
    window: windowLabel,
    estimated,
  });

  return out;
}
