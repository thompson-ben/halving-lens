// Price in Context (PR129): the data behind the /price three-line chart.
// Two long-term reference series join the existing price line:
//   1. 200-day moving average — the long-term trend. Rolling mean over the live
//      daily closes; on the all-time view it is recovered exactly from the
//      weekly samples as price / Mayer multiple (Mayer = price / 200d SMA).
//   2. Realized price — the network's aggregate on-chain cost basis, from the
//      live BGeometrics series. Drawn only across the window that feed covers;
//      the modelled prior-cycle values are never plotted.
// Also provides the vs-trend / vs-cost-basis stats and the one-sentence
// summary. Every sentence describes today's relationship — nothing forecasts.

import { CURRENT_CYCLE, CYCLES, ONCHAIN, PRICE_HISTORY, SPOT } from "./btcData";
import { PRICE_RANGES, type PriceRangeKey } from "./btcPrice";
import { metricStatus } from "./cycleIntel";
import { miningCostDailyPoints } from "./productionCost";

const MS_DAY = 86_400_000;
const MA_WINDOW = 200;
// A reference value is never carried forward more than this across a gap.
const MAX_STALE_DAYS = 14;

export interface ContextPoint {
  ts: number;
  price: number;
  ma200?: number;
  realized?: number;
  mining?: number; // Estimated Mining Cost (modelled) — absent when unavailable/stale
}

interface RefPoint {
  ts: number;
  value: number;
}

// ── Reference series (module-level caches; snapshot data is immutable) ──────

let realizedCache: RefPoint[] | null | undefined;

// Live daily realized price. Empty when the metric is still synthetic — the
// chart and stats then degrade to price + 200d MA only.
function realizedSeries(): RefPoint[] | null {
  if (realizedCache !== undefined) return realizedCache;
  const live = metricStatus("realized-price") !== "coming-soon";
  const pts = (live ? ONCHAIN?.series?.realizedPrice : null) ?? [];
  const out = pts
    .map((p) => ({ ts: Date.parse(`${p.date}T00:00:00Z`), value: p.value }))
    .filter((p) => Number.isFinite(p.ts) && p.value > 0)
    .sort((a, b) => a.ts - b.ts);
  realizedCache = out.length ? out : null;
  return realizedCache;
}

let maDailyCache: RefPoint[] | null | undefined;

function ma200Daily(): RefPoint[] | null {
  if (maDailyCache !== undefined) return maDailyCache;
  const closes = PRICE_HISTORY;
  if (closes.length < MA_WINDOW) {
    maDailyCache = null;
    return maDailyCache;
  }
  const out: RefPoint[] = [];
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i].price;
    if (i >= MA_WINDOW) sum -= closes[i - MA_WINDOW].price;
    if (i >= MA_WINDOW - 1) out.push({ ts: closes[i].ts, value: sum / MA_WINDOW });
  }
  maDailyCache = out;
  return maDailyCache;
}

let miningCache: RefPoint[] | null | undefined;

// Estimated Mining Cost central series (modelled; see data/productionCost).
// null when the metric is unavailable or its hashrate observation is stale —
// the chart then omits the series entirely.
function miningSeries(): RefPoint[] | null {
  if (miningCache !== undefined) return miningCache;
  const pts = miningCostDailyPoints();
  miningCache = pts ? pts.map((p) => ({ ts: p.ts, value: p.value })) : null;
  return miningCache;
}

let weeklyCache: ContextPoint[] | undefined;

// All-time weekly series with both reference lines attached.
function weeklyContext(): ContextPoint[] {
  if (weeklyCache) return weeklyCache;
  const realized = realizedSeries();
  const out: ContextPoint[] = [];
  for (const c of CYCLES) {
    const base = new Date(c.halvingDate).getTime();
    for (const s of c.samples) {
      if (s.price <= 0) continue;
      const ts = base + s.day * MS_DAY;
      out.push({
        ts,
        price: s.price,
        ma200: s.mayer > 0 ? s.price / s.mayer : undefined,
        realized: valueAt(realized, ts),
        mining: valueAt(miningSeries(), ts),
      });
    }
  }
  weeklyCache = out.sort((a, b) => a.ts - b.ts);
  return weeklyCache;
}

// Daily MA when the daily closes are present, else the weekly-derived MA.
function ma200Series(): RefPoint[] | null {
  const daily = ma200Daily();
  if (daily) return daily;
  const weekly = weeklyContext()
    .filter((p) => p.ma200 != null)
    .map((p) => ({ ts: p.ts, value: p.ma200! }));
  return weekly.length ? weekly : null;
}

