// On-chain intelligence built on BGeometrics data, focused on the question
// asked: how do long-term holders (a proxy for "strong hands" / whales) move
// relative to cycle highs and lows. Like every surface, it shows nothing rather
// than fabricated data until the series are synced.

import { ONCHAIN } from "./btcData";
import { priceSeries } from "./btcPrice";
import { cyclePeakTroughs } from "./cycleTiming";
import type { OnchainPoint } from "./data/types";

const MS_DAY = 86_400_000;

export const ONCHAIN_SOURCE = ONCHAIN?.source ?? null;
export const ONCHAIN_UPDATED = ONCHAIN?.fetchedAt ?? null;
export const ONCHAIN_ANY = !!ONCHAIN && Object.keys(ONCHAIN?.series ?? {}).length > 0;

export function series(key: string): OnchainPoint[] {
  return ONCHAIN?.series?.[key] ?? [];
}

export function currentValue(key: string): number | null {
  const s = series(key);
  return s.length ? s[s.length - 1].value : null;
}

export function lthSeries(): OnchainPoint[] {
  return ONCHAIN?.series?.lthSupply ?? [];
}

export const LTH_AVAILABLE = lthSeries().length > 0;

const PRICES = priceSeries("All"); // dated weekly price series, full history

function priceAt(ts: number): number | null {
  if (!PRICES.length) return null;
  if (ts <= PRICES[0].ts) return PRICES[0].price;
  const last = PRICES[PRICES.length - 1];
  if (ts >= last.ts) return last.price;
  for (let i = 1; i < PRICES.length; i++) {
    if (PRICES[i].ts >= ts) {
      const a = PRICES[i - 1];
      const b = PRICES[i];
      const f = (ts - a.ts) / (b.ts - a.ts || 1);
      return a.price + (b.price - a.price) * f;
    }
  }
  return last.price;
}

export interface LthPoint {
  ts: number;
  lth: number;
  price: number;
}

export function lthVsPrice(): LthPoint[] {
  const out: LthPoint[] = [];
  for (const p of lthSeries()) {
    const ts = new Date(p.date).getTime();
    const price = priceAt(ts);
    if (price != null && price > 0 && Number.isFinite(p.value)) out.push({ ts, lth: p.value, price });
  }
  return out;
}

// Cycle high/low markers that fall within the LTH data range.
export interface LthMarker {
  ts: number;
  type: "high" | "low";
}

export function lthMarkers(): LthMarker[] {
  const s = lthVsPrice();
  if (!s.length) return [];
  const lo = s[0].ts;
  const hi = s[s.length - 1].ts;
  const out: LthMarker[] = [];
  for (const c of cyclePeakTroughs()) {
    const peakTs = new Date(c.peakDate).getTime();
    if (peakTs >= lo && peakTs <= hi) out.push({ ts: peakTs, type: "high" });
    if (c.bottomDate) {
      const bTs = new Date(c.bottomDate).getTime();
      if (bTs >= lo && bTs <= hi) out.push({ ts: bTs, type: "low" });
    }
  }
  return out;
}

