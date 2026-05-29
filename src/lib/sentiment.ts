// Sentiment intelligence built on the live, keyless Fear & Greed index. Like
// every other surface, it shows nothing rather than fabricated data: if the
// snapshot has no sentiment yet (not synced), the page renders a connecting
// state.

import { CURRENT_CYCLE, SENTIMENT } from "./btcData";
import type { SentimentPoint } from "./data/types";

export type SentimentBand = "extreme-fear" | "fear" | "neutral" | "greed" | "extreme-greed";

export interface SentimentBandInfo {
  band: SentimentBand;
  label: string; // friendly, beginner-facing
  tone: "red" | "amber" | "muted" | "green" | "teal";
}

// Coloured by cycle risk (consistent with the rest of the app): low values
// (fear) have historically been opportunity/cool; high values (euphoria) have
// been risk/hot → red.
export function bandFor(value: number): SentimentBandInfo {
  if (value < 25) return { band: "extreme-fear", label: "Extreme fear", tone: "teal" };
  if (value < 45) return { band: "fear", label: "Fear", tone: "green" };
  if (value < 55) return { band: "neutral", label: "Neutral", tone: "muted" };
  if (value < 75) return { band: "greed", label: "Optimistic", tone: "amber" };
  return { band: "extreme-greed", label: "Euphoric", tone: "red" };
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
