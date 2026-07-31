// Bitcoin Seasonality — the pure engine (PR-B). UI-free and deterministic:
// every function takes explicit inputs (fixture-injectable) and the assembly
// reads only committed data modules. Consumes the PR-A archive primitives and
// the same honest observed windows as the rest of the platform:
//   market   daily closes from the permanent archive (2010-07-18 →)
//   trend    200-day average, derived from those closes (needs the warm-up)
//   holders  Realised Price, observed daily (2022-07-26 → , the PR140 floor)
//   miners   Est. Mining Cost, modelled (2016-01-04 →) — labelled estimated
//
// Month methodology (founder-specified, PR-A): a month's value uses the LAST
// AVAILABLE observation inside that UTC month; a month without observations
// is null — never interpolated. The running month is month-to-date, flagged
// partial, and excluded from historical statistics.

import { isCompleteMonth, lastCloseOfMonth, monthlyReturnPct } from "./data/priceArchive";
import { PRICE_ARCHIVE } from "./data/priceArchiveData";
import { SNAPSHOT } from "./data/snapshot";
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
  | "election";

export const SERIES_META: Record<SeriesKey, { label: string; nature: "observed" | "derived" | "estimated" }> = {
  market: { label: "Market Price", nature: "observed" },
  trend: { label: "200-Day Average", nature: "derived" },
  holders: { label: "Realised Price", nature: "observed" },
  miners: { label: "Est. Mining Cost", nature: "estimated" },
};

/** Month-level claims (stats table renders any n; INSIGHTS need this floor). */
export const MIN_INSIGHT_N = 8;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// ── Generic series primitives (any {date, value} series) ────────────────────

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

/** Last available observation inside (year, month) — any series, any cadence. */
export function lastInMonth(series: readonly OnchainPoint[], year: number, month: number): OnchainPoint | null {
  const c = lastCloseOfMonth(year, month, series);
  return c ? { date: c.date, value: c.close } : null;
}