function lthAt(ts: number): number | null {
  const s = lthSeries();
  if (!s.length) return null;
  let best = s[0];
  let bestDiff = Math.abs(new Date(best.date).getTime() - ts);
  for (const p of s) {
    const diff = Math.abs(new Date(p.date).getTime() - ts);
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best.value;
}

function lthPctChangeBefore(dateIso: string, days: number): number | null {
  const end = new Date(dateIso).getTime();
  const a = lthAt(end - days * MS_DAY);
  const b = lthAt(end);
  if (a == null || b == null || a <= 0) return null;
  return (b / a - 1) * 100;
}

export interface LthExtremes {
  window: number;
  beforeHighsAvg: number | null;
  beforeLowsAvg: number | null;
  highsCount: number;
  lowsCount: number;
}

// Average LTH-supply change over the `window` days leading into each cycle high
// and low — but only for extremes the (~4-year) data window actually covers, so
// we never average against clamped/missing history.
export function lthAroundExtremes(window = 90): LthExtremes {
  const s = lthSeries();
  if (s.length < window) {
    return { window, beforeHighsAvg: null, beforeLowsAvg: null, highsCount: 0, lowsCount: 0 };
  }
  const lo = new Date(s[0].date).getTime();
  const hi = new Date(s[s.length - 1].date).getTime();
  const covered = (iso: string) => {
    const t = new Date(iso).getTime();
    return t - window * MS_DAY >= lo && t <= hi;
  };
  const all = cyclePeakTroughs();
  const highs = all
    .filter((c) => covered(c.peakDate))
    .map((c) => lthPctChangeBefore(c.peakDate, window))
    .filter((x): x is number => x != null);
  const lows = all
    .filter((c) => c.bottomDate != null && covered(c.bottomDate))
    .map((c) => lthPctChangeBefore(c.bottomDate as string, window))
    .filter((x): x is number => x != null);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  return {
    window,
    beforeHighsAvg: avg(highs),
    beforeLowsAvg: avg(lows),
    highsCount: highs.length,
    lowsCount: lows.length,
  };
}

export interface LthRead {
  current: number;
  pct90: number | null;
  trend: "accumulating" | "distributing" | "flat";
  summary: string;
}

export function lthRead(): LthRead | null {
  const s = lthSeries();
  if (!s.length) return null;
  const current = s[s.length - 1].value;
  const pct90 = lthPctChangeBefore(s[s.length - 1].date, 90);
  const trend = pct90 == null ? "flat" : pct90 > 0.5 ? "accumulating" : pct90 < -0.5 ? "distributing" : "flat";
  const trendWord = trend === "flat" ? "holding broadly steady" : trend;
  const summary =
    `Long-term holders — coins unmoved for 155+ days, the market's strongest hands — are currently ${trendWord}. ` +
    `Historically this cohort has accumulated through bear-market lows and distributed into cycle tops, selling to new buyers as price runs hot. ` +
    `It's a behavioural pattern from a few cycles, not a forecast.`;
  return { current, pct90, trend, summary };
}

// ── Adoption (address growth) ───────────────────────────────────────────────

export function addressSeries(): OnchainPoint[] {
  return ONCHAIN?.series?.addresses ?? [];
}

export const ADOPTION_AVAILABLE = addressSeries().length > 0;

function nearestValue(pts: OnchainPoint[], ts: number): number | null {
  if (!pts.length) return null;
  let best = pts[0];
  let bestDiff = Math.abs(new Date(best.date).getTime() - ts);
  for (const p of pts) {
    const diff = Math.abs(new Date(p.date).getTime() - ts);
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best.value;
}

export interface AdoptionPoint {
  ts: number;
  addr: number;
  price: number;
}

export function adoptionVsPrice(): AdoptionPoint[] {
  const out: AdoptionPoint[] = [];
  for (const p of addressSeries()) {
    const ts = new Date(p.date).getTime();
    const price = priceAt(ts);
    if (price != null && price > 0 && Number.isFinite(p.value)) out.push({ ts, addr: p.value, price });
  }
  return out;
}

export interface AdoptionRead {
  current: number;
  yoyPct: number | null;
  cagr: number | null; // annualised growth over the full available window
  projOneYear: number | null; // naive projection at the current annual pace
  summary: string;
}

export function adoptionRead(): AdoptionRead | null {
  const s = addressSeries();
  if (s.length < 30) return null;
  const last = s[s.length - 1];
  const current = last.value;
  const endTs = new Date(last.date).getTime();

  const yearAgo = nearestValue(s, endTs - 365 * MS_DAY);
  const yoyPct = yearAgo && yearAgo > 0 ? (current / yearAgo - 1) * 100 : null;

  const first = s[0];
  const years = (endTs - new Date(first.date).getTime()) / (365 * MS_DAY);
  const cagr = first.value > 0 && years > 0.5 ? (Math.pow(current / first.value, 1 / years) - 1) * 100 : null;

  const projOneYear = yoyPct != null ? current * (1 + yoyPct / 100) : null;

  const growthPhrase =
    yoyPct != null ? ` Over the past year it's ${yoyPct >= 0 ? "up" : "down"} ${Math.abs(yoyPct).toFixed(1)}%.` : "";
  const summary =
    `Active addresses count the wallets transacting each day — a read on real network usage. It tends to climb over multi-year horizons as adoption grows, though it ebbs and flows with each cycle rather than rising in a straight line.${growthPhrase} ` +
    `Any projection just extends the recent pace, which it may not hold — a trend line, not a forecast.`;

  return { current, yoyPct, cagr, projOneYear, summary };
}
