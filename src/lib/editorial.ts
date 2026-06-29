// Editorial rotation for the Daily Research Brief. Gives each weekday its own
// feature so the publication feels different every day — and so the Signature
// Read hero leans into that feature's story. Deterministic from the date, so the
// email copy and the hero image always agree for a given day.

import { selectHistoricalNarrative } from "./contentCards";
import { briefDate } from "./briefArchive";

export type FeatureKey =
  | "weekahead"
  | "market_reset"
  | "similar"
  | "etf"
  | "historical"
  | "weekly_close"
  | "long_view";
export type HeroNarrative = "similar" | "position" | "drawdown" | "fear_greed";

export interface EditorialFeature {
  key: FeatureKey;
  day: string; // "Tuesday"
  title: string; // "Similar Moments"
}

// The editorial calendar — one defining feature per day of the week.
const WEEK: { key: FeatureKey; title: string }[] = [
  { key: "weekahead", title: "Week Ahead" }, // 0 Sun
  { key: "market_reset", title: "Market Reset" }, // 1 Mon
  { key: "similar", title: "Similar Moments" }, // 2 Tue
  { key: "etf", title: "ETF Watch" }, // 3 Wed
  { key: "historical", title: "Historical Context" }, // 4 Thu
  { key: "weekly_close", title: "Weekly Close" }, // 5 Fri
  { key: "long_view", title: "Long View" }, // 6 Sat
];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function editorialFeature(): EditorialFeature {
  const d = briefDate().getUTCDay();
  return { day: DAY_NAMES[d], ...WEEK[d] };
}

// A growing edition number, so each email feels like part of an expanding
// publication ("Edition #392"). Counted in whole UTC days from launch.
const LAUNCH = Date.UTC(2025, 5, 1); // 1 Jun 2025
export function editionNumber(): number {
  const today = briefDate();
  const days = Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - LAUNCH) / 86_400_000);
  return Math.max(1, days + 1);
}

// Which Signature Read hero to render. The weekday feature leads when it has a
// dedicated visual; otherwise we fall back to the day's strongest live narrative.
export function featureHeroNarrative(): HeroNarrative {
  const f = editorialFeature().key;
  if (f === "similar") return "similar";
  if (f === "long_view") return "position"; // the long arc — accumulation timeline
  if (f === "market_reset") return "drawdown"; // "is this drop normal?" recalibration
  // etf / historical / weekly_close / weekahead → strongest live story.
  const n = selectHistoricalNarrative().narrative;
  if (n === "similar" || n === "drawdown" || n === "fear_greed" || n === "position") return n;
  return "position";
}
