// Presenter running order for "Documenting the Cycle". Pure, static metadata:
// per-section cues (prompts, not scripts) and rough timing targets for a
// 5–8 minute episode. The spoken transition lines are NOT here — they are the
// weekly briefing model's bridges, the same lines printed on the page, joined
// in server-side (presenterEpisode.ts). This module stays free of data
// imports so the client HUD can consume it without pulling the data layer.

export interface PresenterSection {
  id: string; // matches the page's data-sob-section anchor
  title: string;
  cue: string; // a short prompt for what to say — NOT a script
  targetSeconds: number;
}

export const EPISODE_TARGET_LABEL = "5–8 minutes";

export const PRESENTER_RUNNING_ORDER: PresenterSection[] = [
  {
    id: "today",
    title: "The Front Page",
    cue: "Read the verdict, then walk the five questions at a glance — that IS the episode's running order.",
    targetSeconds: 45,
  },
  {
    id: "movers",
    title: "Act 1 — What Changed",
    cue: "Top three movers: the number, how unusual it is for THAT reading, and its broader context. Then what held steady.",
    targetSeconds: 120,
  },
  {
    id: "why",
    title: "Act 2 — Why This Matters",
    cue: "Which of the Four Reference Prices the week moved the market across, and the lead chart. Describe what moved together — never why. Leave rarity to the next act.",
    targetSeconds: 90,
  },
  {
    id: "unusual",
    title: "Act 3 — How Unusual Is It",
    cue: "Cycle position, the closest historical match, how prior cycles behaved from here — and whether the cycle read moved at all.",
    targetSeconds: 90,
  },
  {
    id: "matters",
    title: "Act 4 — What to Remember",
    cue: "\"If you only remember five things from this week…\" — walk them in order. The rail on the left tracks where you are.",
    targetSeconds: 60,
  },
  {
    id: "watching",
    title: "Act 5 — What We're Watching Next",
    cue: "How last week's watch item resolved, the objective thresholds for next week, and close on the verdict you opened with.",
    targetSeconds: 60,
  },
];
