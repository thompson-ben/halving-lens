// Chart of the Week — the "which single chart is most worth looking at?" pick.
//
// This is now a thin adapter over the Editorial Story Engine (storyEngine.ts).
// The engine ranks every metric's story by editorial importance, applies
// history-aware diversity and picks a dynamic headline; this module exposes that
// decision in the small, stable shape the rest of the site already consumes
// (the State of Bitcoin page and the episode-brief generator). The founder can
// still pin a chart with CHART_OF_WEEK_OVERRIDE — that override now lives in the
// engine. Everything stays deterministic and framed as historical context.

import type { CardId } from "./contentCards";
import { storyEngine, type RecentPost } from "./storyEngine";

export interface ChartOfWeekPick {
  key: string; // the winning story's key (also used as an analytics label)
  chartCard: CardId; // the chart-rendering card this pick leads with
  title: string; // editorial headline
  why: string[]; // 2–3 reasons this is the chart
  context: string; // one paragraph of historical context
  takeaway: string; // one-line "so what", no prediction
  link: string; // the site page this chart lives on (path, no host)
  score: number; // 0..1 selection score (shown in the studio for transparency)
  overridden: boolean; // true when pinned via CHART_OF_WEEK_OVERRIDE
}

// Deterministic given the data (+ optional post history): same snapshot → same
// pick, so the image route, the studio and the site always agree.
export function selectChartOfWeek(recentPosts?: RecentPost[]): ChartOfWeekPick {
  const s = storyEngine({ recentPosts }).top;
  return {
    key: s.key,
    chartCard: s.heroCard,
    title: s.headline,
    why: s.why,
    context: s.context,
    takeaway: s.takeaway,
    link: s.link,
    score: s.score,
    overridden: s.overridden,
  };
}