// Latest series value at or before ts (binary search), within the stale cap.
function valueAt(series: RefPoint[] | null, ts: number): number | undefined {
  if (!series || series.length === 0) return undefined;
  let lo = 0;
  let hi = series.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].ts <= ts) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (best < 0) return undefined;
  const p = series[best];
  return ts - p.ts > MAX_STALE_DAYS * MS_DAY ? undefined : p.value;
}

// ── Chart series ────────────────────────────────────────────────────────────

// The three-line series for a range. 1D stays a live client fetch — the chart
// attaches reference values to those points via referenceValuesAt.
export function contextSeries(key: PriceRangeKey): ContextPoint[] {
  if (key === "1D") return [];
  if (key === "All") return weeklyContext();
  const cfg = PRICE_RANGES.find((r) => r.key === key)!;
  if (!PRICE_HISTORY.length) {
    const all = weeklyContext();
    if (!all.length) return [];
    const last = all[all.length - 1].ts;
    return all.filter((p) => p.ts >= last - cfg.days * MS_DAY);
  }
  const ma = ma200Series();
  const realized = realizedSeries();
  const last = PRICE_HISTORY[PRICE_HISTORY.length - 1].ts;
  const mining = miningSeries();
  return PRICE_HISTORY.filter((p) => p.ts >= last - cfg.days * MS_DAY).map((p) => ({
    ts: p.ts,
    price: p.price,
    ma200: valueAt(ma, p.ts),
    realized: valueAt(realized, p.ts),
    mining: valueAt(mining, p.ts),
  }));
}

// Reference values for an intraday timestamp (the 1D/1W hourly views). Both
// are daily metrics, so within a day they are constants, not curves.
export function referenceValuesAt(ts: number): { ma200?: number; realized?: number; mining?: number } {
  return {
    ma200: valueAt(ma200Series(), ts),
    realized: valueAt(realizedSeries(), ts),
    mining: valueAt(miningSeries(), ts),
  };
}

// ── Today's read ────────────────────────────────────────────────────────────

export interface PriceContext {
  price: number | null;
  ma200: number | null;
  realized: number | null;
  mining: number | null; // Estimated Mining Cost (modelled); null when unavailable
  vsMa200Pct: number | null;
  vsRealizedPct: number | null;
  vsMiningPct: number | null;
  summary: string | null;
}

export function priceContext(): PriceContext {
  const price =
    SPOT?.price ?? CURRENT_CYCLE.samples[CURRENT_CYCLE.samples.length - 1]?.price ?? null;
  const ma = ma200Series();
  const rp = realizedSeries();
  const mc = miningSeries();
  const ma200 = ma?.length ? ma[ma.length - 1].value : null;
  const realized = rp?.length ? rp[rp.length - 1].value : null;
  const mining = mc?.length ? mc[mc.length - 1].value : null;
  const vsMa200Pct = price != null && ma200 ? (price / ma200 - 1) * 100 : null;
  const vsRealizedPct = price != null && realized ? (price / realized - 1) * 100 : null;
  const vsMiningPct = price != null && mining ? (price / mining - 1) * 100 : null;
  return {
    price,
    ma200,
    realized,
    mining,
    vsMa200Pct,
    vsRealizedPct,
    vsMiningPct,
    summary: summarize(vsMa200Pct, vsRealizedPct, vsMiningPct),
  };
}

// One sentence describing where today's price sits relative to its reference
// prices — the 200-day moving average and Realised Price (observed), plus
// Estimated Mining Cost (modelled) when available. Clauses compose so the
// sentence stays grammatical when the estimated line is withheld. Purely
// descriptive of the present; "historically associated" is as far as it
// reaches. Never a forecast.
function summarize(vsMa: number | null, vsRp: number | null, vsMining: number | null): string | null {
  if (vsMa == null && vsRp == null && vsMining == null) return null;
  const parts: string[] = [];
  if (vsMa != null) parts.push(`${vsMa >= 0 ? "above" : "below"} its 200-day moving average`);
  if (vsRp != null) parts.push(`${vsRp >= 0 ? "above" : "below"} Realised Price`);
  if (vsMining != null) {
    parts.push(
      Math.abs(vsMining) < 10
        ? "near its Estimated Mining Cost"
        : `${vsMining >= 0 ? "above" : "below"} its Estimated Mining Cost`,
    );
  }
  const joined =
    parts.length === 1
      ? parts[0]
      : parts.length === 2
        ? `${parts[0]} and ${parts[1]}`
        : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
  const explain =
    vsMining != null
      ? "These reference prices show the market trend, the average holder's cost basis, and the modelled electricity cost of producing new supply"
      : "These reference prices show the market trend and the average holder's cost basis";
  return `Bitcoin currently trades ${joined}. ${explain} — historical context, not a prediction.`;
}
