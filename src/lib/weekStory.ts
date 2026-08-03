// The Week in Context — deterministic composer for the flagship weekly section.
//
// This is the "brain" behind the redesigned "What changed this week?" area on
// The State of Bitcoin. It turns the shared metric-change service into a RANKED
// set of signals, each carrying the full evidence chain the brand is built on:
//
//   Fact  →  What it means (Interpretation)  →  Historical context
//
// Everything is a pure re-composition of existing live reads — no LLM, no
// network, no Date.now()/Math.random(), no invented numbers or adjectives. Same
// committed snapshot in, same strings out. Interpretation is rule-based and
// gated on the direction/materiality/band the underlying reads already publish;
// where the data can't support a claim we say less, never more. Historical
// context, never a prediction.
//
// Longer term this is the natural seam for the Founder Intelligence Platform:
// Facts (metricChange) → Intelligence (this composer) → Presentation (the
// component). Today it recomposes the same primitives the dashboards and the
// weekly episode brief already share, so nothing drifts.

import { allMetricChanges, type MetricChange, type MetricId, type Materiality, type PeriodChange } from "./metricChange";
import { weekChangeSummary } from "./stateOfBitcoin";
import { cyclePhase, cycleDivergence } from "./cycleIntel";
import { accumulationRead } from "./accumulation";
import type { HeatLevel } from "./cycleSummary";
import { cycleSummary } from "./cycleSummary";

export type SignalTone = "good" | "bad" | "neutral" | "flag";
export type StatusTone = "cool" | "neutral" | "warm" | "caution";

export interface WeekSignal {
  rank: number; // 1-based, 1 = biggest development of the week
  metricId: MetricId;
  name: string; // "ETF Demand"
  factValue: string; // the headline number, e.g. "+$505M", "+2.5%", "−24%"
  factLabel: string; // what the number is, e.g. "7-day net demand", "this week"
  support: string | null; // secondary line under the number (current level / band / streak)
  dir: "up" | "down" | "flat";
  tone: SignalTone;
  interpretation: string; // the "so what" — one deterministic sentence
  historical: string | null; // historical-context sentence (percentile / band), or null
  band: string | null;
  bandChanged: { from: string; to: string } | null;
  spark: number[];
  materiality: Materiality;
  href: string;
}

export interface WeekCycleStatus {
  changed: boolean; // did this week alter the cycle read?
  badge: string; // "Mid-cycle expansion · Historically Attractive"
  tone: StatusTone;
  headline: string; // "No meaningful change" / "The cycle read shifted this week"
  detail: string; // one careful, non-predictive sentence
}

export interface WeekStory {
  available: boolean;
  headline: string; // "3 improved · 1 weakened · 2 unchanged" or the quiet-week line
  improved: number;
  weakened: number;
  unchanged: number;
  narrative: string | null; // the connective, causal one-liner (only when drivers link up)
  signals: WeekSignal[]; // ranked, biggest first
  quietWeek: boolean;
  cycleStatus: WeekCycleStatus;
}

const METRIC_DEST: Record<MetricId, string> = {
  price: "/price",
  market_health: "/market-health",
  sentiment: "/sentiment",
  accumulation: "/accumulation",
  drawdown: "/historical-price-paths",
  etf_flow: "/etf",
  production_premium: "/metrics/estimated-mining-cost",
};

const MATERIALITY_WEIGHT: Record<Materiality, number> = { band: 5, historic: 4, material: 3, modest: 1, none: 0 };

const HEAT_TO_TONE: Record<HeatLevel, StatusTone> = {
  cool: "cool",
  neutral: "neutral",
  heating: "warm",
  elevated: "caution",
  euphoria: "caution",
};

function c7Of(m: MetricChange): PeriodChange | undefined {
  return m.changes.find((c) => c.period === 7 && c.available);
}

