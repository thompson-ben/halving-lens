// Sentiment intelligence built on the live, keyless Fear & Greed index. Like
// every other surface, it shows nothing rather than fabricated data: if the
// snapshot has no sentiment yet (not synced), the page renders a connecting
// state.

import { CURRENT_CYCLE, CYCLES, SENTIMENT } from "./btcData";
import type { SentimentPoint } from "./data/types";

const MS_DAY = 86_400_000;

export type SentimentBand = "extreme-fear" | "fear" | "neutral" | "greed" | "extreme-greed";

export interface SentimentBandInfo {
  band: SentimentBand;
  label: string; // friendly, beginner-facing
  tone: "red" | "amber" | "muted" | "green" | "teal";
}

// Standard Fear & Greed palette: fear = red, greed = green. The "euphoria
// tends to appear near tops" caveat is carried in the words, not the colour.
export function bandFor(value: number): SentimentBandInfo {
  if (value < 25) return { band: "extreme-fear", label: "Extreme fear", tone: "red" };
  if (value < 45) return { band: "fear", label: "Fear", tone: "amber" };
  if (value < 55) return { band: "neutral", label: "Neutral", tone: "muted" };
  if (value < 75) return { band: "greed", label: "Greed", tone: "green" };
  return { band: "extreme-greed", label: "Extreme greed", tone: "teal" };
}

export const SENTIMENT_AVAILABLE = !!SENTIMENT && SENTIMENT.points.length > 0;

function points(): SentimentPoint[] {
  return SENTIMENT?.points ?? [];
}

export function currentSentiment(): SentimentPoint | null {
  const p = points();
  return p.length ? p[p.length - 1] : null;
}

// Value roughly `days` ago (nearest point at or before the cutoff).
function valueDaysAgo(days: number): number | null {
  const p = points();
  if (!p.length) return null;
  const cutoff = p[p.length - 1].ts - days * 86_400_000;
  let chosen: SentimentPoint | null = null;
  for (const pt of p) {
    if (pt.ts <= cutoff) chosen = pt;
  }
  return (chosen ?? p[0]).value;
}

export interface SentimentChange {
  delta: number; // current - past
  direction: "rising" | "falling" | "flat";
  days: number;
}

export function sentimentChange(days = 30): SentimentChange | null {
  const cur = currentSentiment();
  const past = valueDaysAgo(days);
  if (!cur || past === null) return null;
  const delta = cur.value - past;
  const direction = delta >= 4 ? "rising" : delta <= -4 ? "falling" : "flat";
  return { delta, direction, days };
}

// Price direction over a comparable window, from the current cycle's weekly
// samples — used to read whether sentiment and price agree or diverge.
function priceDirection(days = 30): "rising" | "falling" | "flat" | null {
  const s = CURRENT_CYCLE.samples;
  if (s.length < 2) return null;
  const last = s[s.length - 1];
  const cutoffDay = last.day - days;
  let prev = s[0];
  for (const pt of s) {
    if (pt.day <= cutoffDay) prev = pt;
  }
  const pct = (last.price / prev.price - 1) * 100;
  return pct >= 3 ? "rising" : pct <= -3 ? "falling" : "flat";
}

export interface SentimentRead {
  value: number;
  band: SentimentBandInfo;
  change: SentimentChange | null;
  alignment: "aligned" | "diverging" | "mixed" | null;
  summary: string;
}

export function sentimentRead(): SentimentRead | null {
  const cur = currentSentiment();
  if (!cur) return null;
  const band = bandFor(cur.value);
  const change = sentimentChange(30);
  const priceDir = priceDirection(30);

  let alignment: SentimentRead["alignment"] = null;
  if (change && priceDir && change.direction !== "flat" && priceDir !== "flat") {
    alignment = change.direction === priceDir ? "aligned" : "diverging";
  } else if (change && priceDir) {
    alignment = "mixed";
  }

  // Plain-English, careful framing.
  const moodPhrase =
    band.band === "extreme-greed"
      ? "Historically, euphoric sentiment combined with overheated price has appeared closer to cycle tops."
      : band.band === "extreme-fear"
        ? "Historically, extreme fear has appeared closer to cycle lows."
        : "";

  const trendPhrase = change
    ? change.direction === "flat"
      ? "broadly steady over the past month"
      : `${change.direction} over the past month`
    : "";

  const alignPhrase =
    alignment === "aligned"
      ? "Sentiment and price are moving together."
      : alignment === "diverging"
        ? "Sentiment and price are diverging — worth watching."
        : "";

  const summary = [
    `Sentiment is ${band.label.toLowerCase()}${trendPhrase ? `, ${trendPhrase}` : ""}.`,
    alignPhrase,
    moodPhrase,
  ]
    .filter(Boolean)
    .join(" ");

  return { value: cur.value, band, change, alignment, summary };
}

