// This Week in Five — the talking-point contract (SoB 2.0, PR-SB3).
//
// Canonical content objects, not a component's internal state. The Act 0
// agenda rail and the Act 4 expansion are two PRESENTATIONS of the same
// five objects; Presenter Mode, the weekly email, YouTube notes and social
// consume the same contract without the engine being rewritten.
//
// The engine selects the five most important things to UNDERSTAND this week
// — not the five largest metric movements. Editorial priority tiers and a
// diversity invariant enforce that.
//
// Historical context. Not forecasts.

/** Editorial priority. Tier A leads; B changes interpretation; C carries
 *  the series' continuity. Selection prefers A, but never at the cost of
 *  filling all five slots from one family (see `topic`). */
export type PointTier = "A" | "B" | "C";

/** The candidate rule families, in the founder-approved hierarchy. */
export type PointRule =
  // Tier A — major market developments
  | "largest-rise"
  | "largest-fall"
  | "most-unusual"
  | "band-crossing"
  | "reference-crossover"
  // Tier B — context that changes interpretation
  | "divergence"
  | "cycle-milestone"
  | "seasonality"
  | "approaching-extreme"
  // Tier C — narrative continuity
  | "accountability"
  | "streak"
  | "stability";

/** The underlying QUESTION a point answers. Two points must not share one
 *  unless there is genuinely no stronger alternative — this is what stops
 *  five metric movements displacing a cycle milestone or a seasonality
 *  insight. */
export type PointTopic =
  | "movement"
  | "positioning"
  | "cycle"
  | "seasonality"
  | "flows"
  | "sentiment"
  | "continuity";

/** How this point relates to last week's edition, where knowable. */
export type PointState = "new" | "continuing" | "eased" | "escalated" | "stable";

export interface TalkingPoint {
  id: string;
  rule: PointRule;
  tier: PointTier;
  topic: PointTopic;
  /** 1-based, the order the episode should follow. */
  rank: number;
  /** The agenda line — short enough for the rail and for a spoken cue. */
  headline: string;
  /** One concise paragraph for the Act 4 expansion. Never a second set of
   *  conclusions: it expands the same fact the headline states. */
  expanded: string;
  /** Metrics this point is about — used for de-duplication and analytics. */
  metricIds: string[];
  /** Where the reader (or presenter) should go to see the evidence. */
  href: string;
  /** In-page anchor of the act that expands it. */
  anchor: string;
  /** Selection score within its tier; higher wins. Never rendered. */
  score: number;
  /** Evidence, where the point makes a historical claim at all. */
  evidence: { observations: number; window: string } | null;
  state: PointState;
}

export interface WeekInFive {
  asOf: string;
  points: TalkingPoint[];
  /** True when no reading moved materially — the page should say so
   *  confidently rather than manufacture five dramatic headlines. */
  quietWeek: boolean;
  /** How many candidates were generated before selection (diagnostics). */
  candidatesConsidered: number;
}
