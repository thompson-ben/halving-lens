// Cost of Production — app-side service (reads the snapshot's modelled series).
//
// One of the three HalvingLens reference prices, used with this exact
// terminology everywhere:
//   Market Price    — what Bitcoin trades for today
//   Realised Price  — the aggregate holder cost basis
//   Estimated Mining Cost — the modelled electricity cost to mine one Bitcoin
//
// MODELLED: documented assumptions applied to observed hashrate (see
// src/lib/data/productionCost.ts). Every surface reading from here inherits
// clean drop-out behaviour — if the series is missing or the hashrate
// observation is older than STALE_AFTER_DAYS, the metric reports unavailable
// rather than showing a stale or zero value.

import { CYCLES, PRICE_HISTORY, SPOT, TODAY, CURRENT_CYCLE } from "./btcData";
import { SNAPSHOT } from "./data/snapshot";
import {
  ASSUMPTIONS_VERSION,
  ELECTRICITY_USD_PER_KWH,
  classifyPremium,
  productionPremiumPct,
  type ProductionCostBand,
} from "./data/productionCost";
import { metricStatus } from "./cycleIntel";
import { fmtUsd } from "./format";

const MS_DAY = 86_400_000;
// A hashrate observation older than this makes the whole metric unavailable —
// it never silently carries.
const STALE_AFTER_DAYS = 7;

const BLOCK = SNAPSHOT.productionCost ?? null;

const BAND_LOW = ELECTRICITY_USD_PER_KWH.low / ELECTRICITY_USD_PER_KWH.central;
const BAND_HIGH = ELECTRICITY_USD_PER_KWH.high / ELECTRICITY_USD_PER_KWH.central;

export interface ProductionCostRead {
  available: boolean;
  /** Why unavailable, when it is. */
  unavailableReason?: string;
  central: number | null;
  low: number | null;
  high: number | null;
  marketPrice: number | null;
  premiumPct: number | null; // Market Price vs central estimate
  diffUsd: number | null;
  band: ProductionCostBand | null;
  bandLabel: string | null;
  source: string;
  assumptionsVersion: string;
  hashrateObservedAt: string | null;
  fetchedAt: string | null;
}

export function productionCostRead(): ProductionCostRead {
  const empty: ProductionCostRead = {
    available: false,
    central: null,
    low: null,
    high: null,
    marketPrice: SPOT?.price ?? null,
    premiumPct: null,
    diffUsd: null,
    band: null,
    bandLabel: null,
    source: BLOCK?.source ?? "model: HalvingLens electricity-cost model",
    assumptionsVersion: BLOCK?.assumptionsVersion ?? ASSUMPTIONS_VERSION,
    hashrateObservedAt: BLOCK?.hashrateObservedAt ?? null,
    fetchedAt: BLOCK?.fetchedAt ?? null,
  };
  if (!BLOCK || BLOCK.points.length === 0) {
    return { ...empty, unavailableReason: "The hashrate history behind the model hasn't been synced yet." };
  }
  const last = BLOCK.points[BLOCK.points.length - 1];
  const ageDays = Math.round((Date.now() - Date.parse(`${BLOCK.hashrateObservedAt}T00:00:00Z`)) / MS_DAY);
  if (ageDays > STALE_AFTER_DAYS) {
    return {
      ...empty,
      unavailableReason: `The hashrate observation behind the model is ${ageDays} days old — the estimate is withheld rather than shown stale.`,
    };
  }
  const price = SPOT?.price ?? CURRENT_CYCLE.samples[CURRENT_CYCLE.samples.length - 1]?.price ?? null;
  const central = last.value;
  const premiumPct = price != null ? productionPremiumPct(price, central) : null;
  const cls = premiumPct != null ? classifyPremium(premiumPct) : null;
  return {
    available: true,
    central,
    low: central * BAND_LOW,
    high: central * BAND_HIGH,
    marketPrice: price,
    premiumPct,
    diffUsd: price != null ? price - central : null,
    band: cls?.band ?? null,
    bandLabel: cls?.label ?? null,
    source: BLOCK.source,
    assumptionsVersion: BLOCK.assumptionsVersion,
    hashrateObservedAt: BLOCK.hashrateObservedAt,
    fetchedAt: BLOCK.fetchedAt,
  };
}

