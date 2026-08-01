// Bitcoin Seasonality — the server engine (PR-B, restructured in PR-C).
// The pure, data-free half now lives in seasonalityCore.ts (client-safe and
// re-exported here so PR-B callers and tests are unchanged); this module owns
// everything that touches committed data: series wiring, cell generation and
// the full assembly. Same honest observed windows as the rest of the platform:
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
import type { OnchainPoint } from "./data/types";
import { STANDING_CLOSE } from "./fourReferencePrices";
import {
  avgGapPctInMonth,
  buildEmptyCurrent,
  currentContextFrom,
  insightsFrom,
  latestHalvingOnOrBefore,
  pastHalvingYears,
  ma200From,
  SERIES_META,
  statsFromCells,
  type CurrentMonthContext,
  type FilterContext,
  type Insight,
  type Mode,
  type MonthCell,
  type MonthStat,
  type SeriesKey,
  type WindowFilter,
} from "./seasonalityCore";

export * from "./seasonalityCore";

// ── Generic series primitives over committed data ───────────────────────────

/** Last available observation inside (year, month) — any series, any cadence. */
export function lastInMonth(series: readonly OnchainPoint[], year: number, month: number): OnchainPoint | null {
  const c = lastCloseOfMonth(year, month, series);
  return c ? { date: c.date, value: c.close } : null;
}

/** Month-over-month change % of any series (PR-A methodology, generalised). */
export function monthlyChangeOf(series: readonly OnchainPoint[], year: number, month: number): number | null {
  return monthlyReturnPct(year, month, series);
}

// ── Filter context (needs the closes series) ─────────────────────────────────

export function buildFilterContext(closes: readonly OnchainPoint[], todayIso: string): FilterContext {
  const electionYears = new Set<number>();
  for (let y = 2012; y <= Number(todayIso.slice(0, 4)); y += 4) electionYears.add(y);
  // US midterm years — the off-cycle national elections: 2010, 2014, 2018, …
  const midtermYears = new Set<number>();
  for (let y = 2010; y <= Number(todayIso.slice(0, 4)); y += 4) midtermYears.add(y);

  const currentCycleFrom = latestHalvingOnOrBefore(todayIso);
  const postHalvingYears = new Set(pastHalvingYears(todayIso).map((y) => y + 1));

  const sortedCloses = [...closes].sort((a, b) => (a.date < b.date ? -1 : 1));
  const ma = ma200From(sortedCloses);
  const aboveTrendMonths = new Set<string>();
  const seen = new Set<string>();
  for (const p of closes) seen.add(p.date.slice(0, 7));
  for (const key of seen) {
    const [y, m] = [Number(key.slice(0, 4)), Number(key.slice(5, 7))];
    const close = lastInMonth(sortedCloses, y, m);
    const trend = lastInMonth(ma, y, m);
    if (close && trend && close.value > trend.value) aboveTrendMonths.add(key);
  }
  return { electionYears, midtermYears, postHalvingYears, currentCycleFrom, aboveTrendMonths };
}

// ── Assembly ─────────────────────────────────────────────────────────────────

export interface SeasonalityData {
  mode: Mode;
  series: SeriesKey;
  filter: WindowFilter;
  seriesLabel: string;
  seriesNature: "observed" | "derived" | "estimated";
  windowFrom: string | null;
  cells: MonthCell[];
  stats: MonthStat[];
  current: CurrentMonthContext;
  insights: Insight[];
  generatedFor: string;
}

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

export function seriesFor(key: SeriesKey, src: SeasonalitySources): readonly OnchainPoint[] {
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

/** The full cell grid for one (mode, series) — first observed year → current
 *  year. Filters never change the grid; the record is always the record. */
export function cellsFor(
  mode: Mode,
  series: SeriesKey,
  src: SeasonalitySources,
  todayIso: string,
): { windowFrom: string | null; cells: MonthCell[] } {
  const meta = SERIES_META[series];
  const active = seriesFor(series, src);
  if (active.length === 0 || (mode === "valuation" && series === "market")) {
    return { windowFrom: null, cells: [] };
  }
  const sorted = [...active].sort((a, b) => (a.date < b.date ? -1 : 1));
  const windowFrom = sorted[0].date;
  const firstYear = Number(windowFrom.slice(0, 4));
  const curYear = Number(todayIso.slice(0, 4));
  const curMonth = Number(todayIso.slice(5, 7));
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
  return { windowFrom, cells };
}

export function seasonalityData(
  opts: { mode: Mode; series: SeriesKey; filter: WindowFilter },
  todayIso: string,
  src: SeasonalitySources = defaultSources(),
): SeasonalityData {
  const { mode, series, filter } = opts;
  const meta = SERIES_META[series];
  const curYear = Number(todayIso.slice(0, 4));
  const curMonth = Number(todayIso.slice(5, 7));
  const { windowFrom, cells } = cellsFor(mode, series, src, todayIso);
  if (windowFrom == null) {
    return {
      mode, series, filter,
      seriesLabel: meta.label, seriesNature: meta.nature,
      windowFrom: null, cells: [], stats: [],
      current: buildEmptyCurrent(curMonth),
      insights: [], generatedFor: todayIso,
    };
  }
  const ctx = buildFilterContext(src.closes, todayIso);
  const stats = statsFromCells(cells, filter, ctx);
  const windowLabel = `observed ${windowFrom.slice(0, 4)}–${curYear}${filter === "all" ? "" : ` · filter: ${filter}`}`;
  return {
    mode, series, filter,
    seriesLabel: meta.label, seriesNature: meta.nature,
    windowFrom, cells, stats,
    current: currentContextFrom(cells, curYear, curMonth, STANDING_CLOSE),
    insights: insightsFrom(stats, windowLabel, meta.nature === "estimated"),
    generatedFor: todayIso,
  };
}
