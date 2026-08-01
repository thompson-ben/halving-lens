// Bitcoin Questions — Buying Bitcoin. Founder-reviewed editorial content;
// every wording change here is an editorial revision and must bump `revised`.

import type { QuestionEntry } from "../types";

export const BUYING_QUESTIONS: QuestionEntry[] = [
  {
    slug: "should-i-buy-bitcoin-now",
    question: "Should I Buy Bitcoin Now?",
    category: "Buying Bitcoin",
    audience: "beginner",
    tier: 1,
    description:
      "HalvingLens doesn't give investment advice. Here is where today sits in sixteen years of Bitcoin history — measured, not opined.",
    shortAnswer: [
      "No honest publication can answer that for you, and HalvingLens doesn't give personalised investment advice. Whether buying Bitcoin makes sense depends on your circumstances, your time horizon and your tolerance for deep drawdowns — things no website can measure. What the historical record can do is make your decision an informed one: it can show you exactly where today sits against the full daily record, stretching back to 2010, and what followed the moments that most resembled this one.",
      "{{es:frp.position}} {{es:accumulation.read}} The live modules below show how conditions like today's are distributed across the record — and how the closest historical analogues actually developed.",
    ],
    history: [
      {
        heading: "What the record says about “now”",
        body: [
          "Bitcoin has spent very little of its life at the top. Across the full record ({{a:record.days}} daily closes since {{a:record.fromYear}}), only about {{a:record.athSharePct}}% of days set a new all-time high — the overwhelming majority of Bitcoin's history has been spent below a previous peak. Every cycle so far has contained both an advance large enough to reward patience many times over and a fall deep enough to punish bad timing severely: {{sc:bear-after-peaks}} {{sc:deepest-drawdown}}",
        ],
      },
      {
        heading: "Why HalvingLens won't tell you to buy",
        body: [
          "A confident answer without understanding your circumstances, time horizon and tolerance for loss would hide more than it explains. HalvingLens therefore reports the context that can be measured: which reference prices the market currently holds, how conditions like today's have historically developed, and how deep previous drawdowns have run. {{sc:small-sample}} That context is what this page — and this site — exists to provide.",
        ],
      },
    ],
    blocks: ["todays-configuration", "accumulation-index", "similar-moments-preview"],
    watch: [
      { text: "Which reference prices the market holds, and for how long.", href: "/four-reference-prices" },
      { text: "Whether the Accumulation Index's band changes.", href: "/accumulation" },
      { text: "How the nearest historical analogues developed.", href: "/similar-moments" },
    ],
    related: ["is-bitcoin-in-a-bull-market", "has-bitcoin-peaked", "what-happens-after-a-bitcoin-halving", "what-is-the-accumulation-index"],
    added: "2026-08-01",
    revised: "2026-08-01",
    reviewed: "2026-08-01",
  },
];