// ---- Fear & Greed vs price -------------------------------------------------
// A dated BTC price series, reconstructed from every cycle's day-indexed
// samples (weekly), used to overlay price on the sentiment timeline and to
// measure forward returns by sentiment band.

interface PricePoint {
  ts: number;
  price: number;
}

function datedPrices(): PricePoint[] {
  const out: PricePoint[] = [];
  for (const c of CYCLES) {
    const base = new Date(c.halvingDate).getTime();
    for (const s of c.samples) {
      if (s.price > 0) out.push({ ts: base + s.day * MS_DAY, price: s.price });
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}

// Linearly interpolated price at a timestamp. clamp=false returns null when ts
// falls outside the data range (used for forward-return windows).
function priceAt(prices: PricePoint[], ts: number, clamp: boolean): number | null {
  if (!prices.length) return null;
  if (ts <= prices[0].ts) return clamp ? prices[0].price : null;
  const last = prices[prices.length - 1];
  if (ts >= last.ts) return clamp ? last.price : null;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i].ts >= ts) {
      const a = prices[i - 1];
      const b = prices[i];
      const f = (ts - a.ts) / (b.ts - a.ts || 1);
      return a.price + (b.price - a.price) * f;
    }
  }
  return last.price;
}

export interface PricedSentimentPoint {
  ts: number;
  value: number;
  price: number;
}

export function pricedSentimentSeries(): PricedSentimentPoint[] {
  const prices = datedPrices();
  if (!prices.length) return [];
  const out: PricedSentimentPoint[] = [];
  for (const p of points()) {
    const price = priceAt(prices, p.ts, true);
    if (price != null && price > 0) out.push({ ts: p.ts, value: p.value, price });
  }
  return out;
}

export interface BandReturn {
  band: SentimentBand;
  label: string;
  tone: SentimentBandInfo["tone"];
  count: number;
  avgReturn: number; // mean % change over the horizon
}

// For every historical day, the average forward BTC return `horizonDays` later,
// grouped by the sentiment band that day fell in. This is the honest answer to
// "did buying fear actually pay off?" — descriptive history, not a strategy.
export function forwardReturnByBand(horizonDays = 90): BandReturn[] {
  const prices = datedPrices();
  const pts = points();
  if (prices.length < 2 || !pts.length) return [];
  const lastTs = prices[prices.length - 1].ts;
  const acc = new Map<
    SentimentBand,
    { label: string; tone: SentimentBandInfo["tone"]; sum: number; n: number }
  >();
  for (const p of pts) {
    const fwd = p.ts + horizonDays * MS_DAY;
    if (fwd > lastTs) continue;
    const p0 = priceAt(prices, p.ts, false);
    const p1 = priceAt(prices, fwd, false);
    if (p0 == null || p1 == null || p0 <= 0) continue;
    const info = bandFor(p.value);
    const cur =
      acc.get(info.band) ?? { label: info.label, tone: info.tone, sum: 0, n: 0 };
    cur.sum += (p1 / p0 - 1) * 100;
    cur.n += 1;
    acc.set(info.band, cur);
  }
  const order: SentimentBand[] = ["extreme-fear", "fear", "neutral", "greed", "extreme-greed"];
  return order
    .filter((b) => acc.has(b))
    .map((b) => {
      const v = acc.get(b)!;
      return { band: b, label: v.label, tone: v.tone, count: v.n, avgReturn: v.sum / v.n };
    });
}

export const FORWARD_HORIZON_DAYS = 90;
