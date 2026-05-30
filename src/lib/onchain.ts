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

// Average LTH-supply change over the `window` days leading into each prior
// cycle high and low — the heart of the "do strong hands sell tops / buy
// bottoms" question.
export function lthAroundExtremes(window = 90): LthExtremes {
  const priors = cyclePeakTroughs().filter((c) => c.id !== 5);
  const highs = priors
    .map((c) => lthPctChangeBefore(c.peakDate, window))
    .filter((x): x is number => x != null);
  const lows = priors
    .map((c) => (c.bottomDate ? lthPctChangeBefore(c.bottomDate, window) : null))
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