/** Month-over-month change % of any series (PR-A methodology, generalised). */
export function monthlyChangeOf(series: readonly OnchainPoint[], year: number, month: number): number | null {
  return monthlyReturnPct(year, month, series);
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

// ── Filter membership (pure set logic) ───────────────────────────────────────

export interface FilterContext {
  electionYears: Set<number>; // fixed US presidential cycle
  postHalvingYears: Set<number>; // calendar year following each halving
  currentCycleFrom: string; // ISO day of the latest past halving
  aboveTrendMonths: Set<string>; // "YYYY-MM" where month-end close > MA200
}

export function buildFilterContext(closes: readonly OnchainPoint[], todayIso: string): FilterContext {
  const electionYears = new Set<number>();
  for (let y = 2012; y <= Number(todayIso.slice(0, 4)); y += 4) electionYears.add(y);

  const halvingDates = Object.values(HALVINGS).filter((d) => d <= todayIso);
  const postHalvingYears = new Set(halvingDates.map((d) => Number(d.slice(0, 4)) + 1));
  const currentCycleFrom = halvingDates[halvingDates.length - 1];

  const ma = ma200From([...closes].sort((a, b) => (a.date < b.date ? -1 : 1)));
  const aboveTrendMonths = new Set<string>();
  const seen = new Set<string>();
  for (const p of closes) seen.add(p.date.slice(0, 7));
  for (const key of seen) {
    const [y, m] = [Number(key.slice(0, 4)), Number(key.slice(5, 7))];
    const close = lastInMonth(closes, y, m);
    const trend = lastInMonth(ma, y, m);
    if (close && trend && close.value > trend.value) aboveTrendMonths.add(key);
  }
  return { electionYears, postHalvingYears, currentCycleFrom, aboveTrendMonths };
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

// ── Cells, stats, context ────────────────────────────────────────────────────

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
  positivePct: number; // share of observations > 0 — UI phrases per mode
  best: { year: number; value: number };
  worst: { year: number; value: number };
  dispersion: number; // stdev — presented to users as "Typical variation"
  n: number;
}

export interface CurrentMonthContext {
  month: number;
  label: string;
  mtdPct: number | null; // exact, from daily closes vs previous month end
  stat: MonthStat | null; // this month's historical stats (complete months)
  rank: { position: number; of: number } | null; // MTD among completed + itself
  similarYears: number[]; // closest completed observations by |value − MTD|
  sentence: string | null; // deterministic template
}

export interface Insight {
  text: string;
  n: number;
  window: string; // e.g. "observed 2011–2025"
  estimated: boolean;
}

export interface SeasonalityData {
  mode: Mode;
  series: SeriesKey;
  filter: WindowFilter;
  seriesLabel: string;
  seriesNature: "observed" | "derived" | "estimated";
  windowFrom: string | null; // first observed day of the active series
  cells: MonthCell[]; // complete grid, first observation year → current year
  stats: MonthStat[]; // per calendar month, filtered, complete months only
  current: CurrentMonthContext;
  insights: Insight[];
  generatedFor: string; // ISO day the engine evaluated as "today"
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

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

// ── Assembly ─────────────────────────────────────────────────────────────────

export interface SeasonalitySources {
  closes: readonly OnchainPoint[]; // market daily closes (the archive)
  holders: readonly OnchainPoint[];
  miners: readonly OnchainPoint[];
}

export function defaultSources(): SeasonalitySources {
  return {
    closes: PRICE_ARCHIVE,
    holders: SNAPSHOT.onchain?.series?.realizedPrice ?? [],
    miners: SNAPSHOT.productionCost?.points ?? [],
  };
}

function seriesFor(key: SeriesKey, src: SeasonalitySources): readonly OnchainPoint[] {
  switch (key) {
    case "market":
      return src.closes;
    case "trend":
      return ma200From([...src.closes].sort((a, b) => (a.date < b.date ? -1 : 1)));
    case "holders":
      return src.holders;
    case "miners":
      return src.miners;
  }
}

export function seasonalityData(
  opts: { mode: Mode; series: SeriesKey; filter: WindowFilter },
  todayIso: string,
  src: SeasonalitySources = defaultSources(),
): SeasonalityData {
  const { mode, filter } = opts;
  // Valuation vs the market itself is meaningless — the engine coerces
  // nothing silently; it reports the market series as invalid for this mode
  // by producing an empty dataset the UI explains (type-safe callers use
  // ValuationSeries and never hit this).
  const series = opts.series;
  const meta = SERIES_META[series];
  const active = seriesFor(series, src);
  const empty: SeasonalityData = {
    mode, series, filter,
    seriesLabel: meta.label, seriesNature: meta.nature,
    windowFrom: null, cells: [], stats: [],
    current: { month: Number(todayIso.slice(5, 7)), label: MONTHS[Number(todayIso.slice(5, 7)) - 1], mtdPct: null, stat: null, rank: null, similarYears: [], sentence: null },
    insights: [], generatedFor: todayIso,
  };
  if (active.length === 0 || (mode === "valuation" && series === "market")) return empty;

  const sorted = [...active].sort((a, b) => (a.date < b.date ? -1 : 1));
  const windowFrom = sorted[0].date;
  const firstYear = Number(windowFrom.slice(0, 4));
  const curYear = Number(todayIso.slice(0, 4));
  const curMonth = Number(todayIso.slice(5, 7));
  const ctx = buildFilterContext(src.closes, todayIso);

  // The full grid — filters affect STATS and INSIGHTS, never the grid itself
  // (the heatmap dims non-member cells; the record is always the record).
  const cells: MonthCell[] = [];
  for (let y = firstYear; y <= curYear; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === curYear && m > curMonth) {
        cells.push({ year: y, month: m, value: null, partial: false, nature: null });
        continue;
      }
      const value = mode === "returns" ? monthlyChangeOf(sorted, y, m) : avgGapPctInMonth(src.closes, sorted, y, m);
      const partial = !isCompleteMonth(y, m, todayIso) && value != null;
      cells.push({ year: y, month: m, value, partial, nature: value != null ? meta.nature : null });
    }
  }

  // Per-month statistics over COMPLETE, filter-member months only.
  const stats: MonthStat[] = [];
  for (let m = 1; m <= 12; m++) {
    const vals = cells
      .filter((c) => c.month === m && c.value != null && !c.partial && inFilter(c.year, m, filter, ctx))
      .map((c) => ({ year: c.year, value: c.value as number }));
    const s = monthStatsFrom(vals, m);
    if (s) stats.push(s);
  }

  // Current month in historical context (always unfiltered: today vs the
  // month's own full record).
  const mtdCell = cells.find((c) => c.year === curYear && c.month === curMonth);
  const mtd = mtdCell?.value ?? null;
  const completed = cells
    .filter((c) => c.month === curMonth && c.value != null && !c.partial)
    .map((c) => ({ year: c.year, value: c.value as number }));
  const curStat = monthStatsFrom(completed, curMonth);
  let rank: CurrentMonthContext["rank"] = null;
  let similarYears: number[] = [];
  let sentence: string | null = null;
  if (mtd != null && curStat) {
    rank = { position: 1 + completed.filter((c) => c.value > mtd).length, of: completed.length + 1 };
    similarYears = [...completed]
      .sort((a, b) => Math.abs(a.value - mtd) - Math.abs(b.value - mtd))
      .slice(0, 3)
      .map((c) => c.year);
    const inRange = mtd >= curStat.worst.value && mtd <= curStat.best.value;
    const vsAvg = mtd > curStat.avg ? "above" : mtd < curStat.avg ? "below" : "in line with";
    sentence = `So far this ${MONTHS[curMonth - 1]} is running ${vsAvg} its historical average (${mtd > 0 ? "+" : ""}${mtd}% vs ${curStat.avg > 0 ? "+" : ""}${curStat.avg}% across ${curStat.n} observed years), ${inRange ? "inside" : "outside"} the observed range. Historical context, not a prediction.`;
  }

  const windowLabel = `observed ${windowFrom.slice(0, 4)}–${curYear}${filter === "all" ? "" : ` · filter: ${filter}`}`;

  return {
    mode, series, filter,
    seriesLabel: meta.label, seriesNature: meta.nature,
    windowFrom, cells, stats,
    current: { month: curMonth, label: MONTHS[curMonth - 1], mtdPct: mtd, stat: curStat, rank, similarYears, sentence },
    insights: insightsFrom(stats, windowLabel, meta.nature === "estimated"),
    generatedFor: todayIso,
  };
}