// ── Chart series: Market Price vs Cost of Production ────────────────────────

export interface ProductionChartPoint {
  ts: number;
  price?: number;
  cost?: number; // central
  costLow?: number;
  costHigh?: number;
}

export const PRODUCTION_RANGES = [
  { key: "1M", days: 30 },
  { key: "3M", days: 90 },
  { key: "6M", days: 180 },
  { key: "1Y", days: 365 },
  { key: "All", days: Infinity },
] as const;

export type ProductionRangeKey = (typeof PRODUCTION_RANGES)[number]["key"];

function priceSeriesSinceModelStart(): Array<{ ts: number; price: number }> {
  // Daily closes for the recent two years; weekly cycle samples for older
  // history back to the model start (2016).
  const daily = PRICE_HISTORY.map((p) => ({ ts: p.ts, price: p.price }));
  const firstDaily = daily[0]?.ts ?? Infinity;
  const weekly: Array<{ ts: number; price: number }> = [];
  for (const c of CYCLES) {
    const base = new Date(c.halvingDate).getTime();
    for (const s of c.samples) {
      const ts = base + s.day * MS_DAY;
      if (s.price > 0 && ts < firstDaily) weekly.push({ ts, price: s.price });
    }
  }
  return [...weekly.sort((a, b) => a.ts - b.ts), ...daily];
}

export function productionChartSeries(key: ProductionRangeKey): ProductionChartPoint[] {
  const read = productionCostRead();
  if (!read.available || !BLOCK) return [];
  const costByTs = new Map(
    BLOCK.points.map((p) => [Date.parse(`${p.date}T00:00:00Z`), p.value] as const),
  );
  const costTs = [...costByTs.keys()].sort((a, b) => a - b);
  const firstCost = costTs[0];
  const prices = priceSeriesSinceModelStart().filter((p) => p.ts >= firstCost);
  // Nearest cost point at or before each price point (the cost series is
  // weekly before the recent window).
  let ci = 0;
  const merged: ProductionChartPoint[] = prices.map((p) => {
    while (ci + 1 < costTs.length && costTs[ci + 1] <= p.ts) ci++;
    const cTs = costTs[ci] <= p.ts ? costTs[ci] : undefined;
    const cost = cTs != null ? costByTs.get(cTs) : undefined;
    // Never carry a cost value more than 10 days (weekly cadence + slack).
    const fresh = cTs != null && p.ts - cTs <= 10 * MS_DAY;
    return {
      ts: p.ts,
      price: p.price,
      cost: fresh ? cost : undefined,
      costLow: fresh && cost != null ? cost * BAND_LOW : undefined,
      costHigh: fresh && cost != null ? cost * BAND_HIGH : undefined,
    };
  });
  const cfg = PRODUCTION_RANGES.find((r) => r.key === key)!;
  if (!Number.isFinite(cfg.days)) return merged;
  const last = merged[merged.length - 1]?.ts ?? 0;
  return merged.filter((p) => p.ts >= last - cfg.days * MS_DAY);
}

// Dated central-estimate series for other reference-price surfaces (Price in
// Context). Gated by the same availability/staleness rules as the read —
// returns null when the metric is unavailable so consumers omit the series
// entirely (never zero, never stale).
export function miningCostDailyPoints(): Array<{ ts: number; value: number }> | null {
  const read = productionCostRead();
  if (!read.available || !BLOCK) return null;
  return BLOCK.points.map((p) => ({ ts: Date.parse(`${p.date}T00:00:00Z`), value: p.value }));
}

// ── Reference Prices (State of Bitcoin) ─────────────────────────────────────

export interface ReferencePrices {
  marketPrice: number | null;
  ma200: number | null;
  vsMa200Pct: number | null;
  realisedPrice: number | null;
  vsRealisedPct: number | null;
  productionCost: number | null;
  vsProductionPct: number | null;
  productionAvailable: boolean;
  realisedAvailable: boolean;
  todaysContext: string | null;
}

