// Bitcoin Questions — Bitcoin Cycles. Founder-reviewed editorial content;
// every wording change here is an editorial revision and must bump `revised`.

import type { QuestionEntry } from "../types";

export const CYCLES_QUESTIONS: QuestionEntry[] = [
  {
    slug: "is-bitcoin-in-a-bull-market",
    question: "Is Bitcoin in a Bull Market?",
    category: "Bitcoin Cycles",
    audience: "intermediate",
    tier: 1,
    description:
      "There's no official definition — so here is the measured answer: where price sits against its reference prices, and how long it has held that configuration.",
    shortAnswer: [
      "There is no official definition of a Bitcoin bull market, so an honest answer starts with measurements rather than labels. HalvingLens reads market state through the Four Reference Prices: the market price against the 200-day trend, against the average holder's cost basis (the realised price), and against the estimated mining cost. Which side of each reference price sits — and for how long — is the closest thing to a bull-or-bear classification that the record actually supports.",
      "{{es:frp.position}} {{es:frp.spell}} The modules below add the broader market-health picture and the current cycle's scorecard.",
    ],
    history: [
      {
        heading: "How HalvingLens classifies market state",
        body: [
          "A label like “bull market” compresses three separate measurements into one word, and loses information doing it. The framework keeps them separate: each reference price is a different lens — trend followers' (the 200-day average), holders' (the realised price), and producers' (the mining-cost estimate). The framework therefore reports the configuration and its duration directly, rather than compressing them into a single bull-or-bear label. Each reference is only ever compared over its honestly observed window — none of the three series is extended backwards beyond what was actually measured.",
        ],
      },
      {
        heading: "What past phases produced",
        body: [
          "The advances were large and the timing loose: cycle advances from halving-day to cycle peak measured {{sc:gain-to-peaks}}. {{sc:peak-timing}}",
          "And the reversals were severe: {{sc:bear-after-peaks}} {{sc:small-sample}}",
        ],
      },
    ],
    blocks: ["todays-configuration", "market-health", "cycle-scorecard"],
    watch: [
      { text: "The configuration, weekly, with its full history.", href: "/four-reference-prices" },
      { text: "The composite health read over time.", href: "/market-health" },
      { text: "Where this cycle sits against the previous three.", href: "/cycles" },
    ],
    related: ["has-bitcoin-peaked", "should-i-buy-bitcoin-now", "what-happens-after-a-bitcoin-halving"],
    added: "2026-08-01",
    revised: "2026-08-01",
    reviewed: "2026-08-01",
  },
  {
    slug: "has-bitcoin-peaked",
    question: "Has Bitcoin Peaked?",
    category: "Bitcoin Cycles",
    audience: "intermediate",
    tier: 1,
    description:
      "A peak only exists in hindsight. Here is where price stands against this cycle's high, and what every previous cycle did from similar positions.",
    shortAnswer: [
      "Nobody can know in real time — a peak only exists in hindsight, once nothing higher follows it. What can be measured is where price stands relative to this cycle's highest close, and what previous cycles did from comparable positions.",
      "{{es:peak.status}} {{es:ath.recency}} History cuts both ways here. {{sc:peaks-later-exceeded}} But every completed bull-market peak was also followed first by a fall of about three-quarters or more — and, in between, every cycle produced deep mid-cycle falls that turned out not to be the peak at all. The record below shows both sides, without deciding for you.",
    ],
    history: [
      {
        heading: "What previous peaks looked like",
        body: [
          "{{sc:peak-timing}} {{sc:bear-after-peaks}} The deepest falls reach further still early in the record: {{sc:deepest-drawdown}}",
        ],
      },
      {
        heading: "Why “the peak” is only visible in hindsight",
        body: [
          "{{sc:mid-cycle-recoveries}} In real time, those falls could not be distinguished reliably from the beginning of a longer decline. Some declines of similar depth did mark the beginning of a prolonged bear market; others did not. Depth alone has therefore been insufficient to identify a final cycle peak. {{sc:small-sample}}",
        ],
      },
      {
        heading: "How rare the top is",
        body: [
          "Across the full record, only about {{a:record.athSharePct}}% of all {{a:record.days}} days set a new all-time high. Statistically, almost every day in Bitcoin's history — including days inside its strongest advances — has been “below a previous peak”.",
        ],
      },
    ],
    blocks: ["downside-context", "cycle-scorecard"],
    watch: [
      { text: "How the current drawdown compares by cycle stage.", href: "/historical-price-paths" },
      { text: "This cycle against the same stage of the previous three.", href: "/cycles" },
      { text: "The nearest historical analogues to today.", href: "/similar-moments" },
    ],
    related: ["is-bitcoin-in-a-bull-market", "should-i-buy-bitcoin-now", "what-happens-after-a-bitcoin-halving"],
    added: "2026-08-01",
    revised: "2026-08-01",
    reviewed: "2026-08-01",
  },
];
