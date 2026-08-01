// Bitcoin Questions — Bitcoin Indicators. Founder-reviewed editorial content;
// every wording change here is an editorial revision and must bump `revised`.

import type { QuestionEntry } from "../types";

export const INDICATOR_QUESTIONS: QuestionEntry[] = [
  {
    slug: "what-is-the-accumulation-index",
    question: "What Is the Accumulation Index?",
    category: "Bitcoin Indicators",
    audience: "intermediate",
    tier: 1,
    description:
      "HalvingLens' 0–100 measure of how historically stretched or depressed Bitcoin's price is — how it's built, what the bands describe, and today's live reading.",
    shortAnswer: [
      "The Accumulation Index is HalvingLens' 0-to-100 summary of how historically stretched or depressed Bitcoin's price is. It blends three price-based inputs — the Mayer Multiple (price versus its 200-day average, weighted 45%), the 200-week moving-average multiple (30%), and the drawdown from the running all-time high (25%) — through fixed, published maps. Low scores describe conditions that historically clustered near cycle lows; high scores, conditions that clustered near cycle highs. It describes where today sits in the historical distribution. It is not a buy or sell signal, and it makes no prediction.",
      "{{es:accumulation.read}} The live module below shows the current score, its band, and how much each input contributes today.",
    ],
    history: [
      {
        heading: "How the score is built",
        body: [
          "All three inputs come from price history — not sentiment surveys or social activity. Their mappings, weights and band thresholds are fixed, published and applied consistently rather than adjusted in response to current market conditions. The same published rules are applied at every point in the record, and the score is computed using only information observable at that date. Where an input did not yet exist — notably the 200-week average early in Bitcoin's history — the available weights are renormalised and the reduced-input period is disclosed. Historical readings are never recalculated using future information.",
        ],
      },
      {
        heading: "What the bands describe",
        body: [
          "The score is divided into five named bands, from Historically Deep Value to Historically Overheated. The names are descriptions of where a reading sits in the historical distribution — not instructions. The full band history, and how long past spells in the extreme bands lasted, is charted on the Accumulation Index page.",
        ],
      },
      {
        heading: "What it is for",
        body: [
          "The index answers one question precisely: compared with every moment in the record, how stretched is price right now? It deliberately does not answer what happens next — no single score has reliably done that, and this one does not claim to.",
        ],
      },
    ],
    blocks: ["accumulation-index"],
    watch: [
      { text: "The full index: history, bands, and each input.", href: "/accumulation" },
      { text: "Today's configuration across all the references.", href: "/four-reference-prices" },
      { text: "Moments whose overall conditions most resemble now.", href: "/similar-moments" },
    ],
    related: ["should-i-buy-bitcoin-now", "is-bitcoin-in-a-bull-market", "has-bitcoin-peaked"],
    added: "2026-08-01",
    revised: "2026-08-01",
    reviewed: "2026-08-01",
  },
];
