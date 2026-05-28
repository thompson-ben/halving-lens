#!/usr/bin/env tsx
/**
 * Fetches live Bitcoin cycle data from public sources and writes a typed
 * snapshot to `src/lib/data/snapshot.ts`. Existing snapshot is overwritten.
 *
 * Run:    npm run sync
 * Deploy: npm run sync && npm run build   (Vercel build command)
 *
 * Sources
 * - CoinGecko  /coins/bitcoin/market_chart   — daily price (USD), full history
 * - CoinMetrics community                    — realised cap, circulating supply
 * - mempool.space                            — current block height + hash rate
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

async function fetchJson<T>(url: string, retries = 2): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "halving.lens-sync/1" },
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
      const res = await fetch(url, { headers: { "User-Agent": "halving.lens-sync/1" } });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

// CoinGecko — full daily BTC price history (USD).
async function fetchCoinGecko(): Promise<Array<{ ts: number; price: number; marketCap: number }>> {
  const url =
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=max&interval=daily";
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

// CoinMetrics community — daily realised cap (USD) and circulating supply for BTC.
// Format is CSV from their assets endpoint; we parse columns we need.
async function fetchCoinMetrics(): Promise<Array<{ ts: number; realisedCap: number; supply: number }>> {
  const url =
    "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=CapRealUSD,SplyCur&frequency=1d&format=json&page_size=10000";
  // CoinMetrics paginates — walk pages.
  let next: string | undefined = url;
  const out: Array<{ ts: number; realisedCap: number; supply: number }> = [];
  let safety = 0;
  while (next && safety++ < 20) {
    const page: {
      data: Array<{ time: string; CapRealUSD?: string; SplyCur?: string }>;
      next_page_url?: string;
    } = await fetchJson(next);
    for (const row of page.data) {
      const ts = Date.parse(row.time);
      const realisedCap = row.CapRealUSD ? parseFloat(row.CapRealUSD) : NaN;
      const supply = row.SplyCur ? parseFloat(row.SplyCur) : NaN;
      if (Number.isFinite(ts) && Number.isFinite(realisedCap) && Number.isFinite(supply)) {
        out.push({ ts: Math.floor(ts / MS_PER_DAY) * MS_PER_DAY, realisedCap, supply });
      }
    }
    next = page.next_page_url;
  }
  return out;
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

// Join price + on-chain into a unified daily series.
function joinDaily(
  prices: Array<{ ts: number; price: number; marketCap: number }>,
  chain: Array<{ ts: number; realisedCap: number; supply: number }>,
): DailyPoint[] {
  const chainByTs = new Map(chain.map((c) => [c.ts, c]));
  return prices.map((p) => {
    const c = chainByTs.get(p.ts);
    return {
      ts: p.ts,
      price: p.price,
      marketCap: p.marketCap,
      realisedCap: c?.realisedCap,
      supply: c?.supply,
    };
  });
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
  console.log("→ Fetching CoinGecko price history…");
  const prices = await fetchCoinGecko();
  console.log(`  got ${prices.length} daily price points (from ${new Date(prices[0].ts).toISOString().slice(0, 10)})`);

  console.log("→ Fetching CoinMetrics realised cap + supply…");
  let chain: Array<{ ts: number; realisedCap: number; supply: number }> = [];
  try {
    chain = await fetchCoinMetrics();
    console.log(`  got ${chain.length} daily chain rows`);
  } catch (e) {
    console.warn(`  CoinMetrics unavailable — derived on-chain metrics will fall back. (${(e as Error).message})`);
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
  const daily = joinDaily(prices, chain);

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

  const onchainAvailable = chain.length > 0;
  return {
    source: {
      mode: onchainAvailable ? "mixed" : "live",
      fetchedAt: new Date().toISOString(),
      sources: {
        price: "CoinGecko /coins/bitcoin/market_chart",
        realizedCap: onchainAvailable ? "CoinMetrics community CapRealUSD" : "synthetic fallback",
        supply: onchainAvailable ? "CoinMetrics community SplyCur" : "synthetic fallback",
        mvrv: onchainAvailable ? "derived: marketCap / realisedCap" : "synthetic",
        nupl: onchainAvailable ? "derived: (marketCap - realisedCap) / marketCap" : "synthetic",
        realizedPrice: onchainAvailable ? "derived: realisedCap / supply" : "synthetic",
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
