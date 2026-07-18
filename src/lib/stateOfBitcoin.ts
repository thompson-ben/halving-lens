// State of Bitcoin — deterministic composition layer for the flagship page.
//
// Everything here is a pure re-composition of existing live reads. No LLM, no
// network, no Date/Math.random — same committed snapshot in, same strings out.
// Every clause is gated on data that actually exists (sentiment only when
// SENTIMENT_AVAILABLE, ETF only when ETF.connected), and nothing invents a
// number or an adjective beyond the band labels the underlying reads publish.
// Historical context, never a prediction.

import { cyclePhase, cycleDivergence } from "./cycleIntel";
import { accumulationRead } from "./accumulation";
import { cycleSummary, type HeatLevel } from "./cycleSummary";
import { sentimentRead, SENTIMENT_AVAILABLE } from "./sentiment";
import { ETF, etfStats } from "./etf";
import { allMetricChanges, metricChange, type MetricChange } from "./metricChange";
import { similarMoments, type SimilarFactorKey } from "./similarity";
import { selectHistoricalNarrative } from "./contentCards";
import { snapshotWatchItems, type WatchItem } from "./snapshot";

// ── Overall Cycle Status — the weekly headline badge + one sentence ──────────
export type StatusTone = "cool" | "neutral" | "warm" | "caution";

export interface CycleStatus {
  badge: string;
  tone: StatusTone;
  sentence: string;
}

// Heat → status tone. Heat is derived from the Mayer percentile, so the tone
// tracks real price stretch rather than a hand-picked colour.
const HEAT_TO_TONE: Record<HeatLevel, StatusTone> = {
  cool: "cool",
  neutral: "neutral",
  heating: "warm",
  elevated: "caution",
  euphoria: "caution",
};

export function cycleStatus(): CycleStatus {
  const phase = cyclePhase();
  const acc = accumulationRead();
  const s = cycleSummary();
  return {
    // e.g. "Mid-cycle expansion · Historically Attractive"
    badge: `${phase.label} · ${acc.band.label}`,
    tone: HEAT_TO_TONE[s.heat] ?? "neutral",
    // cyclePhase().blurb is a single, careful, non-predictive sentence.
    sentence: phase.blurb,
  };
}

// ── Today's Verdict — the video's opening line ───────────────────────────────
// A 2–3 sentence plain-English synthesis. Lead is the dominant historical story
// (selectHistoricalNarrative), the middle states the live bands (gated), and the
// close reuses the narrative-specific historical-context takeaway.

// "a" / "an" for a spoken percentage (8, 11, 18, 80–89 take "an").
function article(n: number): string {
  return n === 8 || n === 11 || n === 18 || (n >= 80 && n <= 89) ? "an" : "a";
}

type Narrative = ReturnType<typeof selectHistoricalNarrative>["narrative"];

function verdictLead(narrative: Narrative): string {
  if (narrative === "similar") {
    const top = similarMoments(1)[0];
    if (top) return `Today's market most closely resembles ${top.dateLabel} — ${article(top.similarity)} ${top.similarity}% match to conditions seen then.`;
  }
  if (narrative === "drawdown") {
    const depth = Math.abs(Math.round(cycleSummary().drawdownFromAth));
    return `Bitcoin is trading about ${depth}% below its cycle high, a correction worth putting in historical perspective.`;
  }
  if (narrative === "fear_greed" && SENTIMENT_AVAILABLE) {
    const sr = sentimentRead();
    if (sr) return `Market sentiment sits at ${sr.value} — ${sr.band.label} — an extreme by historical standards.`;
  }
  // position (evergreen default) — frame where today sits by value.
  return `Bitcoin is trading in a ${accumulationRead().band.label.toLowerCase()} part of the cycle.`;
}

// A single, concise closing sentence. Derived only from the accumulation band
// (itself a historical-percentile classification) so it never repeats the
// lead's specifics, never predicts, and never invents an adjective.
function verdictClose(): string {
  const key = accumulationRead().band.key;
  const stance =
    key === "deep_value" || key === "attractive"
      ? "have historically been constructive"
      : key === "overheated" || key === "elevated"
        ? "have historically warranted more caution"
        : "sit in the middle of Bitcoin's historical range";
  return `Overall, conditions like today's ${stance} — historical context, not a forecast.`;
}

