// Seasonality explorer payload (PR-C). One server-side precomputation feeds
// the whole interactive page: compact cell grids for every (mode, series)
// combination, the serializable filter context, per-month tooltip detail in
// the framework's own language, and honest window metadata. The client
// recomputes statistics / insights / current-month context from these cells
// with the SAME pure core functions — no data modules in the bundle, no
// duplicated maths, no API round-trips.

import { PRICE_ARCHIVE } from "./data/priceArchiveData";
import { HALVINGS } from "./data/types";
import { configurationName, STANDING_CLOSE, weeklyConfigurationTable } from "./fourReferencePrices";
import { buildFilterContext, cellsFor, defaultSources } from "./seasonality";
import {
  latestHalvingOnOrBefore,
  serializeCtx,
  SERIES_META,
  type Mode,
  type SerialFilterContext,
  type SeriesKey,
} from "./seasonalityCore";

/** [year, month, value, partial 0|1] — nulls are omitted and reconstructed
 *  client-side from the grid bounds. */
export type CompactCell = [number, number, number, 0 | 1];

export interface GridPayload {
  windowFrom: string | null;
  firstYear: number | null;
  cells: CompactCell[];
}

export interface MonthDetail {
  config: string | null; // configuration phrase at the month's last week
  vsTrendPct: number | null;
  vsHoldersPct: number | null;
  vsMinersPct: number | null;
  cycle: { n: number; day: number } | null; // cycle number + day-in-cycle at month end
}

export interface SeasonalityPayload {
  todayIso: string;
  curYear: number;
  curMonth: number;
  standingClose: string;
  ctx: SerialFilterContext;
  grids: Partial<Record<`${Mode}:${SeriesKey}`, GridPayload>>;
  detail: Record<string, MonthDetail>; // keyed "YYYY-MM"
  series: typeof SERIES_META;
}

const MS_DAY = 86_400_000;

export function buildSeasonalityPayload(todayIso?: string): SeasonalityPayload {
  const today = todayIso ?? (PRICE_ARCHIVE.length ? PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1].date : new Date().toISOString().slice(0, 10));
  const src = defaultSources();
  const curYear = Number(today.slice(0, 4));
  const curMonth = Number(today.slice(5, 7));

  const grids: SeasonalityPayload["grids"] = {};
  const combos: Array<[Mode, SeriesKey]> = [
    ["returns", "market"], ["returns", "trend"], ["returns", "holders"], ["returns", "miners"],
    ["valuation", "trend"], ["valuation", "holders"], ["valuation", "miners"],
  ];
  for (const [mode, series] of combos) {
    const { windowFrom, cells } = cellsFor(mode, series, src, today);
    grids[`${mode}:${series}`] = {
      windowFrom,
      firstYear: windowFrom ? Number(windowFrom.slice(0, 4)) : null,
      cells: cells
        .filter((c) => c.value != null)
        .map((c) => [c.year, c.month, c.value as number, c.partial ? 1 : 0] as CompactCell),
    };
  }

  // Tooltip detail per month, spoken in the framework's language: the last
  // weekly configuration row on or before each month's end supplies the
  // configuration phrase and the reference gaps — the same single source the
  // Four Reference Prices page reads.
  const detail: Record<string, MonthDetail> = {};
  const rows = weeklyConfigurationTable();
  const marketCells = grids["returns:market"]?.cells ?? [];
  const monthKeys = new Set(marketCells.map(([y, m]) => `${y}-${String(m).padStart(2, "0")}`));
  for (const key of monthKeys) {
    const endTs = Date.parse(`${key}-28T00:00:00Z`) + 4 * MS_DAY; // ≥ month end
    let row = null;
    for (const r of rows) {
      if (r.ts <= endTs && (row == null || r.ts > row.ts)) row = r;
    }
    // Only use a week that actually falls inside the month (weekly cadence
    // means the last row can be up to 6 days before month end).
    if (row && row.date.slice(0, 7) === key) {
      const halvingIso = latestHalvingOnOrBefore(row.date);
      const cycleN = Number(Object.entries(HALVINGS).find(([, d]) => d === halvingIso)?.[0] ?? 0);
      detail[key] = {
        config: configurationName(row.aboveTrend, row.aboveHolders, row.aboveMiners),
        vsTrendPct: pct(row.price, row.ma200),
        vsHoldersPct: row.realised != null ? pct(row.price, row.realised) : null,
        vsMinersPct: row.mining != null ? pct(row.price, row.mining) : null,
        cycle: { n: cycleN, day: Math.round((row.ts - Date.parse(`${halvingIso}T00:00:00Z`)) / MS_DAY) },
      };
    } else {
      detail[key] = { config: null, vsTrendPct: null, vsHoldersPct: null, vsMinersPct: null, cycle: null };
    }
  }

  return {
    todayIso: today,
    curYear,
    curMonth,
    standingClose: STANDING_CLOSE,
    ctx: serializeCtx(buildFilterContext(src.closes, today)),
    grids,
    detail,
    series: SERIES_META,
  };
}

function pct(a: number, b: number): number | null {
  if (!(b > 0)) return null;
  return Math.round((a / b - 1) * 1000) / 10;
}
