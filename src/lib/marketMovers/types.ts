// Market Movers — the significance & rarity engine's contract (PR-SB1).
//
// A presentation-agnostic description of "what moved, and how unusual was
// that move for THIS metric". Deliberately reusable: the State of Bitcoin
// page is the first consumer, but the Daily Brief, weekly email, content
// packs and Founder Intelligence must be able to consume the same objects
// without the engine being rewritten. Nothing here formats for display —
// callers own presentation; the engine owns the numbers and the honesty.
//
// Historical context. Not forecasts.

/** How a metric's movement is expressed. Chosen per metric because a
 *  percentage is meaningless or dangerous for several of them:
 *   - "pct"    strictly-positive level series (price, realised price…)
 *   - "points" indices, ratios and anything that can cross zero
 *              (MVRV-Z, NUPL, Fear & Greed, Market Health, drawdown…)
 *   - "usd"    a flow measured in dollars over the period (ETF net flows) */
export type MovementUnit = "pct" | "points" | "usd";

/** How the period's movement is derived.
 *   - "level" current level vs the level `periodDays` ago
 *   - "flow"  the net flow accumulated across the period (there is no
 *             "previous level" — the observation IS the period's total) */
export type MovementKind = "level" | "flow";

export type MetricNature = "observed" | "derived" | "estimated";

/** Calendar days. 7 is the editorial spine everywhere. */
export type MoverPeriod = 1 | 7 | 30;

export type Direction = "up" | "down" | "flat";

/** Presentation-neutral significance bands. No forecast language, ever. */
export type SignificanceBand = "routine" | "notable" | "unusual" | "exceptional";

/** A categorical state change inside the period — always more notable than
 *  its raw size suggests, so it carries a documented significance floor. */
export interface Crossing {
  kind: "band" | "reference" | "phase";
  /** Human-readable, assembled by the engine from real values. */
  label: string;
  from: string;
  to: string;
}

export interface ObservedWindow {
  first: string;
  last: string;
  /** Observations in the metric's own series (not the move distribution). */
  points: number;
  cadenceDays: number;
}

export interface Movement {
  metricId: string;
  label: string;
  /** Short plain-English description of what the metric is. */
  what: string;
  nature: MetricNature;
  period: MoverPeriod;

  /** Latest value, in the metric's own units (never formatted). */
  current: number;
  /** Level `periodDays` ago — null for flow metrics (no prior level). */
  previous: number | null;
  /** For flows: the prior period's net, for a like-for-like comparison. */
  previousPeriodFlow: number | null;

  /** Signed movement in `unit`. For flows this IS the period's net. */
  movement: number;
  unit: MovementUnit;
  kind: MovementKind;
  direction: Direction;
  /** Decimal places the value is meaningful to (presentation hint only). */
  decimals: number;

  /** 0–100 percentile of |movement| within this metric's own distribution
   *  of equivalent-period movements. Null when no rarity claim is allowed. */
  rarityPercentile: number | null;
  /** Ranking score, 0–100. Equals rarityPercentile, raised to the crossing
   *  floor when a categorical crossing occurred. Always present so every
   *  metric can be ranked, even when a rarity CLAIM is not permitted. */
  significance: number;
  band: SignificanceBand;
  /** Observations in the equivalent-period move distribution. */
  observations: number;
  window: ObservedWindow;
  /** False when `observations` is below the floor — the caller must then
   *  print an honest state (see `rarityState`) instead of a rarity claim. */
  rarityClaimAllowed: boolean;
  /** Three distinct states, because "54 valid observations" and "no
   *  comparison possible" are not the same thing and must never read the
   *  same way (founder decision):
   *   · "available"   — at or above the floor; `rarityPercentile` is set.
   *   · "maturing"    — real observations, just not enough yet. Callers
   *                     should say so with the count and window, e.g.
   *                     "Historical comparison still maturing · 54
   *                     equivalent observations since June 2026."
   *   · "unavailable" — no equivalent-period observations exist at all. */
  rarityState: "available" | "maturing" | "unavailable";

  crossing: Crossing | null;
  /** Current band/state label where the metric has one (Fear, Neutral…). */
  state: string | null;

  /** ONE restrained, factual line placing an unusually large short-term
   *  move in its longer context ("Still 16% below 2 Jul."). Never
   *  influences ranking or significance, carries no direction or emphasis,
   *  and must be rendered visually secondary — never a second headline.
   *  Null when no honest context exists. */
  broaderContext: import("./context").BroaderContext | null;

  /** Recent observations for a sparkline, oldest → newest (raw values in
   *  the metric's own units; consumers normalise). Presentation data, never
   *  an input to ranking. */
  spark: number[];

  /** Canonical page for this metric on HalvingLens. */
  href: string;
  /** The date THIS metric was measured to — its own last observation when
   *  that lags the reporting anchor. Consumers must disclose it when it
   *  differs from `MoversResult.asOf`. */
  asOf: string;
}

export interface MoversResult {
  period: MoverPeriod;
  /** The snapshot date every movement is measured to. */
  asOf: string;
  /** Ranked by significance, descending; stable ties. */
  movements: Movement[];
  /** Metrics whose movement did not clear the material threshold. */
  steady: Movement[];
  /** Registered metrics with no usable data for this period. */
  unavailable: Array<{ metricId: string; label: string; reason: string }>;
}
