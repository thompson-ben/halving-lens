// Daily Change engine — powers the "Daily Change Report" brief. Compares today's
// live read against yesterday, ~7 days ago and the recent average to find what
// actually changed, ranks the changes by significance, and generates a dynamic
// headline + "biggest story" from them.
//
// Everything traces to real stored history (src/lib/data/briefs.ts). When there
// isn't enough history yet, it degrades honestly (available=false / null trend)
// rather than fabricating a prior value.

import { format, subDays } from "date-fns";
import { cycleSummary, cycleScorecard, HEAT_LABEL, type HeatLevel } from "./cycleSummary";
import { currentSentiment, SENTIMENT_AVAILABLE } from "./sentiment";
import { etfStats, ETF } from "./etf";
import { STORED_BRIEFS } from "./data/briefs";
import { priorBrief, briefDate } from "./briefArchive";
import { fmtUsd } from "./format";
import type { StoredBrief } from "./brief";

export type Dir = "up" | "down" | "flat";
export type Momentum = "improving" | "worsening" | "accelerating" | "steady" | null;

export interface MetricDelta {
  key: "price" | "etf" | "sentiment" | "cycle_score" | "risk";
  label: string;
  display: string; // current value, formatted
  changeLabel: string | null; // delta vs yesterday, formatted (+2.1%, +4 pts, +$0.4B)
  dir: Dir;
  significance: number; // 0..1 magnitude for ranking
  impact: number; // signed: + constructive, − adverse
  momentum: Momentum; // from the ~7-day comparison
  sevenDayLabel: string | null;
  why: string;
  context: string | null;
}

export interface DailyChange {
  available: boolean;
  sinceLabel: string | null;
  deltas: MetricDelta[]; // every tracked metric with a prior value
  changed: MetricDelta[]; // only the meaningful movers
  largestPositive: MetricDelta | null;
  largestNegative: MetricDelta | null;
  biggestStory: MetricDelta | null;
  cycleReadChanged: boolean;
  headline: string;
}

const HEAT_ORDER: HeatLevel[] = ["cool", "neutral", "heating", "elevated", "euphoria"];
const MEANINGFUL = 0.12; // significance threshold for "this actually moved"

