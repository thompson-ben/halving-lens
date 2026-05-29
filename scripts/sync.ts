#!/usr/bin/env tsx
/**
 * Fetches live Bitcoin cycle data from public sources and writes a typed
 * snapshot to `src/lib/data/snapshot.ts`. Existing snapshot is overwritten.
 *
 * Run:    npm run sync
 * Deploy: npm run sync && npm run build   (Vercel build command)
 *
 * Sources
 * - CoinMetrics community  — price (USD), market cap, realised cap, supply (primary)
 * - CryptoCompare histoday — full daily price history, keyless (price fallback)
 * - CoinGecko market_chart — recent prices, free-tier (last-resort fallback)
 * - mempool.space          — current block height + hash rate
 *
 * Price falls back CoinMetrics → CryptoCompare → CoinGecko. CoinMetrics carries
 * the on-chain metrics (realised cap + supply) and is joined onto whichever
 * price series is used. All requests send a browser User-Agent because these
 * APIs front their endpoints with a WAF that 403s non-browser UAs. CoinGecko's
 * keyless `days=max` endpoint now 401s, so it serves recent data only.
 *
 * Derived
 * - Mayer Multiple  = price / 200d SMA
 * - MVRV            = marketCap / realisedCap
 * - MVRV-Z          = (mvrv - rolling mean) / rolling std
 * - NUPL            = (marketCap - realisedCap) / marketCap
 * - Realised Price  = realisedCap / supply
 * - Puell Multiple  = (issuance * price) / 365d SMA of (issuance * price)
 * - Rainbow band    = per-cycle band of price vs cycle peak
 *
 * Modelled (no public free source — kept as the synthetic curve)
 * - SOPR, RHODL Ratio, Reserve Risk
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CYCLE_META,
  DAYS_PER_CYCLE,
  HALVINGS,
  type Cycle,
  type CycleId,
  type CycleSample,
  type Snapshot,
} from "../src/lib/data/types";
import { syntheticSnapshot } from "../src/lib/data/synthetic";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");
const SNAPSHOT_PATH = resolve(ROOT, "src/lib/data/snapshot.ts");

const MS_PER_DAY = 86_400_000;
const SAMPLE_STEP_DAYS = 7;

interface DailyPoint {
  ts: number; // unix ms (UTC midnight)
  price: number;
  marketCap: number;
  realisedCap?: number;
  supply?: number;
}

// A browser-like UA. Keyless crypto APIs (CoinMetrics, CryptoCompare) front
// their endpoints with a WAF that 403s non-browser User-Agents from cloud IPs.
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchJson<T>(url: string, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": UA },
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
      return (await res.json()) as T;
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function fetchText(url: string, retries = 2): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

// CryptoCompare — full daily BTC close history (USD). Keyless, no signup, and
// (unlike CoinGecko's free tier) returns the entire history in one call. This
// is the primary price fallback when CoinMetrics is unavailable.
async function fetchCryptoCompare(): Promise<Array<{ ts: number; price: number; marketCap: number }>> {
  const url =
    "https://min-api.cryptocompare.com/data/v2/histoday?fsym=BTC&tsym=USD&allData=true";
  const data = await fetchJson<{
    Response: string;
    Message?: string;
    Data: { Data: Array<{ time: number; close: number }> };
  }>(url);
  if (data.Response !== "Success" || !data.Data?.Data?.length) {
    throw new Error(`CryptoCompare: ${data.Message ?? "no data"}`);
  }
  return data.Data.Data.filter((d) => d.close > 0).map((d) => {
    const day = Math.floor((d.time * 1000) / MS_PER_DAY) * MS_PER_DAY;
    // No market cap from this endpoint — approximate from price × circulating
    // supply (CoinMetrics supply backfills this when present in the join).
    return { ts: day, price: d.close, marketCap: d.close * 19_000_000 };
  });
}

// CoinGecko — free tier caps history at 365 days and rejects days=max (401),
// so this only backfills recent prices. Last-resort fallback.
async function fetchCoinGecko(): Promise<Array<{ ts: number; price: number; marketCap: number }>> {
  const url =
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365";
  const data = await fetchJson<{
    prices: [number, number][];
    market_caps: [number, number][];
  }>(url);
  const mcapByTs = new Map(data.market_caps.map(([t, v]) => [Math.floor(t / MS_PER_DAY) * MS_PER_DAY, v]));
  return data.prices.map(([ts, price]) => {
    const day = Math.floor(ts / MS_PER_DAY) * MS_PER_DAY;
    return { ts: day, price, marketCap: mcapByTs.get(day) ?? price * 19_000_000 };
  });
}

interface CoinMetricsRow {
  ts: number;
  price?: number;
  marketCap?: number;
  realisedCap?: number;
  supply?: number;
}

// CoinMetrics community — daily price, market cap, realised cap and circulating
// supply for BTC. Keyless, full history. Some metrics (notably CapRealUSD,
// realised cap) require a Pro key — requesting one paid metric 403s the whole
// batch — so we try the full set then degrade to free-only metrics.
const CM_METRICS_FULL = ["PriceUSD", "CapMrktCurUSD", "CapRealUSD", "SplyCur"];
const CM_METRICS_FREE = ["PriceUSD", "CapMrktCurUSD", "SplyCur"];

async function fetchCoinMetricsMetrics(metrics: string[]): Promise<CoinMetricsRow[]> {
  const base =
    "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics" +
    `?assets=btc&metrics=${metrics.join(",")}&frequency=1d&format=json&page_size=10000`;
  // CoinMetrics paginates — walk pages.
  let next: string | undefined = base;
  const out: CoinMetricsRow[] = [];
  let safety = 0;
  const num = (s?: string): number | undefined => {
    const v = s ? parseFloat(s) : NaN;
    return Number.isFinite(v) ? v : undefined;
  };
  while (next && safety++ < 20) {
    const page: {
      data: Array<{
        time: string;
        PriceUSD?: string;
        CapMrktCurUSD?: string;
        CapRealUSD?: string;
        SplyCur?: string;
      }>;
      next_page_url?: string;
    } = await fetchJson(next);
    for (const row of page.data) {
      const ts = Date.parse(row.time);
      if (!Number.isFinite(ts)) continue;
      out.push({
        ts: Math.floor(ts / MS_PER_DAY) * MS_PER_DAY,
        price: num(row.PriceUSD),
        marketCap: num(row.CapMrktCurUSD),
        realisedCap: num(row.CapRealUSD),
        supply: num(row.SplyCur),
      });
    }
    next = page.next_page_url;
  }
  return out;
}

// Try the full metric set; if it 403s (a paid metric in the batch), retry with
// the free-only subset so we still get price + market cap + supply.
async function fetchCoinMetrics(): Promise<{ rows: CoinMetricsRow[]; hadRealisedCap: boolean }> {
  try {
    const rows = await fetchCoinMetricsMetrics(CM_METRICS_FULL);
    return { rows, hadRealisedCap: rows.some((r) => Number.isFinite(r.realisedCap)) };
  } catch (e) {
    console.warn(
      `  CoinMetrics full metric set rejected (${(e as Error).message}); retrying free-only metrics…`,
    );
    const rows = await fetchCoinMetricsMetrics(CM_METRICS_FREE);
    return { rows, hadRealisedCap: false };
  }
}

async function fetchMempoolTip(): Promise<{ height: number; hashrate?: number }> {
  const height = await fetchJson<number>("https://mempool.space/api/blocks/tip/height");
  try {
    const hash = await fetchJson<{ currentHashrate: number }>(
      "https://mempool.space/api/v1/mining/hashrate/24h",
    );
    return { height, hashrate: hash.currentHashrate };
  } catch {
    return { height };
  }
}

// SMA over the last `window` daily points (inclusive of current).
function sma(values: number[], i: number, window: number): number | undefined {
  if (i < window - 1) return undefined;
  let sum = 0;
  for (let j = i - window + 1; j <= i; j++) sum += values[j];
  return sum / window;
}

// Per-cycle rainbow calibration — same approach as synthetic.
const RAINBOW_PEAK: Record<Exclude<CycleId, 1>, { peak: number; peakBand: number }> = {
  2: { peak: 1150, peakBand: 8.0 },
  3: { peak: 19400, peakBand: 8.0 },
  4: { peak: 69000, peakBand: 7.6 },
  5: { peak: 112000, peakBand: 6.8 },
};

function rainbowBand(price: number, cycleId: Exclude<CycleId, 1>): number {
  const cfg = RAINBOW_PEAK[cycleId];
  const band = cfg.peakBand + 7 * Math.log10(price / cfg.peak);
  return Math.max(0, Math.min(8, band));
}

// Split joined daily series into a Cycle, weekly-sampled.
function buildCycle(
  id: Exclude<CycleId, 1>,
  daily: DailyPoint[],
  // Continuous arrays for derivations that look across cycle boundaries
  globalDaily: DailyPoint[],
  globalIdxOffset: number, // index in globalDaily where THIS cycle starts
  syntheticFallback: Cycle, // for modelled metrics (SOPR/RHODL/RR)
  capDayFromHalving?: number,
): Cycle {
  const meta = CYCLE_META.find((c) => c.id === id)!;
  const halvingTs = Date.parse(meta.startDate);
  const totalDays = capDayFromHalving ?? Math.min(daily.length - 1, DAYS_PER_CYCLE - 1);

  // Pre-extract price + marketCap arrays for SMA windows that span back into prior cycles.
  const prices = globalDaily.map((d) => d.price);
  const issuance = globalDaily.map((d, i) => {
    // Reward per block × 144 blocks/day, ramp by halving date.
    const ts = d.ts;
    let reward = 50;
    for (const m of CYCLE_META) {
      if (ts >= Date.parse(m.startDate)) reward = m.rewardBtc;
    }
    return reward * 144 * d.price;
  });

  const samples: CycleSample[] = [];
  let peakPrice = 0;
  let peakDay = 0;
  let troughPrice = Infinity;
  let troughDay = 0;

  // Compute a per-cycle rolling stats baseline for MVRV-Z. We compute the
  // running mean+std of MVRV using the global daily series, anchored at this
  // cycle's start.
  const mvrvSeries: number[] = [];
  for (let i = 0; i < globalDaily.length; i++) {
    const g = globalDaily[i];
    if (g.realisedCap && g.realisedCap > 0) mvrvSeries.push(g.marketCap / g.realisedCap);
  }
  const mvrvMean = mvrvSeries.reduce((a, b) => a + b, 0) / Math.max(1, mvrvSeries.length);
  const mvrvVar =
    mvrvSeries.reduce((acc, v) => acc + (v - mvrvMean) ** 2, 0) /
    Math.max(1, mvrvSeries.length - 1);
  const mvrvStd = Math.sqrt(mvrvVar);

  for (let d = 0; d <= totalDays; d += SAMPLE_STEP_DAYS) {
    if (d >= daily.length) break;
    const pt = daily[d];
    const gIdx = globalIdxOffset + d;

    if (pt.price > peakPrice) {
      peakPrice = pt.price;
      peakDay = d;
    }
    if (pt.price < troughPrice) {
      troughPrice = pt.price;
      troughDay = d;
    }

    const ma200 = sma(prices, gIdx, 200);
    const ma365Issuance = sma(issuance, gIdx, 365);
    const mvrv =
      pt.realisedCap && pt.realisedCap > 0 ? pt.marketCap / pt.realisedCap : NaN;
    const mvrvZ = Number.isFinite(mvrv) && mvrvStd > 0 ? (mvrv - mvrvMean) / mvrvStd : NaN;
    const nupl =
      pt.realisedCap && pt.marketCap > 0
        ? (pt.marketCap - pt.realisedCap) / pt.marketCap
        : NaN;
    const realizedPrice =
      pt.realisedCap && pt.supply && pt.supply > 0 ? pt.realisedCap / pt.supply : NaN;
    const mayer = ma200 && ma200 > 0 ? pt.price / ma200 : NaN;
    const puell =
      ma365Issuance && ma365Issuance > 0 ? issuance[gIdx] / ma365Issuance : NaN;
    const rainbow = rainbowBand(pt.price, id);

    // Modelled fallbacks for metrics not in public free data.
    const syntheticSample = nearestSynthetic(syntheticFallback, d);

    samples.push({
      day: d,
      price: pt.price,
      mvrv: finiteOr(mvrv, syntheticSample.mvrv),
      mvrvZ: finiteOr(mvrvZ, syntheticSample.mvrvZ),
      nupl: finiteOr(nupl, syntheticSample.nupl),
      mayer: finiteOr(mayer, syntheticSample.mayer),
      puell: finiteOr(puell, syntheticSample.puell),
      reserveRisk: syntheticSample.reserveRisk, // modelled
      rainbow,
      sopr: syntheticSample.sopr, // modelled
      rhodl: syntheticSample.rhodl, // modelled
      realizedPrice: finiteOr(realizedPrice, syntheticSample.realizedPrice),
    });
  }

  return {
    id,
    label: meta.label,
    short: meta.short,
    color: meta.color,
    halvingDate: meta.startDate,
    endDate: meta.endDate,
    endLabel: meta.endLabel,
    rewardBtc: meta.rewardBtc,
    peakPrice,
    peakDay,
    troughPrice,
    troughDay,
    samples,
  };
}

function finiteOr(v: number, fallback: number): number {
  return Number.isFinite(v) ? v : fallback;
}

function nearestSynthetic(cycle: Cycle, day: number): CycleSample {
  return cycle.samples.reduce((best, s) =>
    Math.abs(s.day - day) < Math.abs(best.day - day) ? s : best,
  );
}

function daysBetween(a: string, b: number): number {
  return Math.floor((b - Date.parse(a)) / MS_PER_DAY);
}

async function build(): Promise<Snapshot> {
  console.log("→ Fetching CoinMetrics (price + market cap + realised cap + supply)…");
  let cm: CoinMetricsRow[] = [];
  let hadRealisedCap = false;
  try {
    const res = await fetchCoinMetrics();
    cm = res.rows;
    hadRealisedCap = res.hadRealisedCap;
    console.log(
      `  got ${cm.length} daily rows from CoinMetrics (realised cap: ${hadRealisedCap ? "yes" : "no — free tier"})`,
    );
  } catch (e) {
    console.warn(`  CoinMetrics unavailable — will try CryptoCompare for price. (${(e as Error).message})`);
  }

  const cmHasPrice = cm.some((r) => Number.isFinite(r.price));

  // On-chain data from CoinMetrics. Supply is free; realised cap may be absent
  // on the free tier. Key on supply so the join works even without realised cap.
  const chainByTs = new Map(
    cm.filter((r) => Number.isFinite(r.supply)).map((c) => [c.ts, c]),
  );

  // Base daily price series, by preference:
  //   1. CoinMetrics PriceUSD   (also carries market cap + on-chain)
  //   2. CryptoCompare histoday  (keyless, full history)
  //   3. CoinGecko 365d          (free-tier, recent only — last resort)
  let priceSource: string;
  let daily: DailyPoint[];

  const joinChain = (
    prices: Array<{ ts: number; price: number; marketCap: number }>,
  ): DailyPoint[] =>
    prices.map((p) => {
      const c = chainByTs.get(p.ts);
      return {
        ts: p.ts,
        price: p.price,
        marketCap: c?.marketCap ?? p.marketCap,
        realisedCap: c?.realisedCap,
        supply: c?.supply,
      };
    });

  if (cmHasPrice) {
    priceSource = "CoinMetrics community PriceUSD";
    daily = cm
      .filter((r) => Number.isFinite(r.price))
      .map((r) => ({
        ts: r.ts,
        price: r.price!,
        marketCap: Number.isFinite(r.marketCap)
          ? (r.marketCap as number)
          : r.price! * (r.supply ?? 19_000_000),
        realisedCap: r.realisedCap,
        supply: r.supply,
      }));
    console.log(
      `  using CoinMetrics price series (${daily.length} days from ${new Date(daily[0].ts).toISOString().slice(0, 10)})`,
    );
  } else {
    let prices: Array<{ ts: number; price: number; marketCap: number }> | null = null;
    try {
      console.log("→ CoinMetrics price unavailable; fetching CryptoCompare history…");
      prices = await fetchCryptoCompare();
      priceSource = "CryptoCompare histoday";
      console.log(
        `  got ${prices.length} daily price points from CryptoCompare (from ${new Date(prices[0].ts).toISOString().slice(0, 10)})`,
      );
    } catch (e) {
      console.warn(`  CryptoCompare unavailable — trying CoinGecko. (${(e as Error).message})`);
      prices = await fetchCoinGecko();
      priceSource = "CoinGecko market_chart (365d)";
      console.log(
        `  got ${prices.length} daily price points from CoinGecko (from ${new Date(prices[0].ts).toISOString().slice(0, 10)})`,
      );
    }
    daily = joinChain(prices);
  }

  console.log("→ Fetching mempool.space tip…");
  let tip: { height: number; hashrate?: number } | null = null;
  try {
    tip = await fetchMempoolTip();
    console.log(`  block ${tip.height}, ${tip.hashrate ? `${(tip.hashrate / 1e18).toFixed(1)} EH/s` : "hashrate unavailable"}`);
  } catch (e) {
    console.warn(`  mempool.space unavailable. (${(e as Error).message})`);
  }

  const synthetic = syntheticSnapshot();

  // Slice the joined series per cycle.
  const cycles: Cycle[] = [];
  for (const meta of CYCLE_META) {
    const startTs = Date.parse(meta.startDate);
    const endTs = meta.endDate ? Date.parse(meta.endDate) : Date.now();
    const startIdx = daily.findIndex((d) => d.ts >= startTs);
    if (startIdx < 0) {
      console.warn(`  cycle ${meta.id}: no data covering ${meta.startDate}; using synthetic`);
      cycles.push(synthetic.cycles.find((c) => c.id === meta.id)!);
      continue;
    }
    const endIdx = (() => {
      const i = daily.findIndex((d) => d.ts >= endTs);
      return i < 0 ? daily.length - 1 : i;
    })();
    const sliced = daily.slice(startIdx, endIdx + 1);
    const syntheticForCycle = synthetic.cycles.find((c) => c.id === meta.id)!;
    const cap = meta.id === 5 ? daysBetween(meta.startDate, Date.now()) : undefined;
    cycles.push(buildCycle(meta.id, sliced, daily, startIdx, syntheticForCycle, cap));
  }

  const todayDayInCycle = daysBetween(HALVINGS[5], Date.now());

  // Realised cap (paid metric) drives MVRV / NUPL / Realised Price. Supply is
  // free and, when present, is real even without realised cap.
  const realisedCapAvailable = daily.some(
    (d) => Number.isFinite(d.realisedCap) && (d.realisedCap as number) > 0,
  );
  const supplyAvailable = daily.some((d) => Number.isFinite(d.supply) && (d.supply as number) > 0);
  return {
    source: {
      mode: realisedCapAvailable ? "mixed" : "live",
      fetchedAt: new Date().toISOString(),
      sources: {
        price: priceSource,
        realizedCap: realisedCapAvailable ? "CoinMetrics community CapRealUSD" : "synthetic fallback",
        supply: supplyAvailable ? "CoinMetrics community SplyCur" : "synthetic fallback",
        mvrv: realisedCapAvailable ? "derived: marketCap / realisedCap" : "synthetic",
        nupl: realisedCapAvailable ? "derived: (marketCap - realisedCap) / marketCap" : "synthetic",
        realizedPrice: realisedCapAvailable ? "derived: realisedCap / supply" : "synthetic",
        mayer: "derived: price / 200d SMA",
        puell: "derived: (reward × 144 × price) / 365d SMA",
        rainbow: "derived: per-cycle band of price vs cycle peak",
        sopr: "modelled — no free public source",
        rhodl: "modelled — no free public source",
        reserveRisk: "modelled — no free public source",
      },
    },
    cycles,
    todayDayInCycle,
  };
}

function serialise(snapshot: Snapshot): string {
  const json = JSON.stringify(snapshot, (_k, v) =>
    typeof v === "number" && Number.isFinite(v) ? Number(v.toFixed(6)) : v,
  );
  return `// AUTO-GENERATED by \`npm run sync\` — do not edit by hand.
// Regenerate with: npm run sync
import type { Snapshot } from "./types";

export const SNAPSHOT: Snapshot = ${json};
`;
}

async function main() {
  const strict = process.argv.includes("--strict");
  try {
    const snapshot = await build();
    await mkdir(dirname(SNAPSHOT_PATH), { recursive: true });
    await writeFile(SNAPSHOT_PATH, serialise(snapshot), "utf8");
    console.log(`\n✓ Wrote ${SNAPSHOT_PATH}`);
    console.log(`  mode: ${snapshot.source.mode}`);
    console.log(`  cycles: ${snapshot.cycles.length}`);
    console.log(`  today day in cycle: ${snapshot.todayDayInCycle}`);
  } catch (e) {
    const msg = (e as Error).message;
    if (strict) {
      console.error("\n✗ Sync failed (--strict):", msg);
      process.exit(1);
    }
    console.warn(`\n! Sync could not reach upstream sources: ${msg}`);
    console.warn("  Snapshot left untouched. App will use whatever snapshot is checked in.");
    console.warn("  (Pass --strict to fail the build on sync errors instead of warning.)");
  }
}

main();
