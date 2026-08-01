// Bitcoin Questions — Halving. Founder-reviewed editorial content; every
// wording change here is an editorial revision and must bump `revised`.

import type { QuestionEntry } from "../types";

export const HALVING_QUESTIONS: QuestionEntry[] = [
  {
    slug: "what-happens-after-a-bitcoin-halving",
    question: "What Happens After a Bitcoin Halving?",
    category: "Halving",
    audience: "beginner",
    tier: 1,
    description:
      "The mechanics, and the measured record: what Bitcoin's price actually did in the months and years after each of its halvings.",
    shortAnswer: [
      "Each halving cuts the reward for mining a new block in half, roughly every four years — slowing the pace at which new bitcoin is created. The halving changes Bitcoin's issuance schedule immediately, but the historical price effects cannot be isolated to the event day itself. The larger moves in the record developed over the months that followed — the same direction after all four halvings so far, with wildly different magnitude, and smaller each time.",
      "In the year after each halving, price rose {{sc:post-halving-year}}. Today is day {{a:cycle.day}} of cycle {{a:cycle.n}}, which began at the {{a:halving.lastLabel}} halving; the next is due around {{a:halving.nextLabel}}. The modules below place this cycle against the same stage of the previous three.",
    ],
    history: [
      {
        heading: "The mechanics",
        body: [
          "{{sc:halving-mechanics}} Halvings continue until the supply cap of 21 million bitcoin is fully issued. Because the schedule is public and predictable, the reduction in issuance is known in advance. The event still changes the flow of new supply, but the historical record does not establish a simple same-day price effect.",
        ],
      },
      {
        heading: "The record after each halving",
        body: [
          "New highs took time: {{sc:first-new-high}}",
          "The full cycle advances measured {{sc:gain-to-peaks}}, and the highest close of each cycle came well after the halving itself: {{sc:peak-timing}}",
        ],
      },
      {
        heading: "Why the pattern is not a promise",
        body: [
          "The direction has repeated; the size has collapsed by orders of magnitude, from +8,069% to +34%. {{sc:small-sample}} Reading the halving as a scheduled certainty of higher prices gets the record backwards — it has been a scheduled certainty of slower supply, around which very different markets formed.",
        ],
      },
    ],
    blocks: ["cycle-scorecard", "todays-configuration"],
    watch: [
      { text: "The current cycle overlaid on the previous three.", href: "/cycles" },
      { text: "The countdown and issuance schedule.", href: "/halving" },
      { text: "Today's configuration, updated with the data.", href: "/four-reference-prices" },
    ],
    related: ["is-bitcoin-in-a-bull-market", "has-bitcoin-peaked", "should-i-buy-bitcoin-now"],
    added: "2026-08-01",
    revised: "2026-08-01",
    reviewed: "2026-08-01",
  },
];