// ── the display fact (big number + what it is + a supporting line) ───────────
function factFor(m: MetricChange, c7: PeriodChange | undefined): { value: string; label: string; support: string | null } {
  switch (m.id) {
    case "price":
      return {
        value: c7?.pctLabel ?? m.currentLabel,
        label: "this week",
        support: `Now ${m.currentLabel}`,
      };
    // Support lines carry the CURRENT LEVEL only — the band label lives in the
    // chip, so we never print it twice.
    case "market_health":
      return {
        value: c7 && c7.dir !== "flat" ? c7.absLabel : "Steady",
        label: "this week",
        support: `Now ${m.currentLabel}/100`,
      };
    case "sentiment":
      return {
        value: c7 && c7.dir !== "flat" ? c7.absLabel : "Steady",
        label: "this week",
        support: `Fear & Greed ${m.currentLabel}`,
      };
    case "accumulation":
      return {
        value: c7 && c7.dir !== "flat" ? c7.absLabel : "Steady",
        label: "this week",
        support: `Now ${m.currentLabel}/100`,
      };
    case "drawdown":
      return {
        value: m.currentLabel, // "−24%"
        label: "below cycle high",
        support: c7 && c7.dir !== "flat" ? `${c7.absLabel} this week` : "Broadly unchanged",
      };
    case "etf_flow":
      // The streak (e.g. "6-day inflow") is already the chip — no support line.
      return {
        value: c7?.absLabel ?? m.currentLabel,
        label: "7-day net demand",
        support: null,
      };
    default:
      return { value: m.currentLabel, label: "this week", support: m.band?.label ?? null };
  }
}

// ── the "so what" — one deterministic sentence per metric ────────────────────
function interpretationFor(m: MetricChange, c7: PeriodChange | undefined): string {
  const up = c7?.dir === "up";
  const down = c7?.dir === "down";
  const flat = !c7 || c7.dir === "flat" || m.materiality === "none";

  switch (m.id) {
    case "etf_flow": {
      if (flat) return "ETF demand was broadly balanced — neither strong accumulation nor meaningful selling.";
      return up
        ? "Sustained net inflows suggest institutions kept accumulating Bitcoin through the regulated ETFs."
        : "Net outflows suggest institutions stepped back from adding through the regulated ETFs this week.";
    }
    case "price": {
      if (flat) return "Price held broadly steady — the week's other signals carried more of the story.";
      return up
        ? "Price strengthened over the week, reinforcing the firmer overall tone."
        : "Price softened over the week, taking some heat out of the market.";
    }
    case "market_health": {
      const driver = m.drivers[0];
      if (flat) return "Overall conditions held their regime — no broad shift across the underlying readings.";
      const base = up ? "Conditions strengthened across the underlying readings" : "Conditions softened across the underlying readings";
      return driver ? `${base}, led by ${driver}.` : `${base} this week.`;
    }
    case "sentiment": {
      const b = (m.band?.label ?? "").toLowerCase();
      const region = b.includes("greed")
        ? "toward the greedier end of its historical range"
        : b.includes("fear")
          ? "toward the fearful end of its historical range"
          : "around the middle of its historical range";
      if (flat) return `Mood was steady, sitting ${region}.`;
      return up
        ? `Optimism improved but still sits ${region} — a lift in mood without a regime change.`
        : `Caution increased, pulling mood ${region}.`;
    }
    case "accumulation": {
      if (flat) return "How attractive today looks versus Bitcoin's own history was broadly unchanged.";
      // For accumulation a DOWN move is constructive (cheaper vs history).
      return down
        ? "Today looks more attractive for accumulation than a week ago, relative to Bitcoin's own history."
        : "Today looks less attractive for accumulation than a week ago, relative to Bitcoin's own history.";
    }
    case "drawdown": {
      if (flat) return "Bitcoin's distance below its cycle high was little changed.";
      // For drawdown an UP move (toward 0) is a recovery.
      return up
        ? "Bitcoin recovered some ground back toward its cycle high."
        : "The correction from the cycle high deepened over the week.";
    }
    default:
      return m.summary;
  }
}

// ── historical-context sentence (percentile / band), or null when unsupported ─
// The metric-change service already publishes a human percentile phrase per
// metric (e.g. "72nd percentile of tracked days", "more attractive than 78% of
// weeks"). We surface it verbatim — capitalised — so the context is exactly the
// figure behind the reading, never a re-worded claim.
function historicalFor(m: MetricChange): string | null {
  if (m.id === "price") {
    return m.high30 != null && m.low30 != null ? "Within its 30-day trading range." : null;
  }
  if (!m.percentileLabel) return null;
  const s = m.percentileLabel.trim();
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
}

