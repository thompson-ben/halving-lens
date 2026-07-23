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
    title: "State of Bitcoin Today",
    cue: "Open with where Bitcoin stands right now — price, cycle day, the current chapter.",
    bridge: "That's where Bitcoin stands today. Now let's look at how the last seven days brought us here.",
    targetSeconds: 45,
  },
  {
    id: "week-story",
    title: "The Story of the Last Seven Days",
    cue: "Lead with the week's biggest measurable change, then the one-line story tying the moves together.",
    bridge: "Those are the headline moves. Let's compare them directly with this time last week.",
    targetSeconds: 75,
  },
  {
    id: "since-last-week",
    title: "Since Last Week",
    cue: "Walk the then-vs-now readings, then hold last week's watch item to account.",
    bridge: "That's what changed. Here's the single chart that best captures it.",
    targetSeconds: 75,
  },
  {
    id: "lead-chart",
    title: "The Week's Lead Chart",
    cue: "Talk to the chart — what it shows, why it matters, and the one takeaway.",
    bridge: "That's the visual. Now the full evidence behind it.",
    targetSeconds: 55,
  },
  {
    id: "evidence",
    title: "Evidence Sweep",
    cue: "Hit the biggest mover first. Explain why the unchanged readings matter too.",
    bridge: "Those are this week's readings. The next question — has history seen conditions like these?",
    targetSeconds: 55,
  },
  {
    id: "history",
    title: "Historical Context",
    cue: "Show the closest historical match and how prior cycles behaved from this point.",
    bridge: "History rhymes, but nothing changed structurally this week. So — did the thesis move?",
    targetSeconds: 70,
  },
  {
    id: "cycle-status",
    title: "What Did Not Change",
    cue: "State plainly whether the cycle thesis changed. Most weeks, it didn't — and that's useful.",
    bridge: "With the thesis settled, here's what we'll be checking next week.",
    targetSeconds: 40,
  },
  {
    id: "watching",
    title: "What We're Watching Next",
    cue: "Give the objective thresholds — not forecasts — we'll return to next week.",
    bridge: "Let's bring it together.",
    targetSeconds: 40,
  },
  {
    id: "conclusion",
    title: "Weekly Conclusion",
    cue: "One-line verdict, the key signal to watch, and the next-week hook.",
    bridge: "",
    targetSeconds: 35,
  },
];
