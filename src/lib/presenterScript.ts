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
    id: "movers",
    title: "What Changed This Week",
    cue: "Lead with the top-ranked reading — say the number, then how unusual it is for that reading, then its broader context. Work down the top three, then note what held steady.",
    bridge: "Those are this week's moves. Here's the single chart that best captures them.",
    targetSeconds: 150,
  },
  {
    id: "lead-chart",
    title: "The Week's Lead Chart",
    cue: "Talk to the chart — what it shows, why it matters, and the one takeaway.",
    bridge: "That's the visual. The next question — has history seen conditions like these?",
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