export function todaysVerdict(): string {
  const narrative = selectHistoricalNarrative().narrative;
  const health = metricChange("market_health");
  const clauses: string[] = [`Market Health is ${(health.band?.label ?? "neutral").toLowerCase()}`];

  if (SENTIMENT_AVAILABLE) {
    const sr = sentimentRead();
    if (sr) clauses.push(`sentiment sits in ${sr.band.label}`);
  }
  if (ETF.connected) {
    const wk = etfStats().trailingWeek;
    const stance = wk > 0 ? "positive" : wk < 0 ? "negative" : "roughly flat";
    clauses.push(`ETF demand has been ${stance} this week`);
  }

  const middle = joinClauses(clauses);
  // Three sentences: dominant-story lead · the live bands · a historical-context close.
  return `${verdictLead(narrative)} ${middle}. ${verdictClose()}`;
}

// "a, b, and c" — Oxford-style clause join.
function joinClauses(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

// ── Why this match? — the honest per-factor breakdown ────────────────────────
export interface MatchReason {
  label: string;
  closeness: number;
}

// Only surface a factor when today genuinely resembles the match on it. Below
// this closeness we say nothing rather than overclaim.
const CLOSE_THRESHOLD = 80;

const FACTOR_FRIENDLY: Record<SimilarFactorKey, string> = {
  drawdown: "Similar drawdown",
  cycleTiming: "Similar point in the cycle",
  marketHeat: "Similar market heat",
  gainSinceHalving: "Similar gain since halving",
};

export function matchReasons(): MatchReason[] {
  const top = similarMoments(1)[0];
  if (!top?.factors) return [];
  return top.factors
    .filter((f) => f.closeness >= CLOSE_THRESHOLD)
    .sort((a, b) => b.closeness - a.closeness)
    .slice(0, 3)
    .map((f) => ({ label: FACTOR_FRIENDLY[f.key], closeness: f.closeness }));
}

// ── Week-change summary — how many core readings improved / weakened ─────────
export interface WeekChangeSummary {
  improved: number;
  weakened: number;
  unchanged: number;
  headline: string;
}

export function weekChangeSummary(): WeekChangeSummary {
  const metrics = allMetricChanges();
  let improved = 0;
  let weakened = 0;
  let unchanged = 0;

  for (const m of metrics) {
    const c7 = m.changes.find((c) => c.period === 7 && c.available);
    const good = c7?.good;
    if (good === "good") improved++;
    else if (good === "bad") weakened++;
    else unchanged++;
  }

  // If nothing material actually moved, say so rather than dress up noise.
  const anyMaterial = metrics.some((m) => m.materiality !== "none");
  const headline = anyMaterial
    ? `${improved} improved · ${weakened} weakened · ${unchanged} unchanged`
    : "Nothing materially changed this week — history continues to tell the same story.";

  return { improved, weakened, unchanged, headline };
}

// ── Metric "why it matters" — concise, data-aware, ≤ ~12 words ───────────────
export function metricMeaning(m: MetricChange): string {
  switch (m.id) {
    case "market_health":
      return m.percentile != null
        ? `Historically stronger than ${m.percentile}% of tracked days.`
        : `Overall conditions read ${(m.band?.label ?? "neutral").toLowerCase()}.`;
    case "sentiment": {
      const b = (m.band?.label ?? "").toLowerCase();
      const word = b.includes("greed") ? "greed" : b.includes("fear") ? "fear" : "a balanced mood";
      return `Historically associated with investor ${word}.`;
    }
    case "accumulation":
      return "How attractive today looks vs Bitcoin's own history.";
    case "price": {
      const c1 = m.changes.find((c) => c.period === 1);
      const c7 = m.changes.find((c) => c.period === 7);
      const parts: string[] = [];
      if (c1?.available && c1.pctLabel) parts.push(`${c1.pctLabel} today`);
      if (c7?.available && c7.pctLabel) parts.push(`${c7.pctLabel} this week`);
      return parts.length ? `Bitcoin's live price — ${parts.join(", ")}.` : "Bitcoin's live market price.";
    }
    case "etf_flow":
      return m.band ? `Regulated ETF demand — currently a ${m.band.label}.` : "Regulated ETF demand, new to this cycle.";
    case "drawdown":
      return "How far below its cycle high Bitcoin trades.";
    default:
      return m.band ? `Currently ${m.band.label}.` : "";
  }
}

// ── Ranked watch items — most significant first, top flagged ─────────────────
export interface RankedWatchItem extends WatchItem {
  top: boolean;
}

export function rankedWatch(): RankedWatchItem[] {
  // snapshotWatchItems() already returns items sorted by priority (desc).
  return snapshotWatchItems().map((item, i) => ({ ...item, top: i === 0 }));
}
