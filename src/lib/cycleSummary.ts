// Cycle Summary Engine — the deterministic, explainable read that powers the
// homepage hero, the /brief, and the share posts. It combines cycle timing,
// price behaviour vs prior cycles, ETF flows, sentiment and live-derived price
// indicators into a single plain-English answer.
//
// Principles (per product brief):
//   - Deterministic and explainable. No black-box AI.
//   - Historical context, never financial advice. No buy/sell signals.
//   - Careful, non-alarmist wording.
//   - Confidence reflects how much real evidence backs the read.

import { CYCLES, CURRENT_CYCLE, TODAY, TODAY_DAY_IN_CYCLE, CYCLE_PROGRESS_PCT } from "./btcData";
import {
  cycleDivergence,
  currentGainFromHalving,
  headlineSpot,
  priorCyclesAtSameDay,
} from "./cycleIntel";
import { etfStats, ETF } from "./etf";
import { sentimentRead, SENTIMENT_AVAILABLE } from "./sentiment";
import { metricBySlug, zoneFor } from "./metrics";

export type HeatLevel = "cool" | "neutral" | "heating" | "elevated" | "euphoria";
export type Confidence = "low" | "medium" | "high";

export const HEAT_LABEL: Record<HeatLevel, string> = {
  cool: "Historically cool",
  neutral: "Neutral",
  heating: "Heating up",
  elevated: "Elevated risk",
  euphoria: "Extreme euphoria",
};

export const HEAT_TONE: Record<HeatLevel, "blue" | "green" | "teal" | "amber" | "red"> = {
  cool: "blue",
  neutral: "teal",
  heating: "green",
  elevated: "amber",
  euphoria: "red",
};

export interface EvidenceItem {
  label: string;
  reading: string;
  detail: string;
  href?: string;
  status: "live" | "live-derived";
}

export interface CycleSummary {
  // Position
  cycleDay: number;
  progressPct: number;
  gainFromHalving: number;
  drawdownFromAth: number;
  ath: number;
  price: number;
  change24h: number | null;
  change7d: number | null;
  changeLabel: string; // "24h" or "7d" (whichever is the fresh figure)
  // The read
  phaseLabel: string;
  heat: HeatLevel;
  heatPercentile: number | null; // Mayer percentile across all history
  confidence: Confidence;
  // Narrative
  keyInsight: string;
  summary: string;
  support: string;
  whatsDifferent: string;
  whatToWatch: string;
  // Evidence
  evidence: EvidenceItem[];
}

function ath(): number {
  return CYCLES.reduce((m, c) => Math.max(m, c.peakPrice), 0);
}

// Mayer Multiple percentile across all cycles — how stretched price is vs its
// own 200-day average historically. A robust, price-only "heat" anchor.
function mayerPercentile(): number {
  const all = CYCLES.flatMap((c) => c.samples.map((s) => s.mayer)).filter(Number.isFinite).sort((a, b) => a - b);
  if (!all.length) return 50;
  const below = all.filter((v) => v <= TODAY.mayer).length;
  return (below / all.length) * 100;
}

function heatFromPercentile(p: number): HeatLevel {
  if (p < 25) return "cool";
  if (p < 50) return "neutral";
  if (p < 75) return "heating";
  if (p < 92) return "elevated";
  return "euphoria";
}

