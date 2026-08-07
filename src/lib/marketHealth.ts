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

import { cycleScorecard, type ScorecardFactor } from "./cycleSummary";
import { scoreBand } from "./scoreBand";
import { accumulationRead, type AccumulationRead } from "./accumulation";
import { dailyChange, type DailyChange } from "./dailyChange";
import { STORED_BRIEFS } from "./data/briefs";

// Colour and tag by score — thin views over the canonical score→band mapping
// (scoreBand.ts), so the label, the colour and the tag can never disagree.
export function healthColor(score: number): string {
  return scoreBand(score).color;
}

export function healthTag(score: number): string {
  return scoreBand(score).tag;
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
