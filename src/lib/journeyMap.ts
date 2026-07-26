// Continue your journey — the curated next-step routing map (PR137).
//
// The single source of truth for every JourneyNext placement. One primary
// hand-off (a bridge question this page leaves the reader asking, answered by
// the destination) plus at most two quieter alternatives. Curated, not
// generated — the point is one coherent spine, not "related links".
//
// Governance rules (enforced in review, tested where testable):
//   - at most TWO secondary links per page;
//   - no page is the PRIMARY destination of more than two other pages
//     (nothing funnels everything to one place);
//   - pages carrying FlagshipJourney (state-of-bitcoin, accumulation,
//     historical-price-paths) never also get JourneyNext — one next-step
//     system per page;
//   - bridge copy is a question about understanding, never a tease and never
//     a prediction.

export interface JourneyEntry {
  /** The question this page leaves the reader asking — answered by `primary`. */
  bridge: string;
  primary: { href: string; title: string };
  secondary: Array<{ href: string; label: string }>;
}

export const JOURNEY_MAP = {
  "/similar-moments": {
    bridge:
      "You've seen which past moments most resemble today. What actually happened next, from moments like these?",
    primary: { href: "/historical-price-paths", title: "Historical Price Paths" },
    secondary: [
      { href: "/state-of-bitcoin", label: "The State of Bitcoin — the full weekly read" },
      { href: "/research/findings", label: "Original research findings" },
    ],
  },
  "/cycles": {
    bridge:
      "You've compared this cycle's shape with the past. Now watch it play out against previous cycles, week by week.",
    primary: { href: "/replay", title: "Cycle Replay" },
    secondary: [
      { href: "/similar-moments", label: "Similar Moments — which past weeks look like today" },
      { href: "/historical-price-paths", label: "Historical Price Paths" },
    ],
  },
  "/price": {
    bridge:
      "You know where the price sits against its reference prices. What does that level mean in the wider weekly picture?",
    primary: { href: "/state-of-bitcoin", title: "The State of Bitcoin" },
    secondary: [
      { href: "/market-health", label: "Market Health — the composite read" },
      { href: "/cycles", label: "Cycle comparison" },
    ],
  },
} as const satisfies Record<string, JourneyEntry>;

export type JourneyFrom = keyof typeof JOURNEY_MAP;
