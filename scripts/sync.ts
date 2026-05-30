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
  type SentimentData,
  type EtfData,
  type OnchainData,
  type Snapshot,
} from "../src/lib/data/types";
import { syntheticSnapshot } from "../src/lib/data/synthetic";
// Previously-committed snapshot — used to carry over rate-limited optional data
// (on-chain, ETF) on builds that don't re-fetch them.
import { SNAPSHOT as PREVIOUS_SNAPSHOT } from "../src/lib/data/snapshot";

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

// Crypto Fear & Greed index — alternative.me. Free, keyless, daily history.
// 0 = extreme fear, 100 = extreme greed. limit=0 returns all history (since
// 2018) so the BTC-price overlay spans multiple cycles. We store ts+value only
// (band/classification is derived in the UI from the value).
async function fetchFearGreed(): Promise<SentimentData> {
  const url = "https://api.alternative.me/fng/?limit=0&format=json";
  const data = await fetchJson<{
    data: Array<{ value: string; timestamp: string }>;
  }>(url);
  const points = data.data
    .map((d) => ({
      ts: Math.floor((parseInt(d.timestamp, 10) * 1000) / MS_PER_DAY) * MS_PER_DAY,
      value: parseFloat(d.value),
    }))
    .filter((p) => Number.isFinite(p.ts) && Number.isFinite(p.value))
    .sort((a, b) => a.ts - b.ts);
  return {
    source: "alternative.me Crypto Fear & Greed",
    fetchedAt: new Date().toISOString(),
    points,
  };
}

// US spot BTC ETF flows — SoSoValue Open API (needs SOSOVALUE_API_KEY). Their
// docs block automated reading, so this tries the likely endpoints and parses
// the response flexibly: it identifies the date + daily net-inflow fields,
// computes the cumulative itself, and refuses to return anything unless the
// totals land in a sane USD range — a wrong guess stays "coming soon" rather
// than showing wrong numbers. Verify the figures against SoSoValue's dashboard.
const ETF_NUM = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v.replace(/[, ]/g, "")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

function etfRows(json: unknown): Record<string, unknown>[] {
  const asArr = (x: unknown) => (Array.isArray(x) ? (x as Record<string, unknown>[]) : null);
  if (asArr(json)) return asArr(json)!;
  const d = (json as { data?: unknown })?.data;
  if (asArr(d)) return asArr(d)!;
  const o = d as Record<string, unknown> | undefined;
  for (const k of ["list", "records", "rows", "history", "items", "chart"]) {
    if (o && asArr(o[k])) return asArr(o[k])!;
  }
  return [];
}

