// The canonical score→band mapping (Cycle Dashboard V2, CD0).
//
// One mapping from the 0–100 cycle-environment score to everything a surface
// may say about it: band, label, interpretation, health tag, colour and
// Tailwind tones. Every renderer of the score — the scorecard card, Market
// Health, the movers registry, the warehouse — reads this table, so no
// surface can ever colour a score against one set of thresholds while
// labelling it against another. Numeric thresholds live HERE and nowhere
// else.
//
// Higher = cooler / calmer / historically lower-risk. The score summarises
// historical cycle conditions; it is never a buy/sell signal.

export type ScoreBandKey = "cool" | "neutral" | "warm" | "elevated" | "euphoric";

export interface ScoreBand {
  key: ScoreBandKey;
  /** Inclusive lower bound of the band on the 0–100 scale. */
  min: number;
  label: string;
  interpretation: string;
  /** Health-framed one-liner (Market Health surfaces). */
  tag: string;
  /** Hex colour — higher score = calmer colour. */
  color: string;
  /** Tailwind tones for text and filled bars. Literal class strings so the
   *  JIT scanner sees them. */
  toneText: string;
  toneBar: string;
}

/** Descending by `min`; the first band whose `min` ≤ score wins. */
export const SCORE_BANDS: ScoreBand[] = [
  {
    key: "cool",
    min: 75,
    label: "Cool",
    interpretation: "Conditions sit toward the calmer, earlier-cycle end of the historical range.",
    tag: "Historically calm",
    color: "#3ddc97",
    toneText: "text-signal-green",
    toneBar: "bg-signal-green",
  },
  {
    key: "neutral",
    min: 55,
    label: "Neutral",
    interpretation: "Historically neither overheated nor deeply undervalued — a middle-of-the-range environment.",
    tag: "Balanced",
    color: "#5eead4",
    toneText: "text-accent",
    toneBar: "bg-accent",
  },
  {
    key: "warm",
    min: 40,
    label: "Warm",
    interpretation: "Conditions are warming relative to history, but not yet at the extremes seen near past tops.",
    tag: "Warming",
    color: "#f5b942",
    toneText: "text-signal-amber",
    toneBar: "bg-signal-amber",
  },
  {
    key: "elevated",
    min: 25,
    label: "Elevated",
    interpretation: "Conditions are elevated versus history — the kind of range seen in later, higher-risk cycle phases.",
    tag: "Elevated risk",
    color: "#f97316",
    toneText: "text-[#f97316]",
    toneBar: "bg-[#f97316]",
  },
  {
    key: "euphoric",
    min: 0,
    label: "Euphoric",
    interpretation: "Conditions sit in the stretched end of the historical range, associated with late-cycle periods.",
    tag: "Historically overheated",
    color: "#ff5d5d",
    toneText: "text-signal-red",
    toneBar: "bg-signal-red",
  },
];

export function scoreBand(score: number): ScoreBand {
  return SCORE_BANDS.find((b) => score >= b.min) ?? SCORE_BANDS[SCORE_BANDS.length - 1];
}