function signed(n: number, digits = 1, suffix = ""): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}${suffix}`;
}
function signedUsd(n: number): string {
  return `${n >= 0 ? "+" : "−"}${fmtUsd(Math.abs(n), { compact: true })}`;
}
function dirOf(n: number, eps: number): Dir {
  return n > eps ? "up" : n < -eps ? "down" : "flat";
}

// The most recent stored brief on or before `daysAgo` days before today.
function briefDaysAgo(daysAgo: number): StoredBrief | null {
  const target = format(subDays(briefDate(), daysAgo), "yyyy-MM-dd");
  const earlier = STORED_BRIEFS.filter((b) => b.slug <= target).sort((a, b) => (a.slug < b.slug ? 1 : -1));
  return earlier[0] ?? null;
}

// Constructive-direction momentum from the ~7-day move: improving / worsening,
// escalated to "accelerating" when today's move continues a strong 7-day trend.
function momentumOf(dayImpact: number, sevenImpact: number | null): Momentum {
  if (sevenImpact == null) return null;
  if (Math.abs(sevenImpact) < 0.1 && Math.abs(dayImpact) < 0.1) return "steady";
  const constructive = sevenImpact > 0;
  if (Math.sign(dayImpact) === Math.sign(sevenImpact) && Math.abs(dayImpact) > 0.25 && Math.abs(sevenImpact) > 0.4) {
    return "accelerating";
  }
  return constructive ? "improving" : "worsening";
}

export function dailyChange(): DailyChange {
  const s = cycleSummary();
  const prior = priorBrief();
  const wk = briefDaysAgo(7);

  if (!prior) {
    // Not enough history yet — fall back to a stable, honest headline.
    return {
      available: false,
      sinceLabel: null,
      deltas: [],
      changed: [],
      largestPositive: null,
      largestNegative: null,
      biggestStory: null,
      cycleReadChanged: false,
      headline: `Bitcoin at ${fmtUsd(s.price)} — ${s.phaseLabel.toLowerCase()}, ${HEAT_LABEL[s.heat].toLowerCase()}`,
    };
  }

  const card = cycleScorecard();
  const sentiment = SENTIMENT_AVAILABLE ? currentSentiment() : null;
  const etf = ETF.connected ? etfStats() : null;
  const deltas: MetricDelta[] = [];

  // ── BTC price ──────────────────────────────────────────────────────────────
  if (prior.price > 0) {
    const pct = (s.price / prior.price - 1) * 100;
    const sig = Math.min(1, Math.abs(pct) / 8);
    const impact = Math.sign(pct) * sig;
    const pct7 = wk && wk.price > 0 ? (s.price / wk.price - 1) * 100 : null;
    deltas.push({
      key: "price",
      label: "BTC price",
      display: fmtUsd(s.price),
      changeLabel: signed(pct, 1, "%"),
      dir: dirOf(pct, 0.3),
      significance: sig,
      impact,
      momentum: momentumOf(impact, pct7 != null ? Math.sign(pct7) * Math.min(1, Math.abs(pct7) / 12) : null),
      sevenDayLabel: pct7 != null ? `${signed(pct7, 1, "%")} over 7d` : null,
      why: "The headline read on momentum since the last brief.",
      context: Math.abs(pct) > 6 ? "Daily moves of this size are notable but not unusual mid-cycle." : null,
    });
  }

  // ── ETF flows (net flow since the last brief) ───────────────────────────────
  if (etf && prior.etfCumulative != null) {
    const delta = etf.cumulative - prior.etfCumulative;
    const sig = Math.min(1, Math.abs(delta) / 1.5e9);
    const impact = Math.sign(delta) * sig;
    const wk7 = wk?.etfCumulative != null ? etf.cumulative - wk.etfCumulative : null;
    deltas.push({
      key: "etf",
      label: "ETF flows",
      display:
        etf.trailingWeek > 0
          ? `Net inflows · ${fmtUsd(etf.trailingWeek, { compact: true })}/wk`
          : etf.trailingWeek < 0
            ? `Net outflows · ${fmtUsd(Math.abs(etf.trailingWeek), { compact: true })}/wk`
            : "Roughly flat",
      changeLabel: Math.abs(delta) >= 1e6 ? signedUsd(delta) : "≈ flat",
      dir: dirOf(delta, 5e7),
      significance: sig,
      impact,
      momentum: momentumOf(impact, wk7 != null ? Math.sign(wk7) * Math.min(1, Math.abs(wk7) / 6e9) : null),
      sevenDayLabel: wk7 != null ? `${signedUsd(wk7)} over 7d` : null,
      why: "Spot ETF demand is the structural variable unique to this cycle.",
      context:
        etf.trailingWeek < 0
          ? "Sustained outflows point to softer institutional demand."
          : "Sustained inflows are a candidate explanation for this cycle's cooler price path.",
    });
  }

  // ── Sentiment (Fear & Greed) ────────────────────────────────────────────────
  if (sentiment && prior.sentimentValue != null) {
    const delta = sentiment.value - prior.sentimentValue;
    const sig = Math.min(1, Math.abs(delta) / 12);
    const impact = Math.sign(delta) * sig;
    const d7 = wk?.sentimentValue != null ? sentiment.value - wk.sentimentValue : null;
    deltas.push({
      key: "sentiment",
      label: "Sentiment",
      display: `Fear & Greed ${sentiment.value}`,
      changeLabel: delta === 0 ? "no change" : signed(delta, 0, " pts"),
      dir: dirOf(delta, 0.5),
      significance: sig,
      impact,
      momentum: momentumOf(impact, d7 != null ? Math.sign(d7) * Math.min(1, Math.abs(d7) / 20) : null),
      sevenDayLabel: d7 != null ? `${signed(d7, 0, " pts")} over 7d` : null,
      why: "Extremes matter most — euphoria near tops, deep fear near lows. A contrarian read.",
      context:
        sentiment.value >= 75
          ? "Approaching greedy territory — worth watching as a contrarian signal."
          : sentiment.value <= 25
            ? "Deep fear has historically marked calmer, contrarian zones."
            : null,
    });
  }

  // ── Cycle score (higher = cooler / lower-risk environment) ──────────────────
  if (prior.cycleScore != null) {
    const delta = card.overall - prior.cycleScore;
    const sig = Math.min(1, Math.abs(delta) / 8);
    const impact = Math.sign(delta) * sig;
    deltas.push({
      key: "cycle_score",
      label: "Cycle score",
      display: `${card.overall}/100 · ${card.overallLabel}`,
      changeLabel: delta === 0 ? "no change" : signed(delta, 0, " pts"),
      dir: dirOf(delta, 0.5),
      significance: sig,
      impact,
      momentum: null,
      sevenDayLabel: null,
      why: "The blended read of cycle conditions — higher is cooler, lower is hotter.",
      context: null,
    });
  }

  // ── Risk / heat level ───────────────────────────────────────────────────────
  if (prior.heat) {
    const delta = HEAT_ORDER.indexOf(s.heat) - HEAT_ORDER.indexOf(prior.heat as HeatLevel);
    const changed = delta !== 0;
    const sig = changed ? 0.85 : 0;
    deltas.push({
      key: "risk",
      label: "Risk level",
      display: HEAT_LABEL[s.heat],
      changeLabel: changed
        ? `${HEAT_LABEL[prior.heat as HeatLevel] ?? prior.heat} → ${HEAT_LABEL[s.heat]}`
        : "unchanged",
      dir: changed ? (delta > 0 ? "up" : "down") : "flat",
      significance: sig,
      impact: -Math.sign(delta) * sig, // heat rising is adverse
      momentum: null,
      sevenDayLabel: null,
      why: "How stretched price is versus its long-term average — the single risk gauge.",
      context: null,
    });
  }

  const changed = deltas.filter((d) => d.significance >= MEANINGFUL).sort((a, b) => b.significance - a.significance);
  const positives = deltas.filter((d) => d.impact > 0.05).sort((a, b) => b.impact - a.impact);
  const negatives = deltas.filter((d) => d.impact < -0.05).sort((a, b) => a.impact - b.impact);
  const largestPositive = positives[0] ?? null;
  const largestNegative = negatives[0] ?? null;
  const biggestStory = [...deltas].sort((a, b) => b.significance - a.significance)[0] ?? null;

  const cycleReadChanged =
    prior.phaseLabel !== s.phaseLabel || prior.heat !== s.heat;

  return {
    available: true,
    sinceLabel: prior.dateLabel,
    deltas,
    changed,
    largestPositive,
    largestNegative,
    biggestStory,
    cycleReadChanged,
    headline: buildHeadline({ s, biggestStory, changed, cycleReadChanged }),
  };
}

// ── Dynamic headline ─────────────────────────────────────────────────────────
// Built from the biggest mover + a contrasting secondary, so the structure
// shifts with the data rather than repeating. Repetition control: when nothing
// meaningful moved, the headline says so.

function primaryPhrase(d: MetricDelta, price: string): string {
  switch (d.key) {
    case "price":
      return d.dir === "up" ? `Bitcoin climbs to ${price}` : d.dir === "down" ? `Bitcoin slips to ${price}` : `Bitcoin steady at ${price}`;
    case "etf":
      return d.dir === "up" ? "ETF demand strengthens" : d.dir === "down" ? "ETF outflows accelerate" : "ETF flows hold flat";
    case "sentiment":
      return d.dir === "up" ? "Sentiment improves" : d.dir === "down" ? "Sentiment cools" : "Sentiment holds";
    case "cycle_score":
      return d.dir === "up" ? "Cycle conditions ease" : d.dir === "down" ? "Cycle conditions warm up" : "Cycle conditions hold";
    case "risk":
      return d.dir === "up" ? `Risk ticks up to ${d.display.toLowerCase()}` : d.dir === "down" ? `Risk eases to ${d.display.toLowerCase()}` : "Risk unchanged";
  }
}

function secondaryPhrase(d: MetricDelta): string {
  switch (d.key) {
    case "price":
      return d.dir === "up" ? "price pushes higher" : "price softens";
    case "etf":
      return d.dir === "up" ? "ETF inflows pick up" : "ETF demand stays weak";
    case "sentiment":
      return d.dir === "up" ? "sentiment lifts" : "sentiment stays subdued";
    case "cycle_score":
      return d.dir === "up" ? "conditions cool" : "conditions heat up";
    case "risk":
      return `risk reads ${d.display.toLowerCase()}`;
  }
}

function buildHeadline({
  s,
  biggestStory,
  changed,
  cycleReadChanged,
}: {
  s: ReturnType<typeof cycleSummary>;
  biggestStory: MetricDelta | null;
  changed: MetricDelta[];
  cycleReadChanged: boolean;
}): string {
  const price = fmtUsd(s.price);

  // Quiet day — nothing meaningful moved.
  if (!biggestStory || changed.length === 0) {
    return `Cycle conditions hold steady as the market waits for direction`;
  }

  const primary = primaryPhrase(biggestStory, price);
  const secondary = changed.find((d) => d.key !== biggestStory.key && d.significance >= MEANINGFUL);

  if (!secondary) {
    // One mover, against an unchanged backdrop — lean into repetition control.
    return cycleReadChanged
      ? primary
      : `${primary} as the cycle read stays ${HEAT_LABEL[s.heat].toLowerCase()}`;
  }

  // Two movers — connector reflects whether they agree or diverge.
  const opposing = Math.sign(biggestStory.impact) !== Math.sign(secondary.impact);
  const connector = opposing ? "despite" : "as";
  return `${primary} ${connector} ${secondaryPhrase(secondary)}`;
}

// Headline for buildBrief() — change-driven when history exists.
export function briefHeadline(): string {
  return dailyChange().headline;
}
