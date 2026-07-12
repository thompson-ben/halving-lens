// Market Health — the public "how healthy does today's Bitcoin market look versus
// history?" read that powers /market-health. It is a thin, honest aggregator over
// engines that already exist: the composite cycle scorecard (score + components),
// the price-only Accumulation Index (the long-history value percentile), and the
// daily-change engine (what moved since yesterday). Nothing here invents data —
// every number traces to a real engine, and where history is short we say so.
//
// Framing: the composite score is higher = cooler / lower-risk / healthier,
// lower = hotter / higher-risk / more overheated. "Health" here means a calm,
// sustainable, not-overheated environment — never a growth or price prediction.

import { cycleScorecard, scoreBand, type ScorecardFactor } from "./cycleSummary";
import { accumulationRead, type AccumulationRead } from "./accumulation";
import { dailyChange, type DailyChange } from "./dailyChange";
import { STORED_BRIEFS } from "./data/briefs";

// Colour by score, higher = healthier. Thresholds mirror scoreBand() so the
// label and the colour never disagree.
export function healthColor(score: number): string {
  if (score >= 75) return "#3ddc97"; // signal-green — historically calm
  if (score >= 55) return "#5eead4"; // accent (cyan) — balanced
  if (score >= 40) return "#f5b942"; // amber — warming
  if (score >= 25) return "#f97316"; // orange — elevated
  return "#ff5d5d"; // red — historically overheated
}

// A short, health-framed status to pair with the scoreBand label.
export function healthTag(score: number): string {
  if (score >= 75) return "Historically calm";
  if (score >= 55) return "Balanced";
  if (score >= 40) return "Warming";
  if (score >= 25) return "Elevated risk";
  return "Historically overheated";
}

export interface HealthTimelinePoint {
  ts: number;
  score: number;
  price: number;
}

export interface MarketHealthRead {
  score: number; // 0-100 composite, higher = healthier/cooler
  label: string; // scoreBand label — Cool / Neutral / Warm / Elevated / Euphoric
  tag: string; // health-framed one-liner
  color: string;
  interpretation: string; // plain-English historical reading of the number
  factors: ScorecardFactor[]; // the components, equal-weighted (see note on the page)
  // The price-only value backdrop — the only engine with a real 2012→ percentile.
  value: {
    score: number;
    bandLabel: string;
    bandColor: string;
    // % of history that has been CHEAPER than today (0 = cheapest ever).
    percentile: number;
    // % of history MORE EXPENSIVE than today — the "attractiveness" framing.
    cheaperThan: number;
    reasoning: string;
  };
  change: DailyChange;
  // Composite score through the days we've published the brief (short but real).
  timeline: HealthTimelinePoint[];
  trackedDays: number;
}

export function marketHealthRead(): MarketHealthRead {
  const card = cycleScorecard();
  const band = scoreBand(card.overall);
  const acc: AccumulationRead = accumulationRead();

  const timeline: HealthTimelinePoint[] = STORED_BRIEFS.filter(
    (b) => typeof b.cycleScore === "number" && b.price > 0,
  )
    .map((b) => ({ ts: Date.parse(b.slug), score: b.cycleScore as number, price: b.price }))
    .filter((p) => Number.isFinite(p.ts))
    .sort((a, b) => a.ts - b.ts);

  return {
    score: card.overall,
    label: band.label,
    tag: healthTag(card.overall),
    color: healthColor(card.overall),
    interpretation: card.interpretation,
    factors: card.factors,
    value: {
      score: acc.score,
      bandLabel: acc.band.label,
      bandColor: acc.band.color,
      percentile: acc.historicalPercentile,
      cheaperThan: 100 - acc.historicalPercentile,
      reasoning: acc.reasoning,
    },
    change: dailyChange(),
    timeline,
    trackedDays: timeline.length,
  };
}
