// Editorial rotation for the Daily Research Brief. Gives each weekday its own
// feature so the publication feels different every day — and so the Signature
// Read hero leans into that feature's story. Deterministic from the date, so the
// email copy and the hero image always agree for a given day.

import { selectHistoricalNarrative } from "./contentCards";

export type FeatureKey = "weekahead" | "position" | "similar" | "drawdown" | "etf" | "structure" | "essay";
export type HeroNarrative = "similar" | "position" | "drawdown" | "fear_greed";

export interface EditorialFeature {
  key: FeatureKey;
  day: string; // "Tuesday"
  title: string; // "Similar Moments"
}

const WEEK: { key: FeatureKey; title: string }[] = [
  { key: "weekahead", title: "Week Ahead" }, // 0 Sun
  { key: "position", title: "Cycle Position Deep Dive" }, // 1 Mon
  { key: "similar", title: "Similar Moments" }, // 2 Tue
  { key: "drawdown", title: "Historical Drawdowns" }, // 3 Wed
  { key: "etf", title: "ETF Insight" }, // 4 Thu
  { key: "structure", title: "Market Structure" }, // 5 Fri
  { key: "essay", title: "Analyst Essay" }, // 6 Sat
];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function editorialFeature(): EditorialFeature {
  const d = new Date().getUTCDay();
  return { day: DAY_NAMES[d], ...WEEK[d] };
}

// Which Signature Read hero to render. The weekday feature leads when it has a
// dedicated visual; otherwise we fall back to the day's strongest live narrative.
export function featureHeroNarrative(): HeroNarrative {
  const f = editorialFeature().key;
  if (f === "similar") return "similar";
  if (f === "drawdown") return "drawdown";
  if (f === "position") return "position";
  // etf / structure / essay / weekahead → strongest live story.
  const n = selectHistoricalNarrative().narrative;
  if (n === "similar" || n === "drawdown" || n === "fear_greed" || n === "position") return n;
  return "position";
}