// ma200 is passed in by the caller (from priceContext) rather than imported —
// priceContext imports this module for the mining series, so importing back
// would create a cycle.
export function referencePrices(opts?: { ma200?: number | null }): ReferencePrices {
  const read = productionCostRead();
  const market = read.marketPrice;
  const ma200 = opts?.ma200 ?? null;
  const vsMa200Pct = market != null && ma200 ? (market / ma200 - 1) * 100 : null;
  const realisedAvailable = metricStatus("realized-price") !== "coming-soon";
  const realised = realisedAvailable && Number.isFinite(TODAY.realizedPrice) ? TODAY.realizedPrice : null;
  const vsRealisedPct = market != null && realised ? (market / realised - 1) * 100 : null;
  return {
    marketPrice: market,
    ma200,
    vsMa200Pct,
    realisedPrice: realised,
    vsRealisedPct,
    productionCost: read.central,
    vsProductionPct: read.premiumPct,
    productionAvailable: read.available,
    realisedAvailable: realised != null,
    todaysContext: todaysContext(market, vsMa200Pct, vsRealisedPct, read),
  };
}

// One deterministic, descriptive paragraph relating the reference prices.
// Clauses compose dynamically so the paragraph stays grammatical whether the
// estimated row is present or withheld. Historical context only — no
// forecasts, no universal claims about miner profitability.
function todaysContext(
  market: number | null,
  vsMaPct: number | null,
  vsRealisedPct: number | null,
  read: ProductionCostRead,
): string | null {
  if (market == null) return null;
  const clauses: string[] = [];
  if (vsMaPct != null) {
    clauses.push(`${vsMaPct >= 0 ? "above" : "below"} its 200-day moving average (${Math.abs(vsMaPct).toFixed(0)}%)`);
  }
  if (vsRealisedPct != null) {
    clauses.push(`${vsRealisedPct >= 0 ? "above" : "below"} Realised Price (${Math.abs(vsRealisedPct).toFixed(0)}% ${vsRealisedPct >= 0 ? "above" : "below"} the average holder's cost basis)`);
  }
  const premium = read.available ? read.premiumPct : null;
  if (premium != null) {
    if (premium <= -33) {
      clauses.push("below its Estimated Mining Cost — a configuration that has historically coincided with periods of miner stress, though the estimate is not a guaranteed support level or price floor");
    } else if (premium < 33) {
      clauses.push(`near its Estimated Mining Cost (${premium >= 0 ? "+" : ""}${premium.toFixed(0)}%), meaning modelled average mining margins are compressed`);
    } else {
      clauses.push(`${premium.toFixed(0)}% above its Estimated Mining Cost, meaning mining remains economically favourable for the modelled average operator`);
    }
  }
  if (clauses.length === 0) return null;
  const joined =
    clauses.length === 1
      ? clauses[0]
      : clauses.length === 2
        ? `${clauses[0]} and ${clauses[1]}`
        : `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`;
  const closers: string[] = [];
  if (vsRealisedPct != null) {
    closers.push(vsRealisedPct >= 0 ? "the average holder is in profit" : "the average holder is under water");
  }
  if (premium != null) {
    closers.push(
      premium >= 33
        ? "new supply is being produced well below the market price"
        : premium <= -33
          ? "new supply is modelled as costing more to produce than it sells for"
          : "new supply is being produced near its modelled cost",
    );
  }
  const closing = closers.length ? ` Taken together, ${closers.join(" while ")} — historical context, not a prediction.` : " Historical context, not a prediction.";
  return `Bitcoin trades ${joined}.${closing}`;
}

// ── Miners page context line ────────────────────────────────────────────────

export function minersContextLine(): string | null {
  const read = productionCostRead();
  if (!read.available || read.premiumPct == null) return null;
  const p = read.premiumPct;
  const rel = p >= 0 ? "above" : "below";
  return `Bitcoin currently trades ${Math.abs(p).toFixed(0)}% ${rel} its estimated mining cost (${fmtUsd(read.central!, { compact: true })}, electricity-only estimate).`;
}