export function cycleSummary(): CycleSummary {
  const div = cycleDivergence();
  const spot = headlineSpot();
  const gain = currentGainFromHalving();
  const a = ath();
  const drawdown = (TODAY.price / a - 1) * 100;
  const pct = Math.round(CYCLE_PROGRESS_PCT * 100);
  const percentile = mayerPercentile();
  const heat = heatFromPercentile(percentile);

  // ── Phase label (calendar position modulated by heat) ────────────────────
  const calendarPhase =
    pct < 20 ? "post-halving accumulation"
    : pct < 45 ? "post-halving expansion"
    : pct < 70 ? "mid-cycle expansion"
    : pct < 90 ? "late-cycle"
    : "pre-halving tail";
  const phaseLabel = `${div.later ? "Later-running " : ""}${calendarPhase}`.replace(/^./, (c) => c.toUpperCase());

  // ── Evidence (only what we can stand behind) ─────────────────────────────
  const evidence: EvidenceItem[] = [];
  let liveSignals = 0;

  const mayer = metricBySlug("mayer-multiple");
  if (mayer) {
    const v = TODAY.mayer;
    const z = zoneFor(mayer, v);
    evidence.push({
      label: "Mayer Multiple",
      reading: z.label,
      detail:
        v < 1
          ? "Bitcoin is below its long-term (200-day) average — historically a calmer, cheaper zone."
          : "Bitcoin is above its long-term average, but how far above is what matters for risk.",
      href: "/metrics/mayer-multiple",
      status: "live-derived",
    });
    liveSignals++;
  }

  const puell = metricBySlug("puell-multiple");
  if (puell) {
    const z = zoneFor(puell, TODAY.puell);
    evidence.push({
      label: "Puell Multiple",
      reading: z.label,
      detail: "Miner revenue vs its yearly average — high readings have marked late-cycle heat.",
      href: "/metrics/puell-multiple",
      status: "live-derived",
    });
    liveSignals++;
  }

  // ETF flows
  let etfPhrase = "";
  if (ETF.connected) {
    const s = etfStats();
    const wk = s.trailingWeek;
    const dir = wk > 0 ? "net inflows" : wk < 0 ? "net outflows" : "roughly flat";
    etfPhrase = `ETFs have seen ${dir} recently`;
    evidence.push({
      label: "ETF flows",
      reading: wk > 0 ? "Net inflows" : wk < 0 ? "Net outflows" : "Flat",
      detail: "Spot Bitcoin ETF demand — the structural variable that didn't exist in prior cycles.",
      href: "/etf",
      status: "live",
    });
    liveSignals++;
  }

  // Sentiment
  let sentimentPhrase = "";
  if (SENTIMENT_AVAILABLE) {
    const sr = sentimentRead();
    if (sr) {
      sentimentPhrase = `sentiment is ${sr.band.label.toLowerCase()}`;
      evidence.push({
        label: "Sentiment",
        reading: sr.band.label,
        detail: "The Fear & Greed index — most useful at the extremes, as a contrarian read.",
        href: "/sentiment",
        status: "live",
      });
      liveSignals++;
    }
  }

  // ── Confidence: how much real evidence + how clear the signal ────────────
  const confidence: Confidence = liveSignals >= 4 ? "high" : liveSignals >= 2 ? "medium" : "low";

  // ── Narrative ────────────────────────────────────────────────────────────
  const keyInsight = div.keyInsight;
  const summary =
    div.later && div.cooler
      ? "Bitcoin is later in the cycle by calendar timing, but cooler than previous cycles by price behaviour."
      : div.cooler
        ? "Bitcoin is running cooler than previous cycles at this point after the halving."
        : div.later
          ? "By calendar timing, Bitcoin is later in the cycle than the classic pattern."
          : "Bitcoin is broadly tracking previous cycles at this point after the halving.";

  const support = div.summary;

  const whatsDifferent =
    "The 2024 cycle is the first Bitcoin cycle with US spot ETF demand — a structural source of buying that did not exist in 2012, 2016 or 2020. That makes comparison with prior cycles useful, but not perfect. So far this cycle has been flatter and slower than the classic four-year rhythm.";

  const watchBits = [etfPhrase, sentimentPhrase].filter(Boolean).join(", and ");
  const whatToWatch =
    `Whether price begins to accelerate toward prior-cycle behaviour${watchBits ? `, plus ${watchBits}` : ""}. ` +
    "These are the signals that would show the cycle either converging with history or continuing to diverge.";

  return {
    cycleDay: TODAY_DAY_IN_CYCLE,
    progressPct: pct,
    gainFromHalving: gain,
    drawdownFromAth: drawdown,
    ath: a,
    price: spot.price,
    change24h: spot.label === "24h" ? spot.pct : null,
    change7d: null,
    changeLabel: spot.label,
    phaseLabel,
    heat,
    heatPercentile: Math.round(percentile),
    confidence,
    keyInsight,
    summary,
    support,
    whatsDifferent,
    whatToWatch,
    evidence,
  };
}

// "Was this historically stretched?" — the beginner buy-context read, framed
// carefully as historical position, never advice.
export interface StretchRead {
  heat: HeatLevel;
  label: string;
  percentile: number | null;
  gainFromHalving: number;
  drawdownFromAth: number;
  plain: string;
}

export function stretchRead(): StretchRead {
  const s = cycleSummary();
  const plainByHeat: Record<HeatLevel, string> = {
    cool: "By historical standards, Bitcoin sits in a relatively cool part of its range — well below the stretched levels that have marked previous cycle tops.",
    neutral: "Bitcoin sits in the middle of its historical range — neither historically cheap nor stretched.",
    heating: "Bitcoin is warming up relative to its long-term average, but not yet at the extremes that have marked previous tops.",
    elevated: "Bitcoin is elevated versus its history — the kind of range that has appeared in the later, higher-risk parts of past cycles.",
    euphoria: "Bitcoin is in the stretched, euphoric part of its historical range — territory that has appeared close to previous cycle tops.",
  };
  return {
    heat: s.heat,
    label: HEAT_LABEL[s.heat],
    percentile: s.heatPercentile,
    gainFromHalving: s.gainFromHalving,
    drawdownFromAth: s.drawdownFromAth,
    plain: plainByHeat[s.heat],
  };
}