function signalFor(m: MetricChange, rankSeed: number): { signal: WeekSignal; weight: number } | null {
  if (!m.available) return null;
  const c7 = c7Of(m);
  const base = MATERIALITY_WEIGHT[m.materiality];
  // Skip readings that genuinely didn't move and carry no band change.
  if (base === 0 && !m.bandChanged) return null;

  const tone: SignalTone = m.bandChanged ? "flag" : c7 ? c7.good : "neutral";
  const fact = factFor(m, c7);
  const mag = c7 ? Math.abs(c7.pctChange ?? c7.absChange) : 0;
  const weight = (m.bandChanged ? base + 2 : base) + mag / 100000 + rankSeed / 1000;

  return {
    weight,
    signal: {
      rank: 0, // assigned after sort
      metricId: m.id,
      name: m.name,
      factValue: fact.value,
      factLabel: fact.label,
      support: fact.support,
      dir: c7?.dir ?? "flat",
      tone,
      interpretation: interpretationFor(m, c7),
      historical: historicalFor(m),
      band: m.band?.label ?? null,
      bandChanged: m.bandChanged ? { from: m.bandChanged.from, to: m.bandChanged.to } : null,
      spark: m.spark,
      materiality: m.materiality,
      href: METRIC_DEST[m.id],
    },
  };
}

// ── connective narrative — the causal one-liner, only when the data links up ──
// Market Health already computes its own weekly drivers (ETF / sentiment /
// price), so when a driver is present we can honestly say what moved the
// composite. We never manufacture a causal chain that the data doesn't show.
function narrativeFor(metrics: MetricChange[]): string | null {
  const mh = metrics.find((m) => m.id === "market_health");
  if (!mh || mh.drivers.length === 0 || mh.materiality === "none") return null;
  const drivers = mh.drivers.slice(0, 2);
  const list = drivers.length === 2 ? `${drivers[0]} and ${drivers[1]}` : drivers[0];
  const direction = mh.status === "improving" ? "lifted" : mh.status === "weakening" ? "weighed on" : "shaped";
  return `This week's story: ${list} ${direction} overall Market Health.`;
}

// ── cycle status — did this week actually change the read? ───────────────────
function cycleStatusFor(metrics: MetricChange[]): WeekCycleStatus {
  const phase = cyclePhase();
  const acc = accumulationRead();
  const s = cycleSummary();
  const badge = `${phase.label} · ${acc.band.label}`;
  const tone = HEAT_TO_TONE[s.heat] ?? "neutral";

  // The honest "did anything fundamental change?" test: a metric crossing a
  // band boundary is the only event that moves a classification. Most weeks
  // there are none — and saying so plainly is itself useful information.
  const crossings = metrics.filter((m) => m.bandChanged);
  if (crossings.length === 0) {
    return {
      changed: false,
      badge,
      tone,
      headline: "No meaningful change",
      detail: `Bitcoin remains in the ${phase.label.toLowerCase()} identified previously — ${cycleDivergence().keyInsight.toLowerCase()}`,
    };
  }

  const named = crossings
    .map((m) => `${m.name} moved into ${m.bandChanged!.to}`)
    .join(", and ");
  return {
    changed: true,
    badge,
    tone,
    headline: "The cycle read shifted this week",
    detail: `${named}. The broader chapter is still the ${phase.label.toLowerCase()}, but this is the kind of change worth noting.`,
  };
}

// The weekly conclusion generator that used to live here (takeaway /
// nextSignal / hook) was retired in PR-SB4b. It ranked the week by raw
// movement, so its "led by …" sentence could contradict the significance-
// ranked canonical verdict rendered directly above it. The close now
// restates the weeklyBriefing verdict — one model, one verdict.

export function weekStory(): WeekStory {
  const metrics = allMetricChanges();
  const wk = weekChangeSummary();

  const scored = metrics
    .map((m, i) => signalFor(m, metrics.length - i))
    .filter((x): x is { signal: WeekSignal; weight: number } => x != null)
    .sort((a, b) => b.weight - a.weight);

  const signals = scored.map((x, i) => ({ ...x.signal, rank: i + 1 }));
  const quietWeek = signals.length === 0;

  return {
    available: true,
    headline: wk.headline,
    improved: wk.improved,
    weakened: wk.weakened,
    unchanged: wk.unchanged,
    narrative: quietWeek ? null : narrativeFor(metrics),
    signals,
    quietWeek,
    cycleStatus: cycleStatusFor(metrics),
  };
}
