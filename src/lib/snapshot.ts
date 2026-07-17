// Market Snapshot aggregators — the "opening scoreboard" data for the /snapshot
// dashboard AND the weekly "Documenting the Bitcoin Cycle" episode. Everything
// here composes the shared metric-change service and the existing live
// accessors, so the snapshot, the weekly pack and the episode all read the same
// numbers (PART 11 — the website is the single source of truth).

import { allMetricChanges, metricChange, type MetricChange, type Materiality } from "./metricChange";
import { cycleSummary } from "./cycleSummary";
import { similarMoments } from "./similarity";
import { accumulationRead } from "./accumulation";

// ── What Changed This Week? — ranked 3–5 developments ────────────────────────
export interface SnapshotChange {
  title: string;
  tone: "good" | "bad" | "neutral" | "flag";
  weight: number; // ranking score (higher = more meaningful)
}

const MATERIALITY_WEIGHT: Record<Materiality, number> = { band: 4, historic: 3, material: 2, modest: 1, none: 0 };

const pt = (n: number): string => `point${Math.abs(Math.round(n)) === 1 ? "" : "s"}`;

function changeItemFor(m: MetricChange): SnapshotChange | null {
  const c7 = m.changes.find((c) => c.period === 7 && c.available);
  const base = MATERIALITY_WEIGHT[m.materiality];
  if (base === 0) return null;
  const tone = m.bandChanged ? "flag" : c7 ? c7.good : "neutral";

  if (m.bandChanged) {
    const verb =
      m.id === "sentiment" ? "entered" : m.id === "accumulation" ? "moved into" : m.id === "etf_flow" ? "flipped to" : "shifted to";
    return { title: `${m.name} ${verb} ${m.bandChanged.to}`, tone, weight: base + 2 };
  }
  if (!c7) return null;

  let title: string;
  const mag = Math.abs(c7.absChange);
  switch (m.id) {
    case "market_health":
      title = `Market Health ${c7.dir === "up" ? "rose" : "fell"} ${mag.toFixed(0)} ${pt(mag)} this week`;
      break;
    case "sentiment":
      title = `Sentiment ${c7.dir === "up" ? "rose" : "fell"} ${mag.toFixed(0)} ${pt(mag)} this week`;
      break;
    case "accumulation":
      title = `Accumulation Index ${c7.dir === "down" ? "improved" : "eased"} ${mag.toFixed(0)} ${pt(mag)} this week`;
      break;
    case "price":
      title = `Bitcoin ${c7.pctChange != null && c7.pctChange >= 0 ? "gained" : "fell"} ${Math.abs(c7.pctChange ?? 0).toFixed(1)}% this week`;
      break;
    case "drawdown":
      title = `Drawdown ${c7.dir === "down" ? "deepened" : "recovered"} ${mag.toFixed(0)} ${pt(mag)} to ${m.currentLabel}`;
      break;
    case "etf_flow":
      title = `ETF seven-day demand at ${c7.absLabel}`;
      break;
    default:
      title = `${m.name} ${c7.absLabel} this week`;
  }
  return { title, tone, weight: base + mag / 1000 };
}

export function snapshotWhatChanged(max = 5): SnapshotChange[] {
  const items = allMetricChanges()
    .map(changeItemFor)
    .filter((x): x is SnapshotChange => x != null)
    .sort((a, b) => b.weight - a.weight);

  // Founder override — pin a custom lead highlight without touching code.
  const pin = (process.env.SNAPSHOT_PIN || "").trim();
  if (pin) items.unshift({ title: pin, tone: "flag", weight: Infinity });

  return items.slice(0, max);
}

// ── Historical context ───────────────────────────────────────────────────────
export interface SnapshotContext {
  match: string | null;
  similarity: number | null;
  accPercentile: number; // more attractive than X% of weeks
  drawdownPercentile: number | null;
  healthPercentile: number | null;
  summary: string;
}

export function snapshotContext(): SnapshotContext {
  const top = similarMoments(1)[0];
  const acc = accumulationRead();
  const dd = metricChange("drawdown");
  const mh = metricChange("market_health");
  const attractive = 100 - acc.historicalPercentile;
  const stanceWord = acc.score <= 40 ? "historically attractive for accumulation" : acc.score >= 60 ? "historically stretched" : "middling";
  const healthWord = mh.band ? mh.band.label.toLowerCase() : "neutral";
  const matchClause = top ? ` current conditions most closely resemble ${top.dateLabel}` : " no single historical moment stands out";
  return {
    match: top ? top.dateLabel : null,
    similarity: top ? top.similarity : null,
    accPercentile: attractive,
    drawdownPercentile: dd.percentile,
    healthPercentile: mh.percentile,
    summary: `Today is ${stanceWord}, the broader market reads ${healthWord}, and${matchClause}. Historical context, not prediction.`,
  };
}

// ── What We're Watching — 3 objective, non-predictive watch items ────────────
export interface WatchItem {
  title: string;
  current: string;
  why: string;
  trigger: string;
}

// Proximity of a value to the nearest band edge, for ranking "near a threshold".
function nearestEdge(value: number, edges: number[]): number {
  return Math.min(...edges.map((e) => Math.abs(value - e)));
}

export function snapshotWatchItems(): WatchItem[] {
  const items: { item: WatchItem; priority: number }[] = [];

  const sentiment = metricChange("sentiment");
  if (sentiment.available) {
    const edge = nearestEdge(sentiment.current, [25, 45, 55, 75]);
    items.push({
      priority: 100 - edge,
      item: {
        title: "Whether sentiment changes regime",
        current: `Fear & Greed ${sentiment.current} (${sentiment.band?.label})`,
        why: "Sentiment has mattered most at the extremes, as a contrarian tell — not a timer.",
        trigger: "A move across a Fear & Greed band boundary (25 / 45 / 55 / 75).",
      },
    });
  }

  const acc = metricChange("accumulation");
  if (acc.available) {
    const edge = nearestEdge(acc.current, [20, 40, 60, 80]);
    items.push({
      priority: 90 - edge,
      item: {
        title: "Whether the Accumulation Index crosses a band",
        current: `${acc.current}/100 (${acc.band?.label})`,
        why: "A band change marks a shift in how attractive entry looks versus history.",
        trigger: "A cross into a neighbouring accumulation band.",
      },
    });
  }

  const etf = metricChange("etf_flow");
  if (etf.available) {
    items.push({
      priority: 80,
      item: {
        title: "Whether ETF demand stays net positive",
        current: `${etf.band?.label ?? etf.currentLabel}`,
        why: "Spot ETF flows are the regulated demand signal absent from prior cycles.",
        trigger: "A flip between a net-inflow and net-outflow streak.",
      },
    });
  }

  const mh = metricChange("market_health");
  items.push({
    priority: 60,
    item: {
      title: "Whether Market Health holds its regime",
      current: `${mh.current}/100 (${mh.band?.label})`,
      why: "The composite frames overall cycle conditions in one number.",
      trigger: "A change in the Market Health classification.",
    },
  });

  return items
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map((x) => x.item);
}

// ── Scoreboard bundle ────────────────────────────────────────────────────────
export interface CyclePosition {
  cycleDay: number;
  progressPct: number;
  phaseLabel: string;
  gainFromHalving: number;
  drawdownFromAth: number;
}

export function snapshotCyclePosition(): CyclePosition {
  const s = cycleSummary();
  return {
    cycleDay: s.cycleDay,
    progressPct: s.progressPct,
    phaseLabel: s.phaseLabel,
    gainFromHalving: s.gainFromHalving,
    drawdownFromAth: s.drawdownFromAth,
  };
}