function etfDate(r: Record<string, unknown>): string | null {
  for (const k of ["date", "day", "tradeDate", "statisticsDay", "timestamp", "time"]) {
    if (!(k in r)) continue;
    const v = r[k];
    if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v).toISOString().slice(0, 10);
    if (typeof v === "string") {
      const d = new Date(/^\d+$/.test(v) ? Number(v) : v);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

function etfNetFlow(r: Record<string, unknown>): number | null {
  for (const k of ["totalNetInflow", "netInflow", "dailyNetInflow", "netFlow", "inflow", "value"]) {
    if (k in r) {
      const n = ETF_NUM(r[k]);
      if (n != null) return n;
    }
  }
  return null;
}

async function fetchEtfFlows(): Promise<EtfData | null> {
  const key = process.env.SOSOVALUE_API_KEY;
  if (!key) {
    console.log("  ETF: SOSOVALUE_API_KEY not set — skipping (page stays 'coming soon')");
    return null;
  }
  // Confirmed base is https://openapi.sosovalue.com/api/v1/ — the exact path is
  // guessed; the per-candidate logs below reveal which one the key accepts.
  const body = '{"type":"us-btc-spot"}';
  const candidates: Array<{ url: string; body: string }> = [
    { url: "https://openapi.sosovalue.com/api/v1/etf/historicalInflowChart", body },
    { url: "https://openapi.sosovalue.com/openapi/v1/etf/historicalInflowChart", body },
    { url: "https://openapi.sosovalue.com/api/v1/etf/us-btc-spot/historicalInflowChart", body },
    { url: "https://api.sosovalue.xyz/openapi/v2/etf/historicalInflowChart", body },
  ];
  for (const c of candidates) {
    try {
      const res = await fetch(c.url, {
        method: "POST",
        headers: {
          "x-soso-api-key": key,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": UA,
        },
        body: c.body,
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.warn(`  [ETF] ${c.url} → ${res.status} ${res.statusText} ${errBody.slice(0, 160)}`);
        continue;
      }
      const json: unknown = await res.json();
      const rows = etfRows(json);
      if (!rows.length) {
        console.warn(`  ETF ${c.url} → response had no recognisable rows`);
        continue;
      }
      console.log(`  [ETF] sample row from ${c.url}: ${JSON.stringify(rows[0]).slice(0, 280)}`);
      const norm = rows
        .map((r) => ({ date: etfDate(r), netFlow: etfNetFlow(r) }))
        .filter((p): p is { date: string; netFlow: number } => p.date != null && p.netFlow != null)
        .sort((a, b) => (a.date < b.date ? -1 : 1));
      if (norm.length < 30) {
        console.warn(`  ETF ${c.url} → only ${norm.length} parseable rows; skipping`);
        continue;
      }
      let cum = 0;
      const points = norm.map((p) => ({ date: p.date, netFlow: p.netFlow, cumulative: (cum += p.netFlow) }));
      const finalCum = Math.abs(points[points.length - 1].cumulative);
      // Sanity gate: cumulative US BTC-ETF net inflow is tens of billions USD.
      if (finalCum < 1e9 || finalCum > 5e12) {
        console.warn(`  ETF ${c.url} → cumulative ${finalCum.toExponential(2)} outside sane USD range; skipping to avoid wrong units`);
        continue;
      }
      console.log(`  ETF: ${points.length} days, cumulative ≈ $${(finalCum / 1e9).toFixed(1)}B`);
      return { source: "SoSoValue · US spot BTC ETF flows", fetchedAt: new Date().toISOString(), points };
    } catch (e) {
      console.warn(`  [ETF] ${c.url} failed: ${(e as Error).message}`);
    }
  }
  return null;
}

// On-chain series — BGeometrics / bitcoin-data.com (BITCOIN_DATA_API_KEY).
// Fetched only in the daily full sync (FULL_SYNC=1) to respect the free tier's
// ~15 req/day limit; other builds carry over the committed values. Each metric
// returns a dated value series; date + value fields are detected flexibly.
// Slugs confirmed from the BGeometrics endpoint list + a sync run (response
// shape: {d, unixTs, <metricKey>}). Kept to <=8/run for the 8-req/hour limit.
const ONCHAIN_METRICS: Array<{ key: string; slugs: string[]; sane: [number, number] }> = [
  { key: "mvrvZscore", slugs: ["mvrv-zscore"], sane: [-3, 15] },
  { key: "nupl", slugs: ["nupl"], sane: [-0.8, 0.95] },
  { key: "sopr", slugs: ["sopr"], sane: [0.7, 1.6] },
  { key: "realizedPrice", slugs: ["realized-price"], sane: [1, 1e7] },
  { key: "reserveRisk", slugs: ["reserve-risk"], sane: [0, 0.2] },
  { key: "lthSupply", slugs: ["long-term-hodler-supply-btc"], sane: [5e6, 2.05e7] },
  { key: "addresses", slugs: ["active-addresses"], sane: [1e4, 1e8] },
];

const ONCHAIN_DATE_KEYS = ["d", "date", "theDay", "day", "unixTs", "timestamp", "time", "t"];

function onchainDate(r: Record<string, unknown>): string | null {
  for (const k of ONCHAIN_DATE_KEYS) {
    if (!(k in r)) continue;
    const v = r[k];
    if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v).toISOString().slice(0, 10);
    if (typeof v === "string") {
      const d = new Date(/^\d+$/.test(v) ? Number(v) * (v.length <= 10 ? 1000 : 1) : v);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

function onchainValue(r: Record<string, unknown>): number | null {
  for (const [k, v] of Object.entries(r)) {
    if (ONCHAIN_DATE_KEYS.includes(k)) continue;
    const n = ETF_NUM(v);
    if (n != null) return n;
  }
  return null;
}

async function fetchOnchainMetric(
  slug: string,
  key: string | undefined,
): Promise<{ date: string; value: number }[] | null> {
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": UA };
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`https://bitcoin-data.com/v1/${slug}`, { headers });
  if (!res.ok) {
    console.warn(`  [ONCHAIN] ${slug} → ${res.status} ${res.statusText}`);
    return null;
  }
  const json: unknown = await res.json();
  const rows: Record<string, unknown>[] = Array.isArray(json)
    ? (json as Record<string, unknown>[])
    : Array.isArray((json as { data?: unknown })?.data)
      ? (json as { data: Record<string, unknown>[] }).data
      : [];
  if (!rows.length) {
    console.warn(`  [ONCHAIN] ${slug} → no rows`);
    return null;
  }
  console.log(`  [ONCHAIN] ${slug} sample: ${JSON.stringify(rows[rows.length - 1]).slice(0, 160)}`);
  const out = rows
    .map((r) => ({ date: onchainDate(r), value: onchainValue(r) }))
    .filter((p): p is { date: string; value: number } => p.date != null && p.value != null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return out.length ? out : null;
}

async function fetchOnchain(): Promise<OnchainData | null> {
  if (process.env.FULL_SYNC !== "1") {
    console.log("  [ONCHAIN] skipped (FULL_SYNC!=1) — carried over from committed snapshot");
    return null;
  }
  const key = process.env.BITCOIN_DATA_API_KEY;
  const series: Record<string, { date: string; value: number }[]> = {};
  // Fetch series we don't already have first, so the free-tier rate limit can't
  // permanently starve the later metrics (they accumulate across runs via merge).
  const have = new Set(Object.keys(PREVIOUS_SNAPSHOT.onchain?.series ?? {}));
  const ordered = [...ONCHAIN_METRICS].sort(
    (a, b) => (have.has(a.key) ? 1 : 0) - (have.has(b.key) ? 1 : 0),
  );
  for (const m of ordered) {
    let got: { date: string; value: number }[] | null = null;
    for (const slug of m.slugs) {
      try {
        got = await fetchOnchainMetric(slug, key);
      } catch (e) {
        console.warn(`  [ONCHAIN] ${slug} failed: ${(e as Error).message}`);
        got = null;
      }
      if (got && got.length) break;
    }
    if (!got || !got.length) continue;
    const latest = got[got.length - 1].value;
    if (latest < m.sane[0] || latest > m.sane[1]) {
      console.warn(`  [ONCHAIN] ${m.key} latest ${latest} outside sane range [${m.sane}]; skipping`);
      continue;
    }
    series[m.key] = got;
    console.log(`  [ONCHAIN] ${m.key}: ${got.length} points, latest ${latest}`);
  }
  if (!Object.keys(series).length) return null;
  return { source: "BGeometrics · bitcoin-data.com", fetchedAt: new Date().toISOString(), series };
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

  // Market sentiment — Fear & Greed index. Independent of price sources; a
  // failure here must not break the rest of the snapshot.
  console.log("→ Fetching Fear & Greed index…");
  let sentiment: Snapshot["sentiment"] = null;
  try {
    sentiment = await fetchFearGreed();
    console.log(`  got ${sentiment.points.length} daily sentiment points`);
  } catch (e) {
    console.warn(`  Fear & Greed unavailable — sentiment will be omitted. (${(e as Error).message})`);
  }

  console.log("→ Fetching US spot BTC ETF flows (SoSoValue)…");
  let etf: Snapshot["etf"] = null;
  try {
    etf = await fetchEtfFlows();
  } catch (e) {
    console.warn(`  ETF unavailable — flows will be omitted. (${(e as Error).message})`);
  }

  console.log("→ Fetching on-chain series (BGeometrics)…");
  let onchain: Snapshot["onchain"] = null;
  try {
    onchain = await fetchOnchain();
  } catch (e) {
    console.warn(`  On-chain unavailable — will carry over. (${(e as Error).message})`);
  }

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

  // Light up the on-chain metrics for the current cycle by joining real
  // BGeometrics values onto cycle 5's weekly samples (the free tier covers only
  // ~4 years, so we overwrite the current cycle and mark those metrics live;
  // their pages drop the cross-cycle overlay).
  // Merge per-series: keep previously-fetched series and overlay freshly fetched
  // ones, so a rate-limited partial fetch never drops data we already had.
  const mergedSeries = {
    ...(PREVIOUS_SNAPSHOT.onchain?.series ?? {}),
    ...(onchain?.series ?? {}),
  };
  const effectiveOnchain: Snapshot["onchain"] = Object.keys(mergedSeries).length
    ? {
        source: onchain?.source ?? PREVIOUS_SNAPSHOT.onchain?.source ?? "BGeometrics · bitcoin-data.com",
        fetchedAt: onchain?.fetchedAt ?? PREVIOUS_SNAPSHOT.onchain?.fetchedAt ?? new Date().toISOString(),
        series: mergedSeries,
      }
    : null;
  const onchainLive = { mvrv: false, nupl: false, sopr: false, realizedPrice: false, reserveRisk: false };
  if (effectiveOnchain) {
    const cycle5 = cycles.find((c) => c.id === 5);
    if (cycle5) {
      const base = Date.parse(cycle5.halvingDate);
      const join = (seriesKey: string, sampleKey: keyof CycleSample): boolean => {
        const ser = effectiveOnchain.series[seriesKey];
        if (!ser || !ser.length) return false;
        const map = new Map(ser.map((p) => [p.date, p.value]));
        let hit = 0;
        for (const s of cycle5.samples) {
          const iso = new Date(base + s.day * MS_PER_DAY).toISOString().slice(0, 10);
          const v = map.get(iso);
          if (v != null && Number.isFinite(v)) {
            (s as unknown as Record<string, number>)[sampleKey as string] = v;
            hit++;
          }
        }
        return hit > 0;
      };
      onchainLive.mvrv = join("mvrvZscore", "mvrvZ");
      onchainLive.nupl = join("nupl", "nupl");
      onchainLive.sopr = join("sopr", "sopr");
      onchainLive.realizedPrice = join("realizedPrice", "realizedPrice");
      onchainLive.reserveRisk = join("reserveRisk", "reserveRisk");
      console.log(
        `  [ONCHAIN] joined to cycle 5: ${Object.entries(onchainLive).filter(([, v]) => v).map(([k]) => k).join(", ") || "none"}`,
      );
    }
  }
  const BG = "BGeometrics · bitcoin-data.com (current cycle)";

  // Freshest spot price + true 24h/7d change from the daily close series (the
  // per-cycle samples are weekly and can lag a few days).
  const spot = (() => {
    const n = daily.length;
    if (n < 2) return null;
    const last = daily[n - 1];
    const d1 = daily[n - 2];
    const d7 = daily[n - 8];
    if (!(last.price > 0) || !(d1.price > 0)) return null;
    return {
      price: last.price,
      ts: last.ts,
      change24h: (last.price / d1.price - 1) * 100,
      change7d: d7 && d7.price > 0 ? (last.price / d7.price - 1) * 100 : undefined,
    };
  })();

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
        mvrv: onchainLive.mvrv ? BG : realisedCapAvailable ? "derived: marketCap / realisedCap" : "synthetic",
        nupl: onchainLive.nupl ? BG : realisedCapAvailable ? "derived: (marketCap - realisedCap) / marketCap" : "synthetic",
        realizedPrice: onchainLive.realizedPrice ? BG : realisedCapAvailable ? "derived: realisedCap / supply" : "synthetic",
        mayer: "derived: price / 200d SMA",
        puell: "derived: (reward × 144 × price) / 365d SMA",
        rainbow: "derived: per-cycle band of price vs cycle peak",
        sopr: onchainLive.sopr ? BG : "modelled — no free public source",
        rhodl: "modelled — no free public source",
        reserveRisk: onchainLive.reserveRisk ? BG : "modelled — no free public source",
      },
    },
    cycles,
    todayDayInCycle,
    sentiment,
    chain: tip
      ? { blockHeight: tip.height, hashrate: tip.hashrate, fetchedAt: new Date().toISOString() }
      : null,
    spot,
    priceHistory: daily.length
      ? daily.slice(-730).filter((d) => d.price > 0).map((d) => ({ ts: d.ts, price: d.price }))
      : null,
    // Carry over the last good values when a rate-limited source isn't re-fetched.
    etf: etf ?? PREVIOUS_SNAPSHOT.etf ?? null,
    onchain: effectiveOnchain,
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
