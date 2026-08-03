// Presenter running order for "Documenting the Cycle". Pure, static metadata:
// per-section cues (prompts, not scripts), optional bridge lines to speak
// between sections, and rough timing targets for a 5–8 minute episode. Consumed
// only by the presenter HUD — never rendered to normal visitors, and never a
// separate set of facts (the page below is the single source of truth).

export interface PresenterSection {
  id: string; // matches the page's data-sob-section anchor
  title: string;
  cue: string; // a short prompt for what to say — NOT a script
  bridge: string; // optional transition line to the next section
  targetSeconds: number;
}

export const EPISODE_TARGET_LABEL = "5–8 minutes";

export const PRESENTER_RUNNING_ORDER: PresenterSection[] = [
  {
    id: "today",
    title: "The Front Page",
    cue: "Read the verdict, then walk the five questions at a glance — that IS the episode's running order.",
    bridge: "Let's take those one at a time, starting with what actually moved.",
    targetSeconds: 45,
  },
  {
    id: "movers",
    title: "Act 1 — What Changed",
    cue: "Top three movers: the number, how unusual it is for THAT reading, and its broader context. Then what held steady.",
    bridge: "That's what moved. Now what sits underneath it.",
    targetSeconds: 120,
  },
  {
    id: "why",
    title: "Act 2 — Why This Matters",
    cue: "Which of the Four Reference Prices the week moved the market across, and the lead chart. Describe what moved together — never why. Leave rarity to the next act.",
    bridge: "So how unusual is any of this, really?",
    targetSeconds: 90,
  },
  {
    id: "unusual",
    title: "Act 3 — How Unusual Is It",
    cue: "Cycle position, the closest historical match, how prior cycles behaved from here — and whether the cycle read moved at all.",
    bridge: "With that settled, here are the five things worth remembering.",
    targetSeconds: 90,
  },
  {
    id: "matters",
    title: "Act 4 — What to Remember",
    cue: "\"If you only remember five things from this week…\" — walk them in order. The rail on the left tracks where you are.",
    bridge: "Finally, what we'll be checking next week.",
    targetSeconds: 60,
  },
  {
    id: "watching",
    title: "Act 5 — What We're Watching Next",
    cue: "How last week's watch item resolved, the objective thresholds for next week, and close on the verdict you opened with.",
    bridge: "",
    targetSeconds: 60,
  },
];
