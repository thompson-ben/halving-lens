// Daily Content Pack — card data layer.
//
// Turns one day's Daily Brief into a structured, serializable description of the
// six carousel cards. This is the single source of truth that drives both the
// server-rendered images (src/lib/cardTemplates.tsx via the image route) and the
// admin studio preview/captions. Template-driven and future-proof: new card
// kinds or output formats read from this same deck.
//
// Careful language throughout — historical context, no hype, no predictions, no
// price targets. Every number traces to the live brief; nothing is fabricated.

import { format } from "date-fns";
import { cycleSummary, cycleScorecard, HEAT_LABEL } from "./cycleSummary";
import { priorCyclesAtSameDay, currentGainFromHalving, whatHappenedNext } from "./cycleIntel";
import { cycleTiming, cyclePeakTroughs } from "./cycleTiming";
import { drawdownAnalysis } from "./drawdowns";
import { similarMoments, currentMoment } from "./similarity";
import { priorBrief, briefDate, todaySlug } from "./briefArchive";
import { etfStats, ETF, type EtfFlowPoint } from "./etf";
import { sentimentRead, pricedSentimentSeries, bandFor, SENTIMENT_AVAILABLE } from "./sentiment";
import { currentSentiment } from "./sentiment";
import { accumulationRead, ACCUMULATION_BANDS } from "./accumulation";
import { runAccumulationBacktest } from "./accumulationBacktest";
import { SITE_HOST } from "./site";

// Fear & Greed band → hex, matching the standard palette.
const TONE_HEX: Record<string, string> = {
  red: "#ff5d5d",
  amber: "#f5b942",
  muted: "#9aa6b4",
  green: "#3ddc97",
  teal: "#5eead4",
};
import { CYCLES, SOURCE, TODAY_DAY_IN_CYCLE } from "./btcData";
import { fmtUsd, fmtPct } from "./format";

export type CardId =
  | "hero"
  | "changed"
  | "history"
  | "cycle_overlay"
  | "cycle_timing"
  | "peak_low_windows"
  | "fear_greed"
  | "fear_greed_vs_price"
  | "watch"
  | "takeaway"
  | "cta"
  // Historical Context assets
  | "drawdowns"
  | "cycle_position"
  | "what_next"
  | "similar_moments"
  | "similar_top3"
  | "similar_context"
  | "similar_outcomes"
  | "similar_takeaway"
  | "hist_takeaway"
  // Accumulation Index assets
  | "accumulation"
  | "accumulation_outcomes"
  // Market Health assets (flagship pack)
  | "market_health"
  | "health_strengths"
  | "health_watch"
  | "health_history"
  | "health_interpretation"
  // ETF Flow assets
  | "etf_hero"
  | "etf_today"
  | "etf_trend"
  | "etf_context"
  | "etf_why";

// The Daily Brief Pack — the established 11-card daily carousel (unchanged).
export const CARD_ORDER: CardId[] = [
  "hero",
  "changed",
  "history",
  "cycle_overlay",
  "cycle_timing",
  "peak_low_windows",
  "fear_greed",
  "fear_greed_vs_price",
  "watch",
  "takeaway",
  "cta",
];

export const CARD_LABELS: Record<CardId, { kicker: string; name: string }> = {
  hero: { kicker: "Daily Bitcoin Cycle Brief", name: "Hero summary" },
  changed: { kicker: "What changed today", name: "What changed" },
  history: { kicker: "Today vs history", name: "Today vs history" },
  cycle_overlay: { kicker: "Every cycle from day zero", name: "Cycle overlay" },
  cycle_timing: { kicker: "Cycle top & bottom", name: "Top & bottom outlook" },
  peak_low_windows: { kicker: "Peak & low windows", name: "Peak & low windows" },
  fear_greed: { kicker: "Fear & Greed", name: "Fear & Greed" },
  fear_greed_vs_price: { kicker: "Fear & Greed vs price", name: "F&G vs price" },
  watch: { kicker: "What to watch next", name: "What to watch" },
  takeaway: { kicker: "Key takeaway", name: "Key takeaway" },
  cta: { kicker: "halvinglens.com", name: "Brand / CTA" },
  drawdowns: { kicker: "Historical drawdowns", name: "Historical drawdowns" },
  cycle_position: { kicker: "Current position in cycle", name: "Current position" },
  what_next: { kicker: "What happened next?", name: "What happened next?" },
  similar_moments: { kicker: "Similar moments", name: "Similar moment" },
  similar_top3: { kicker: "Similar moments", name: "Top 3 similar moments" },
  similar_context: { kicker: "Historical context", name: "Historical context" },
  similar_outcomes: { kicker: "What happened next?", name: "Similar · what happened next" },
  similar_takeaway: { kicker: "Key takeaway", name: "Key takeaway" },
  hist_takeaway: { kicker: "Key takeaway", name: "Key takeaway" },
  accumulation: { kicker: "Accumulation Index", name: "Accumulation Index" },
  accumulation_outcomes: { kicker: "Accumulation Index", name: "Accumulation outcomes" },
  market_health: { kicker: "Market Health", name: "Market Health gauge" },
  health_strengths: { kicker: "What's constructive", name: "Constructive factors" },
  health_watch: { kicker: "What's stretched", name: "Stretched factors" },
  health_history: { kicker: "Historical range", name: "Where today sits" },
  health_interpretation: { kicker: "Interpretation", name: "Interpretation" },
  etf_hero: { kicker: "Bitcoin ETF Flows", name: "ETF flows hero" },
  etf_today: { kicker: "Today's flows", name: "Today's flows" },
  etf_trend: { kicker: "Trend", name: "7d & 30d trend" },
  etf_context: { kicker: "Historical context", name: "Flows vs history" },
  etf_why: { kicker: "Why it matters", name: "Why it matters" },
};

export type Dir = "up" | "down" | "flat";

export interface StatItem {
  label: string;
  value: string;
  tone?: "accent" | "green" | "amber" | "red" | "default";
}
export interface DeltaRow {
  label: string;
  value: string;
  dir: Dir;
}
export interface HistoryRow {
  label: string;
  value: string;
  current?: boolean;
}
export interface WatchRow {
  signal: string;
  status: string;
}

export interface HeroCard {
  kind: "hero";
  dateLabel: string;
  price: string;
  cycleDay: number;
  progressPct: number;
  score: number;
  scoreLabel: string;
  scoreColor: string;
  sentiment: string;
  etf: string;
}
export interface ChangedCard {
  kind: "changed";
  available: boolean;
  rows: DeltaRow[];
  largest: string | null;
  sinceLabel: string | null;
}
export interface HistoryCard {
  kind: "history";
  cycleDay: number;
  caption: string;
  rows: HistoryRow[];
}
export interface WatchCard {
  kind: "watch";
  rows: WatchRow[];
}
export interface TakeawayCard {
  kind: "takeaway";
  text: string;
}
export interface CtaCard {
  kind: "cta";
  features: string[];
}

// A polyline for an SVG chart card: points are normalised to 0..1 (x left→right,
// y bottom→top) so the template just scales them to pixels.
export interface ChartLine {
  label: string;
  color: string;
  points: [number, number][];
}
export interface OverlayCard {
  kind: "cycle_overlay";
  available: boolean;
  lines: ChartLine[];
  yTicks: { label: string; frac: number }[]; // log multiple gridlines
}
export interface CycleTimingCard {
  kind: "cycle_timing";
  available: boolean;
  peakRange: string;
  bottomRange: string;
  peakDays: string;
  bottomDays: string;
  todayDay: number;
  position: string;
  note: string;
}
export interface PeakLowCard {
  kind: "peak_low_windows";
  available: boolean;
  rows: { label: string; color: string; peak: string; low: string }[];
  peakWindow: string;
  bottomWindow: string;
}
export interface FearGreedCard {
  kind: "fear_greed";
  available: boolean;
  value: number;
  label: string;
  tone: string;
  summary: string;
}
export interface FgVsPricePoint {
  x: number; // 0..1 time
  y: number; // 0..1 log price
  color: string; // that day's Fear & Greed band colour
}
export interface FgVsPriceCard {
  kind: "fear_greed_vs_price";
  available: boolean;
  points: FgVsPricePoint[];
  priceRange: string;
}

// ── Historical Context assets ────────────────────────────────────────────────
export interface DrawdownRow {
  label: string;
  color: string;
  stage: number; // drawdown at equivalent cycle stage, %, ≤ 0
  largest: number; // deepest drawdown by that stage, %, ≤ 0
  current: boolean;
}
export interface DrawdownsCard {
  kind: "drawdowns";
  available: boolean;
  cycleDay: number;
  current: number; // current cycle drawdown, %, ≤ 0
  largestThisCycle: number;
  avgAtStage: number;
  rows: DrawdownRow[];
  takeaway: string;
}
export interface CyclePositionCard {
  kind: "cycle_position";
  available: boolean;
  todayDay: number;
  axisMax: number;
  peakStart: number;
  peakEnd: number;
  lowStart: number;
  lowEnd: number;
  todayLabel: string; // "Day 775"
  peakLabel: string; // "Day 371–546"
  lowLabel: string; // "Day 777–924"
  position: string; // one-line plain-English placement
  note: string;
}
export interface WhatNextRowView {
  year: string;
  color: string;
  d30: number | null;
  d60: number | null;
  d90: number | null;
}
export interface WhatNextCard {
  kind: "what_next";
  available: boolean;
  cycleDay: number;
  rows: WhatNextRowView[];
  avg30: number | null;
  avg60: number | null;
  avg90: number | null;
}

export interface SimilarMomentsCard {
  kind: "similar_moments";
  available: boolean;
  cycleDay: number;
  drawdown: number;
  fearGreed: number | null;
  matchLabel: string; // "July 2020"
  matchYear: string;
  similarity: number; // 0..100
}
export interface SimilarOutcomesCard {
  kind: "similar_outcomes";
  available: boolean;
  matchLabel: string;
  matchYear: string;
  d30: number | null;
  d60: number | null;
  d90: number | null;
}
export interface SimilarTop3Row {
  rank: number;
  label: string;
  year: string;
  similarity: number;
  color: string;
}
export interface SimilarTop3Card {
  kind: "similar_top3";
  available: boolean;
  rows: SimilarTop3Row[];
}
export interface SimilarContextCard {
  kind: "similar_context";
  available: boolean;
  matchLabel: string;
  matchYear: string;
  context: string;
  price: string;
  drawdown: number;
  mayer: number;
  gainMult: number;
  fearGreed: number | null;
}

export interface AccumulationCardView {
  kind: "accumulation";
  score: number;
  bandLabel: string;
  bandColor: string;
  percentile: number; // historical percentile of today's score
  factors: { label: string; value: string }[];
  takeaway: string;
}

export interface AccumulationOutcomesCardView {
  kind: "accumulation_outcomes";
  todayBandLabel: string;
  todayBandColor: string;
  rows: { label: string; color: string; median1y: number | null; median2y: number | null; current: boolean }[];
  takeaway: string;
}

// ── Market Health assets (flagship pack) ─────────────────────────────────────
// All derived from the existing composite cycle scorecard (cycleScorecard) — no
// new calculations. High score = calmer / earlier-cycle; low = stretched / late.
export interface MarketHealthCard {
  kind: "market_health";
  score: number; // 0-100 composite
  label: string; // Cool / Neutral / Warm / Elevated / Euphoric
  color: string;
  interpretation: string;
  factorCount: number;
}
export interface HealthFactorRow {
  label: string;
  status: string;
  score: number;
  explanation: string;
}
export interface HealthFactorsCard {
  kind: "health_strengths" | "health_watch";
  heading: string;
  tone: Dir; // up (constructive) / down (stretched)
  rows: HealthFactorRow[];
  empty: string;
}
export interface HealthBand {
  label: string;
  color: string;
  lo: number;
  hi: number;
}
export interface HealthHistoryCard {
  kind: "health_history";
  score: number;
  color: string;
  label: string;
  bands: HealthBand[];
  note: string;
}
export interface HealthInterpretationCard {
  kind: "health_interpretation";
  text: string;
}

// ── ETF Flow assets ──────────────────────────────────────────────────────────
// Aggregate US spot BTC ETF flows only (no per-issuer source today). All derived
// from etfStats() + ETF.points and guarded on ETF.connected, so nothing is
// fabricated when the source is offline.
export interface EtfHeroCard {
  kind: "etf_hero";
  available: boolean;
  dateLabel: string;
  netFlow: string;
  dir: Dir;
  headline: string;
  cumulative: string;
}
export interface EtfCompareStat {
  label: string;
  value: string;
  dir: Dir;
}
export interface EtfTodayCard {
  kind: "etf_today";
  available: boolean;
  today: string;
  todayDir: Dir;
  stats: EtfCompareStat[];
}
export interface EtfTrendCard {
  kind: "etf_trend";
  available: boolean;
  week: string;
  weekDir: Dir;
  month: string;
  monthDir: Dir;
  line: ChartLine;
  note: string;
}
export interface EtfBar {
  label: string;
  value: string;
  pct: number;
  color: string;
  highlight?: boolean;
}
export interface EtfContextCard {
  kind: "etf_context";
  available: boolean;
  bars: EtfBar[];
  note: string;
}
export interface EtfWhyCard {
  kind: "etf_why";
  available: boolean;
  headline: string;
  points: string[];
}

export type CardBody =
  | MarketHealthCard
  | HealthFactorsCard
  | HealthHistoryCard
  | HealthInterpretationCard
  | EtfHeroCard
  | EtfTodayCard
  | EtfTrendCard
  | EtfContextCard
  | EtfWhyCard
  | HeroCard
  | ChangedCard
  | HistoryCard
  | OverlayCard
  | CycleTimingCard
  | PeakLowCard
  | FearGreedCard
  | FgVsPriceCard
  | WatchCard
  | TakeawayCard
  | CtaCard
  | DrawdownsCard
  | CyclePositionCard
  | WhatNextCard
  | SimilarMomentsCard
  | SimilarOutcomesCard
  | SimilarTop3Card
  | SimilarContextCard
  | AccumulationCardView
  | AccumulationOutcomesCardView;

export interface Card {
  id: CardId;
  index: number; // 1-based
  total: number;
  kicker: string;
  body: CardBody;
}

export interface Deck {
  slug: string;
  dateLabel: string;
  cards: Card[];
}

const SCORE_COLORS: Record<string, string> = {
  Cool: "#5aa9ff",
  Neutral: "#5eead4",
  Warm: "#3ddc97",
  Elevated: "#f5b942",
  Euphoric: "#ff5d5d",
};

function signedUsd(n: number): string {
  return `${n >= 0 ? "+" : "-"}${fmtUsd(Math.abs(n), { compact: true })}`;
}
function signedPts(n: number): string {
  const r = Math.round(n);
  return `${r >= 0 ? "+" : ""}${r} pts`;
}
function dirOf(n: number, eps = 0): Dir {
  return n > eps ? "up" : n < -eps ? "down" : "flat";
}

function heroCard(): HeroCard {
  const s = cycleSummary();
  const sc = cycleScorecard();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const etfText = (() => {
    if (!ETF.connected) return "Not connected";
    const wk = etfStats().trailingWeek;
    const dir = wk > 0 ? "Positive" : wk < 0 ? "Negative" : "Flat";
    return `${dir} · ${fmtUsd(Math.abs(wk), { compact: true })} / wk`;
  })();
  return {
    kind: "hero",
    dateLabel: format(briefDate(), "d MMMM yyyy"),
    price: fmtUsd(s.price),
    cycleDay: s.cycleDay,
    progressPct: s.progressPct,
    score: sc.overall,
    scoreLabel: sc.overallLabel,
    scoreColor: SCORE_COLORS[sc.overallLabel] ?? "#5eead4",
    sentiment: sr ? `${sr.band.label} (${sr.value})` : "—",
    etf: etfText,
  };
}

function changedCard(): ChangedCard {
  const prior = priorBrief();
  if (!prior) {
    return { kind: "changed", available: false, rows: [], largest: null, sinceLabel: null };
  }
  const sc = cycleScorecard();
  const rows: DeltaRow[] = [];
  let largest: string | null = null;

  // ETF flows — change in cumulative net flow since the prior brief.
  if (ETF.connected && prior.etfCumulative != null) {
    const delta = etfStats().cumulative - prior.etfCumulative;
    if (Math.abs(delta) >= 1e6) {
      rows.push({ label: "ETF flows", value: signedUsd(delta), dir: dirOf(delta) });
      largest = delta > 0 ? "ETF inflows strengthened." : "ETF outflows increased.";
    }
  }
  // Sentiment — Fear & Greed point change.
  if (SENTIMENT_AVAILABLE && prior.sentimentValue != null) {
    const cur = currentSentiment();
    if (cur) {
      const delta = cur.value - prior.sentimentValue;
      rows.push({ label: "Sentiment", value: signedPts(delta), dir: dirOf(delta, 0.5) });
      if (!largest && Math.abs(delta) >= 4)
        largest = delta > 0 ? "Sentiment improved." : "Sentiment softened.";
    }
  }
  // Cycle score — only once a prior score has been stored.
  if (prior.cycleScore != null) {
    const delta = sc.overall - prior.cycleScore;
    rows.push({ label: "Cycle score", value: signedPts(delta), dir: dirOf(delta, 0.5) });
  }
  // Price.
  if (prior.price > 0) {
    const pct = (cycleSummary().price / prior.price - 1) * 100;
    rows.push({ label: "BTC price", value: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`, dir: dirOf(pct, 0.2) });
    if (!largest && Math.abs(pct) >= 4) largest = pct > 0 ? "Price moved higher." : "Price pulled back.";
  }

  return {
    kind: "changed",
    available: rows.length > 0,
    rows,
    largest,
    sinceLabel: prior.dateLabel,
  };
}

function historyCard(): HistoryCard {
  const priors = priorCyclesAtSameDay();
  const rows: HistoryRow[] = priors.map((p) => ({
    label: `${p.cycle.halvingDate.slice(0, 4)} cycle`,
    value: `${(1 + p.gainFromHalving / 100).toFixed(1)}×`,
  }));
  rows.push({
    label: "Current cycle",
    value: `${(1 + currentGainFromHalving() / 100).toFixed(1)}×`,
    current: true,
  });
  return {
    kind: "history",
    cycleDay: TODAY_DAY_IN_CYCLE,
    caption: `Price as a multiple of the halving price, at day ${TODAY_DAY_IN_CYCLE} of each cycle.`,
    rows,
  };
}

function watchCard(): WatchCard {
  const s = cycleSummary();
  return {
    kind: "watch",
    rows: s.watchSignals.slice(0, 3).map((w) => ({ signal: w.signal, status: w.status })),
  };
}

function takeawayCard(): TakeawayCard {
  const s = cycleSummary();
  // 2–3 short, factual sentences from the brief read. No hype, no predictions,
  // no price targets. Second line is a distinct risk read, not a restatement.
  const parts = [s.summary.trim()];
  if (s.heatPercentile != null) {
    parts.push(
      `Risk reads ${HEAT_LABEL[s.heat].toLowerCase()} — around the ${s.heatPercentile}th percentile of its historical range versus its long-term average.`,
    );
  }
  return { kind: "takeaway", text: parts.join(" ") };
}

function ctaCard(): CtaCard {
  return {
    kind: "cta",
    features: ["Daily briefs", "Historical comparisons", "ETF flows", "Sentiment analysis"],
  };
}

// Evenly downsample an array to at most `max` points (keeps first + last).
function downsample<T>(arr: T[], max: number): T[] {
  if (arr.length <= max) return arr;
  const step = (arr.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

// ── Every halving cycle, lined up from day zero (log-multiple overlay) ────────
function overlayCard(): OverlayCard {
  const MS = 86_400_000;
  const series = CYCLES.map((c) => {
    const base = c.samples[0]?.price || 1;
    return {
      label: c.halvingDate.slice(0, 4),
      color: c.color,
      pts: c.samples.filter((s) => s.price > 0).map((s) => ({ day: s.day, mult: s.price / base })),
    };
  }).filter((s) => s.pts.length > 2);

  if (!series.length) return { kind: "cycle_overlay", available: false, lines: [], yTicks: [] };

  const maxDay = Math.max(...series.flatMap((s) => s.pts.map((p) => p.day)), 1);
  const allMult = series.flatMap((s) => s.pts.map((p) => p.mult));
  const loMult = Math.max(0.2, Math.min(...allMult));
  const hiMult = Math.max(...allMult);
  const lLo = Math.log10(loMult);
  const lHi = Math.log10(hiMult);
  const yFrac = (m: number) => (Math.log10(m) - lLo) / (lHi - lLo || 1);

  const lines: ChartLine[] = series.map((s) => ({
    label: s.label,
    color: s.color,
    points: downsample(s.pts, 60).map((p) => [p.day / maxDay, yFrac(p.mult)] as [number, number]),
  }));

  // Log gridlines at powers of 10 within range (e.g. 1×, 10×, 100×).
  const yTicks: { label: string; frac: number }[] = [];
  for (let e = Math.ceil(lLo); e <= Math.floor(lHi); e++) {
    const m = 10 ** e;
    yTicks.push({ label: `${m}×`, frac: (e - lLo) / (lHi - lLo || 1) });
  }
  void MS;
  return { kind: "cycle_overlay", available: true, lines, yTicks };
}

// ── When could the current cycle top & bottom? ───────────────────────────────
function cycleTimingCard(): CycleTimingCard {
  const t = cycleTiming();
  const mon = (iso: string) => format(new Date(iso), "MMM yyyy");
  const position =
    t.todayVsBottom === "before"
      ? `Today is day ${t.todayDay} — the historical low window opens ${mon(t.bottomWindow.startDate)}.`
      : t.todayVsBottom === "within"
        ? `Today (day ${t.todayDay}) sits inside the historical low window.`
        : `Today (day ${t.todayDay}) is past the historical low window.`;
  return {
    kind: "cycle_timing",
    available: true,
    peakRange: `${mon(t.peakWindow.startDate)} – ${mon(t.peakWindow.endDate)}`,
    bottomRange: `${mon(t.bottomWindow.startDate)} – ${mon(t.bottomWindow.endDate)}`,
    peakDays: `${t.peakWindow.minDay}–${t.peakWindow.maxDay} days after halving`,
    bottomDays: `${t.bottomWindow.minDay}–${t.bottomWindow.maxDay} days after halving`,
    todayDay: t.todayDay,
    position,
    note: "The rhythm of three completed cycles — context, not a forecast. The ETF era may break it.",
  };
}

// ── Peak & low windows (per prior cycle) ─────────────────────────────────────
function peakLowCard(): PeakLowCard {
  const t = cycleTiming();
  const priors = cyclePeakTroughs().filter((r) => r.id !== 5);
  const rows = priors.map((r) => ({
    label: `${r.halvingDate.slice(0, 4)} cycle`,
    color: r.color,
    peak: r.peakDate ? `${format(new Date(r.peakDate), "MMM yyyy")} · d${r.peakDay}` : `d${r.peakDay}`,
    low: r.bottomDate ? `${format(new Date(r.bottomDate), "MMM yyyy")} · d${r.bottomDay}` : "—",
  }));
  return {
    kind: "peak_low_windows",
    available: rows.length > 0,
    rows,
    peakWindow: `${t.peakWindow.minDay}–${t.peakWindow.maxDay} days`,
    bottomWindow: `${t.bottomWindow.minDay}–${t.bottomWindow.maxDay} days`,
  };
}

// ── Fear & Greed — what it's telling us ──────────────────────────────────────
function fearGreedCard(): FearGreedCard {
  const r = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  if (!r) {
    return { kind: "fear_greed", available: false, value: 0, label: "—", tone: "muted", summary: "" };
  }
  return {
    kind: "fear_greed",
    available: true,
    value: r.value,
    label: r.band.label,
    tone: r.band.tone,
    summary: r.summary,
  };
}

// ── Fear & Greed vs Bitcoin price (overlay) ──────────────────────────────────
function fgVsPriceCard(): FgVsPriceCard {
  const raw = SENTIMENT_AVAILABLE ? pricedSentimentSeries() : [];
  if (raw.length < 5) {
    return { kind: "fear_greed_vs_price", available: false, points: [], priceRange: "" };
  }
  const pts = downsample(raw, 120); // denser so the colour transitions read cleanly
  const t0 = pts[0].ts;
  const t1 = pts[pts.length - 1].ts;
  const prices = pts.map((p) => p.price);
  const pLo = Math.log10(Math.min(...prices));
  const pHi = Math.log10(Math.max(...prices));
  const points: FgVsPricePoint[] = pts.map((p) => ({
    x: (p.ts - t0) / (t1 - t0 || 1),
    y: (Math.log10(p.price) - pLo) / (pHi - pLo || 1),
    color: TONE_HEX[bandFor(p.value).tone] ?? "#9aa6b4",
  }));
  return {
    kind: "fear_greed_vs_price",
    available: true,
    points,
    priceRange: `${fmtUsd(Math.min(...prices), { compact: true })} – ${fmtUsd(Math.max(...prices), { compact: true })}`,
  };
}

// ── Historical drawdowns — "Is this drop normal?" ────────────────────────────
function drawdownsCard(): DrawdownsCard {
  const a = drawdownAnalysis();
  return {
    kind: "drawdowns",
    available: a.available,
    cycleDay: a.cycleDay,
    current: a.current,
    largestThisCycle: a.largestThisCycle,
    avgAtStage: a.avgAtStage,
    rows: a.rows.map((r) => ({
      label: r.isCurrent ? "Current cycle" : `${r.year} cycle`,
      color: r.color,
      stage: r.drawdownAtStage,
      largest: r.largestSoFar,
      current: r.isCurrent,
    })),
    takeaway: a.takeaway,
  };
}

// ── Current position in cycle — "Where are we now?" ──────────────────────────
function cyclePositionCard(): CyclePositionCard {
  const t = cycleTiming();
  const axisMax = Math.max(t.bottomWindow.maxDay + 150, t.todayDay + 90, 1100);

  const inPeak = t.todayDay >= t.peakWindow.minDay && t.todayDay <= t.peakWindow.maxDay;
  const beforePeak = t.todayDay < t.peakWindow.minDay;
  const inLow = t.todayDay >= t.bottomWindow.minDay && t.todayDay <= t.bottomWindow.maxDay;
  const afterLow = t.todayDay > t.bottomWindow.maxDay;
  const position = beforePeak
    ? "Earlier than the window where past cycles set their bull-market top."
    : inPeak
      ? "Inside the window where past cycles set their bull-market top."
      : inLow
        ? "Inside the window where past cycles reached their bear-market low."
        : afterLow
          ? "Past the window where past cycles reached their bear-market low."
          : "Past the historical top window, ahead of the historical low window.";

  return {
    kind: "cycle_position",
    available: true,
    todayDay: t.todayDay,
    axisMax,
    peakStart: t.peakWindow.minDay,
    peakEnd: t.peakWindow.maxDay,
    lowStart: t.bottomWindow.minDay,
    lowEnd: t.bottomWindow.maxDay,
    todayLabel: `Day ${t.todayDay}`,
    peakLabel: `Day ${t.peakWindow.minDay}–${t.peakWindow.maxDay}`,
    lowLabel: `Day ${t.bottomWindow.minDay}–${t.bottomWindow.maxDay}`,
    position,
    note: "Three completed cycles — historical rhythm, not a forecast. The ETF era may break it.",
  };
}

// ── What happened next — 30/60/90 days, prior cycles only ────────────────────
function whatNextCard(): WhatNextCard {
  const w = whatHappenedNext();
  return {
    kind: "what_next",
    available: w.rows.some((r) => r.d30 != null || r.d60 != null || r.d90 != null),
    cycleDay: w.cycleDay,
    rows: w.rows.map((r) => ({
      year: r.year,
      color: r.color,
      d30: r.d30,
      d60: r.d60,
      d90: r.d90,
    })),
    avg30: w.avg30,
    avg60: w.avg60,
    avg90: w.avg90,
  };
}

// ── Similar moments — "Have we seen this before?" ────────────────────────────
function similarMomentsCard(): SimilarMomentsCard {
  const top = similarMoments(1)[0];
  const cur = currentMoment();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  return {
    kind: "similar_moments",
    available: !!top,
    cycleDay: cur.day,
    drawdown: cur.drawdown,
    fearGreed: sr?.value ?? null,
    matchLabel: top?.dateLabel ?? "—",
    matchYear: top?.year ?? "",
    similarity: top?.similarity ?? 0,
  };
}

function similarOutcomesCard(): SimilarOutcomesCard {
  const top = similarMoments(1)[0];
  return {
    kind: "similar_outcomes",
    available: !!top,
    matchLabel: top?.dateLabel ?? "—",
    matchYear: top?.year ?? "",
    d30: top?.next.d30 ?? null,
    d60: top?.next.d60 ?? null,
    d90: top?.next.d90 ?? null,
  };
}

function similarTop3Card(): SimilarTop3Card {
  const moments = similarMoments(3);
  return {
    kind: "similar_top3",
    available: moments.length > 0,
    rows: moments.map((m, i) => ({
      rank: i + 1,
      label: m.dateLabel,
      year: m.year,
      similarity: m.similarity,
      color: m.color,
    })),
  };
}

function similarContextCard(): SimilarContextCard {
  const top = similarMoments(1)[0];
  return {
    kind: "similar_context",
    available: !!top,
    matchLabel: top?.dateLabel ?? "—",
    matchYear: top?.year ?? "",
    context: top?.context ?? "",
    price: top ? fmtUsd(top.metrics.price, { compact: true }) : "—",
    drawdown: top?.metrics.drawdown ?? 0,
    mayer: top?.metrics.mayer ?? 0,
    gainMult: top?.metrics.gainMult ?? 0,
    fearGreed: top?.metrics.fearGreed ?? null,
  };
}

// Key takeaway for the Similar Moments Pack — always the "similar" read.
function similarTakeawayCard(): TakeawayCard {
  return { kind: "takeaway", text: historicalTakeawayText("similar") };
}

// Narrative-specific Key Takeaway for the Historical Context Pack (≤ 2 sentences).
function histTakeawayCard(): TakeawayCard {
  return { kind: "takeaway", text: historicalTakeawayText(selectHistoricalNarrative().narrative) };
}

function accumulationCard(): AccumulationCardView {
  const r = accumulationRead();
  const takeaway =
    `Conditions read ${r.score}/100 — ${r.band.label.toLowerCase()}, ` +
    `lower in its history than ${100 - r.historicalPercentile}% of all weeks since 2012. Historical context, not a forecast.`;
  return {
    kind: "accumulation",
    score: r.score,
    bandLabel: r.band.label,
    bandColor: r.band.color,
    percentile: r.historicalPercentile,
    factors: r.factors.map((f) => ({ label: f.factor, value: f.reading })),
    takeaway,
  };
}

// Cross-channel copy for the Accumulation Index pack. Same careful framing —
// historical context, no predictions, no price targets.
export function accumulationContentPack(): import("./brief").ContentPack {
  const r = accumulationRead();
  const pct = 100 - r.historicalPercentile;
  const band = r.band.label.toLowerCase();
  const link = `https://${SITE_HOST}/accumulation`;
  const x1 = `Bitcoin Accumulation Index: ${r.score}/100 — ${band}.`;
  const x2 = `That's lower in its history than ${pct}% of all weeks since 2012. ${r.reasoning}`;
  const xThread = [
    `${x1}\n\nA price-only, historically-backtested read on how today's accumulation environment compares with Bitcoin's own past.`,
    x2,
    `In past cycles, the more attractive (lower-score) the environment, the stronger the median forward returns 1–2 years later. The 4-year read rests on only 2–3 cycles, so we flag it as indicative.\n\nHistorical context, not a forecast.`,
    `See the full index, timeline and Dynamic DCA backtest: ${link}\n\nEducational analysis, not financial advice.`,
  ];
  const instagram = [
    `Bitcoin Accumulation Index: ${r.score}/100`,
    "",
    `Today's conditions read as ${band} — lower in Bitcoin's history than ${pct}% of all weeks since 2012.`,
    "",
    "A price-only gauge of how the accumulation environment compares with the past — backtested across every cycle. Historical context, not a prediction or advice.",
    "",
    `Full breakdown → ${link}`,
    "",
    "#bitcoin #btc #crypto #dca #bitcoinhalving",
  ].join("\n");
  const linkedin = [
    `Bitcoin Accumulation Index: ${r.score}/100 — ${band}.`,
    "",
    `${r.reasoning}`,
    "",
    `The index is built only from real, price-based history (Mayer Multiple, 200-week MA multiple and drawdown from the running high), computed point-in-time so every past reading is exactly what an observer would have seen then — which is what makes the backtest legitimate.`,
    "",
    `Explore the index, the colour-coded historical timeline and a Dynamic DCA backtest: ${link}`,
    "",
    "Historical context only. Not financial advice.",
  ].join("\n");
  const emailSubject = `Accumulation Index: ${r.score}/100 — ${band}`;
  const emailBody = [
    `Bitcoin's Accumulation Index reads ${r.score}/100 today — ${band}.`,
    "",
    r.reasoning,
    "",
    `That's lower in its history than ${pct}% of all weeks since 2012.`,
    "",
    `See the full index, the historical timeline and the Dynamic DCA backtest: ${link}`,
    "",
    "Historical context only. Past behaviour is not a forecast. Not financial advice.",
  ].join("\n");
  return { xPost: x1, xThread, instagram, linkedin, emailSubject, emailBody };
}

// Cross-channel copy for the Market Health pack. Reuses the composite scorecard;
// same careful framing — a condition reading, no predictions, no price targets.
export function marketHealthContentPack(): import("./brief").ContentPack {
  const sc = cycleScorecard();
  const byScore = [...sc.factors].sort((a, b) => b.score - a.score);
  const strong = byScore[0];
  const weak = byScore[byScore.length - 1];
  const link = `https://${SITE_HOST}`;
  const x1 = `Bitcoin Market Health: ${sc.overall}/100 — ${sc.overallLabel}.`;
  const xThread = [
    `${x1}\n\nA multi-factor read of the cycle environment — cycle timing, price structure, ETF demand, sentiment and miner health, each scored 0–100. A condition reading, not a buy/sell signal.`,
    sc.interpretation,
    strong ? `Most constructive right now: ${strong.factor} — ${strong.status}. ${strong.explanation}` : "",
    weak && weak !== strong ? `Watching: ${weak.factor} — ${weak.status}. ${weak.explanation}` : "",
    `See the full breakdown → ${link}\n\nHistorical context, not a forecast. Not financial advice.`,
  ].filter(Boolean) as string[];
  const instagram = [
    `Bitcoin Market Health: ${sc.overall}/100`,
    "",
    `${sc.overallLabel}. ${sc.interpretation}`,
    "",
    strong ? `Constructive → ${strong.factor} (${strong.status})` : "",
    weak && weak !== strong ? `Watching → ${weak.factor} (${weak.status})` : "",
    "",
    "A multi-factor condition reading of the cycle environment — not a prediction or advice.",
    "",
    `Full breakdown → ${link}`,
    "",
    "#bitcoin #btc #crypto #bitcoinhalving #marketcycle",
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
  const linkedin = [
    `Bitcoin Market Health: ${sc.overall}/100 — ${sc.overallLabel}.`,
    "",
    sc.interpretation,
    "",
    `Scored across ${sc.factors.length} factors — ${sc.factors.map((f) => f.factor).join(", ")} — each a 0–100 condition reading drawn from live, historically-grounded data. It describes the environment; it is never a buy or sell signal.`,
    "",
    `Explore the full read: ${link}`,
    "",
    "Historical context only. Not financial advice.",
  ].join("\n");
  const emailSubject = `Market Health: ${sc.overall}/100 — ${sc.overallLabel}`;
  const emailBody = [
    `Bitcoin's Market Health reads ${sc.overall}/100 today — ${sc.overallLabel}.`,
    "",
    sc.interpretation,
    "",
    strong ? `Most constructive: ${strong.factor} (${strong.status}).` : "",
    weak && weak !== strong ? `Watching: ${weak.factor} (${weak.status}).` : "",
    "",
    `See the full multi-factor breakdown: ${link}`,
    "",
    "Historical context only. Past behaviour is not a forecast. Not financial advice.",
  ]
    .filter(Boolean)
    .join("\n");
  return { xPost: x1, xThread, instagram, linkedin, emailSubject, emailBody };
}

function accumulationOutcomesCard(): AccumulationOutcomesCardView {
  const r = accumulationRead();
  const bt = runAccumulationBacktest();
  const rows = bt.bands.map((b) => {
    const h1 = b.horizons.find((h) => h.years === 1);
    const h2 = b.horizons.find((h) => h.years === 2);
    return {
      label: b.label.replace("Historically ", ""),
      color: ACCUMULATION_BANDS.find((x) => x.key === b.key)?.color ?? "#9aa6b4",
      median1y: h1?.median ?? null,
      median2y: h2?.median ?? null,
      current: b.key === r.band.key,
    };
  });
  return {
    kind: "accumulation_outcomes",
    todayBandLabel: r.band.label,
    todayBandColor: r.band.color,
    rows,
    takeaway:
      "In past cycles, more attractive (lower-score) conditions were followed by stronger median returns 1–2 years later. Historical context, not a forecast.",
  };
}

// ── Market Health pack (flagship) ────────────────────────────────────────────
// Reuses cycleScorecard() wholesale — same numbers that power the Daily hero —
// so there is zero duplicate logic. Presented with the scorecard's own honest
// labels (Cool→Euphoric): a condition reading, never a buy/sell signal.
function marketHealthCard(): MarketHealthCard {
  const sc = cycleScorecard();
  return {
    kind: "market_health",
    score: sc.overall,
    label: sc.overallLabel,
    color: SCORE_COLORS[sc.overallLabel] ?? "#5eead4",
    interpretation: sc.interpretation,
    factorCount: sc.factors.length,
  };
}

// Split the scorecard's factors by their current condition score. High-scoring
// factors read constructive (calmer/earlier-cycle); low-scoring ones read
// stretched. No time-series needed — a point-in-time condition split.
function healthFactorsCard(bucket: "strengths" | "watch"): HealthFactorsCard {
  const sc = cycleScorecard();
  const strong = sc.factors.filter((f) => f.score >= 50).sort((a, b) => b.score - a.score);
  const weak = sc.factors.filter((f) => f.score < 50).sort((a, b) => a.score - b.score);
  const chosen = (bucket === "strengths" ? strong : weak).slice(0, 4);
  return {
    kind: bucket === "strengths" ? "health_strengths" : "health_watch",
    heading: bucket === "strengths" ? "What's constructive" : "What's stretched",
    tone: bucket === "strengths" ? "up" : "down",
    rows: chosen.map((f) => ({ label: f.factor, status: f.status, score: f.score, explanation: f.explanation })),
    empty:
      bucket === "strengths"
        ? "No strongly constructive factors right now — conditions read mixed."
        : "Nothing looks stretched right now — a broadly calm read.",
  };
}

function healthHistoryCard(): HealthHistoryCard {
  const sc = cycleScorecard();
  return {
    kind: "health_history",
    score: sc.overall,
    color: SCORE_COLORS[sc.overallLabel] ?? "#5eead4",
    label: sc.overallLabel,
    // The scoreBand thresholds, as a labelled 0-100 scale (see cycleSummary.scoreBand).
    bands: [
      { label: "Euphoric", color: SCORE_COLORS.Euphoric, lo: 0, hi: 24 },
      { label: "Elevated", color: SCORE_COLORS.Elevated, lo: 25, hi: 39 },
      { label: "Warm", color: SCORE_COLORS.Warm, lo: 40, hi: 54 },
      { label: "Neutral", color: SCORE_COLORS.Neutral, lo: 55, hi: 74 },
      { label: "Cool", color: SCORE_COLORS.Cool, lo: 75, hi: 100 },
    ],
    note: "Higher = calmer, earlier-cycle. Lower = stretched, late-cycle. The marker shows where today sits across the full historical range.",
  };
}

function healthInterpretationCard(): HealthInterpretationCard {
  const sc = cycleScorecard();
  return { kind: "health_interpretation", text: `${sc.interpretation} Historical context, not a forecast.` };
}

// ── ETF Flow pack ─────────────────────────────────────────────────────────────
// Reuses etfStats() + ETF.points; 30-day totals and the cumulative mini-chart are
// derived from the same points (no new source). Per-issuer buyers/sellers are not
// available, so slide 2 shows the largest single-day inflow/outflow instead.
const ETF_ACCENT = "#5eead4";
const ETF_UP = "#3ddc97";
const ETF_DOWN = "#ff5d5d";

function etfDay(p: EtfFlowPoint | null): string {
  return p ? format(new Date(`${p.date}T00:00:00Z`), "d MMM yyyy") : "—";
}
function etfHeadline(n: number): string {
  return n > 0 ? "Net inflow" : n < 0 ? "Net outflow" : "Flat";
}
function trailing(pts: EtfFlowPoint[], n: number): number {
  return pts.slice(-n).reduce((s, p) => s + p.netFlow, 0);
}

function etfHeroCard(): EtfHeroCard {
  const e = etfStats();
  if (!ETF.connected || !e.latest) {
    return { kind: "etf_hero", available: false, dateLabel: "—", netFlow: "—", dir: "flat", headline: "—", cumulative: "—" };
  }
  const n = e.latest.netFlow;
  return {
    kind: "etf_hero",
    available: true,
    dateLabel: etfDay(e.latest),
    netFlow: signedUsd(n),
    dir: dirOf(n),
    headline: etfHeadline(n),
    cumulative: `${fmtUsd(e.cumulative, { compact: true })} cumulative since launch`,
  };
}

function etfTodayCard(): EtfTodayCard {
  const e = etfStats();
  if (!ETF.connected || !e.latest) {
    return { kind: "etf_today", available: false, today: "—", todayDir: "flat", stats: [] };
  }
  return {
    kind: "etf_today",
    available: true,
    today: signedUsd(e.latest.netFlow),
    todayDir: dirOf(e.latest.netFlow),
    stats: [
      { label: `Largest inflow day · ${etfDay(e.biggestInflow)}`, value: signedUsd(e.biggestInflow?.netFlow ?? 0), dir: "up" },
      { label: `Largest outflow day · ${etfDay(e.biggestOutflow)}`, value: signedUsd(e.biggestOutflow?.netFlow ?? 0), dir: "down" },
    ],
  };
}

function etfTrendCard(): EtfTrendCard {
  const e = etfStats();
  const pts = ETF.points;
  if (!ETF.connected || pts.length === 0) {
    return { kind: "etf_trend", available: false, week: "—", weekDir: "flat", month: "—", monthDir: "flat", line: { label: "", color: ETF_ACCENT, points: [] }, note: "" };
  }
  const week = e.trailingWeek;
  const month = trailing(pts, 30);
  const win = pts.slice(-120);
  const cum = win.map((p) => p.cumulative);
  const lo = Math.min(...cum);
  const denom = Math.max(...cum) - lo || 1;
  const points: [number, number][] = win.map((p, i) => [win.length > 1 ? i / (win.length - 1) : 0, (p.cumulative - lo) / denom]);
  return {
    kind: "etf_trend",
    available: true,
    week: signedUsd(week),
    weekDir: dirOf(week),
    month: signedUsd(month),
    monthDir: dirOf(month),
    line: { label: "Cumulative net flow", color: ETF_ACCENT, points },
    note: `Cumulative net flow · last ${win.length} days`,
  };
}

function etfContextCard(): EtfContextCard {
  const e = etfStats();
  const pts = ETF.points;
  if (!ETF.connected || !e.latest || !e.biggestInflow || !e.biggestOutflow) {
    return { kind: "etf_context", available: false, bars: [], note: "" };
  }
  const today = e.latest.netFlow;
  const maxMag = Math.max(Math.abs(e.biggestInflow.netFlow), Math.abs(e.biggestOutflow.netFlow), Math.abs(today), 1);
  const bar = (label: string, v: number, color: string, highlight = false): EtfBar => ({
    label,
    value: signedUsd(v),
    pct: Math.round((Math.abs(v) / maxMag) * 100),
    color,
    highlight,
  });
  // How unusual is today, by absolute magnitude percentile across all days.
  const absSorted = pts.map((p) => Math.abs(p.netFlow)).sort((a, b) => a - b);
  const pctile = Math.round((absSorted.filter((v) => v <= Math.abs(today)).length / absSorted.length) * 100);
  const note =
    pctile >= 90
      ? "Today is one of the largest daily flow days on record."
      : pctile >= 70
        ? "Today's flow is larger than usual versus history."
        : pctile <= 25
          ? "A quiet day for flows versus history."
          : "Today's flow is broadly typical versus history.";
  return {
    kind: "etf_context",
    available: true,
    bars: [
      bar("Today", today, today >= 0 ? ETF_UP : ETF_DOWN, true),
      bar(`Largest inflow · ${etfDay(e.biggestInflow)}`, e.biggestInflow.netFlow, ETF_UP),
      bar(`Largest outflow · ${etfDay(e.biggestOutflow)}`, e.biggestOutflow.netFlow, ETF_DOWN),
    ],
    note,
  };
}

function etfWhyCard(): EtfWhyCard {
  const e = etfStats();
  const pts = ETF.points;
  if (!ETF.connected || !e.latest) {
    return { kind: "etf_why", available: false, headline: "—", points: [] };
  }
  const week = e.trailingWeek;
  const month = trailing(pts, 30);
  const headline =
    week > 0 && month > 0
      ? "Institutional demand is building."
      : week > 0 && month <= 0
        ? "Demand is picking back up."
        : week <= 0 && month > 0
          ? "Demand is cooling from a strong stretch."
          : "Institutional demand is softening.";
  return {
    kind: "etf_why",
    available: true,
    headline,
    points: [
      `${signedUsd(week)} over the last 7 days.`,
      `${signedUsd(month)} over the last 30 days.`,
      `${fmtUsd(e.cumulative, { compact: true })} cumulative since spot ETFs launched.`,
      "Spot ETF demand is the structural variable that didn't exist in prior cycles.",
    ],
  };
}

// Cross-channel copy for the ETF Flow pack. Aggregate flows only; same careful
// framing — a condition reading of demand, never a prediction.
export function etfContentPack(): import("./brief").ContentPack {
  const e = etfStats();
  const pts = ETF.points;
  const today = e.latest?.netFlow ?? 0;
  const week = e.trailingWeek;
  const month = trailing(pts, 30);
  const dirWord = today > 0 ? "net inflow" : today < 0 ? "net outflow" : "flat flows";
  const cum = fmtUsd(e.cumulative, { compact: true });
  const link = `https://${SITE_HOST}/etf`;
  const x1 = `US spot Bitcoin ETFs: ${signedUsd(today)} ${dirWord} today.`;
  const xThread = [
    `${x1}\n\nWhat are institutions doing? A simple read on spot BTC ETF demand — the structural force that didn't exist in prior cycles.`,
    `${signedUsd(week)} over the last 7 days · ${signedUsd(month)} over the last 30 days.`,
    `Cumulative net flow since launch: ${cum}.`,
    `See the full ETF analysis → ${link}\n\nHistorical context, not a forecast. Not financial advice.`,
  ];
  const instagram = [
    `Bitcoin ETF Flows: ${signedUsd(today)} today`,
    "",
    `${signedUsd(week)} this week · ${signedUsd(month)} this month.`,
    `Cumulative since launch: ${cum}.`,
    "",
    "What are institutions doing? Spot ETF demand is the new structural force this cycle. Historical context, not a prediction or advice.",
    "",
    `Full ETF analysis → ${link}`,
    "",
    "#bitcoin #btc #etf #crypto #institutional",
  ].join("\n");
  const linkedin = [
    `US spot Bitcoin ETF flows: ${signedUsd(today)} ${dirWord} today.`,
    "",
    `Trailing 7 days: ${signedUsd(week)}. Trailing 30 days: ${signedUsd(month)}. Cumulative since launch: ${cum}.`,
    "",
    "Spot ETF demand is the defining structural variable of this Bitcoin cycle — a channel that simply didn't exist before 2024.",
    "",
    `Explore the full ETF flow analysis: ${link}`,
    "",
    "Historical context only. Not financial advice.",
  ].join("\n");
  const emailSubject = `ETF flows: ${signedUsd(today)} ${dirWord} today`;
  const emailBody = [
    `US spot Bitcoin ETFs saw ${signedUsd(today)} in ${dirWord} today.`,
    "",
    `That's ${signedUsd(week)} over the last 7 days and ${signedUsd(month)} over the last 30. Cumulative net flow since launch stands at ${cum}.`,
    "",
    `See the full ETF analysis: ${link}`,
    "",
    "Historical context only. Past behaviour is not a forecast. Not financial advice.",
  ].join("\n");
  return { xPost: x1, xThread, instagram, linkedin, emailSubject, emailBody };
}

const BUILDERS: Record<CardId, () => CardBody> = {
  hero: heroCard,
  changed: changedCard,
  history: historyCard,
  cycle_overlay: overlayCard,
  cycle_timing: cycleTimingCard,
  peak_low_windows: peakLowCard,
  fear_greed: fearGreedCard,
  fear_greed_vs_price: fgVsPriceCard,
  watch: watchCard,
  takeaway: takeawayCard,
  cta: ctaCard,
  drawdowns: drawdownsCard,
  cycle_position: cyclePositionCard,
  what_next: whatNextCard,
  similar_moments: similarMomentsCard,
  similar_top3: similarTop3Card,
  similar_context: similarContextCard,
  similar_outcomes: similarOutcomesCard,
  similar_takeaway: similarTakeawayCard,
  hist_takeaway: histTakeawayCard,
  accumulation: accumulationCard,
  accumulation_outcomes: accumulationOutcomesCard,
  market_health: marketHealthCard,
  health_strengths: () => healthFactorsCard("strengths"),
  health_watch: () => healthFactorsCard("watch"),
  health_history: healthHistoryCard,
  health_interpretation: healthInterpretationCard,
  etf_hero: etfHeroCard,
  etf_today: etfTodayCard,
  etf_trend: etfTrendCard,
  etf_context: etfContextCard,
  etf_why: etfWhyCard,
};

// ── Packs ─────────────────────────────────────────────────────────────────
// Two content types share one asset library: the Daily Brief Pack (the
// established 11-card daily carousel) and the Historical Context Pack (a
// 6-slide carousel whose lead assets are chosen by the strongest live
// narrative). Selection is deterministic, so the image route and the studio
// always agree on the same ordering for the same data snapshot.

export type PackId = "daily" | "historical" | "similar" | "accumulation" | "market_health" | "etf";

export const PACK_LABELS: Record<PackId, string> = {
  daily: "Daily Brief Pack",
  historical: "Historical Context Pack",
  similar: "Similar Moments Pack",
  accumulation: "Accumulation Index Pack",
  market_health: "Market Health Pack",
  etf: "ETF Flow Pack",
};

// The ETF Flow Pack — "what are institutions doing?": today's net flow → today
// vs largest days → 7d/30d trend → historical context → why it matters → CTA.
// Aggregate spot BTC ETF flows only (no per-issuer data source today).
export const ETF_PACK: CardId[] = ["etf_hero", "etf_today", "etf_trend", "etf_context", "etf_why", "cta"];

// The Market Health Pack — the flagship "how healthy is the market today?" read:
// gauge → constructive factors → stretched factors → historical range →
// interpretation → CTA. All six built from the composite cycle scorecard.
export const MARKET_HEALTH_PACK: CardId[] = [
  "market_health",
  "health_strengths",
  "health_watch",
  "health_history",
  "health_interpretation",
  "cta",
];

// The Accumulation Index Pack — a focused share asset (the index card) followed
// by the brand CTA. Instagram-ready 1080×1350 portrait, like every other card.
export const ACCUMULATION_PACK: CardId[] = ["accumulation", "accumulation_outcomes", "cta"];

// The Similar Moments Pack — a fixed, similarity-focused 6-slide carousel
// (independent of the Historical Context Pack's auto-selected narrative).
export const SIMILAR_PACK: CardId[] = [
  "similar_moments",
  "similar_top3",
  "similar_context",
  "similar_outcomes",
  "similar_takeaway",
  "cta",
];

export type Narrative = "similar" | "drawdown" | "fear_greed" | "position";

export interface HistoricalSelection {
  narrative: Narrative;
  title: string;
  reason: string;
  order: CardId[]; // exactly 6 cards, ending Key takeaway → CTA
}

// Pick the strongest historical story from the live data, then lay out the
// 6-slide carousel for it. The three layouts mirror the brief's Options A/B/C.
export function selectHistoricalNarrative(): HistoricalSelection {
  const dd = drawdownAnalysis();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const curDrawdown = Math.abs(dd.current);
  const fg = sr?.value ?? null;

  // 0) A strong historical analogue is the most compelling, most unique story —
  // it leads whenever today closely matches a real prior moment.
  const top = similarMoments(1)[0];
  if (top && top.similarity >= 80) {
    return {
      narrative: "similar",
      title: "What this moment rhymes with",
      reason: `${top.similarity}% match to ${top.dateLabel}`,
      order: ["similar_moments", "similar_outcomes", "cycle_position", "drawdowns", "hist_takeaway", "cta"],
    };
  }

  // A) A meaningful correction is the most shareable story during volatility.
  if (dd.available && curDrawdown >= 12) {
    return {
      narrative: "drawdown",
      title: "Current correction vs historical corrections",
      reason: `Bitcoin is ${Math.round(curDrawdown)}% below its cycle high`,
      order: ["drawdowns", "cycle_position", "what_next", "fear_greed", "hist_takeaway", "cta"],
    };
  }

  // C) A sentiment extreme is the next strongest hook.
  if (fg != null && (fg <= 25 || fg >= 75)) {
    return {
      narrative: "fear_greed",
      title: "Fear & Greed in historical context",
      reason: `Fear & Greed at ${fg}`,
      order: ["fear_greed", "fear_greed_vs_price", "drawdowns", "what_next", "hist_takeaway", "cta"],
    };
  }

  // B) Otherwise, frame where the cycle sits — the evergreen default.
  return {
    narrative: "position",
    title: "Where we sit in the cycle",
    reason: "No correction or sentiment extreme — leading with cycle position",
    order: ["cycle_overlay", "cycle_position", "peak_low_windows", "what_next", "hist_takeaway", "cta"],
  };
}

// Narrative-specific Key Takeaway — a short, distinct CONCLUSION (≤ 2 sentences,
// no predictions). Deliberately not a restatement of the data slides; it gives
// the one-line "so what" that closes the carousel and the captions.
export function historicalTakeawayText(narrative: Narrative): string {
  if (narrative === "similar") {
    const top = similarMoments(1)[0];
    const ml = top ? `${top.dateLabel}` : "earlier cycles";
    return `History rhymes more than it repeats. Today's conditions most resemble ${ml}, but the 2024 cycle's spot-ETF demand is a genuine structural difference — historical context, not a forecast.`;
  }
  if (narrative === "drawdown") {
    const dd = drawdownAnalysis();
    const curMag = Math.abs(dd.current);
    const avgMag = Math.abs(dd.avgAtStage);
    const rel = curMag < avgMag - 3 ? "shallower than" : curMag > avgMag + 3 ? "deeper than" : "broadly in line with";
    return `At day ${dd.cycleDay}, this cycle's drawdown is ${rel} what previous cycles showed at the same stage. Whether a drop is "normal" is best judged against history — context, not a forecast.`;
  }
  if (narrative === "fear_greed") {
    return "Sentiment matters most at the extremes, and only as a contrarian read. Where the cycle actually sits — by price and by timing — says more than the daily mood. Historical context, not a forecast.";
  }
  // position
  return "Cycle timing is a rhythm drawn from only three completed cycles, not a schedule. It frames where we are; the ETF era is the new variable that could break the pattern. Historical context, not a forecast.";
}

// The full set of valid card ids (the shared asset library) — used to validate
// the image route regardless of which pack a card belongs to.
export const ALL_CARD_IDS: CardId[] = Object.keys(CARD_LABELS) as CardId[];

export function isCardId(id: string): id is CardId {
  return (ALL_CARD_IDS as string[]).includes(id);
}

export function packOrder(packId: PackId): CardId[] {
  if (packId === "similar") return SIMILAR_PACK;
  if (packId === "historical") return selectHistoricalNarrative().order;
  if (packId === "accumulation") return ACCUMULATION_PACK;
  if (packId === "market_health") return MARKET_HEALTH_PACK;
  if (packId === "etf") return ETF_PACK;
  return CARD_ORDER;
}

export function buildCard(id: CardId, packId: PackId = "daily"): Card {
  const order = packOrder(packId);
  const index = order.indexOf(id);
  return {
    id,
    index: index >= 0 ? index + 1 : 1,
    total: order.length,
    kicker: CARD_LABELS[id].kicker,
    body: BUILDERS[id](),
  };
}

function packDateLabel(): string {
  // Human label for the studio meta line — includes the refresh time (UTC) so
  // it's clear how fresh the pack is, not just which day.
  const day = briefDate();
  return SOURCE.fetchedAt
    ? `${new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }).format(day)} UTC`
    : format(day, "d MMMM yyyy");
}

export function buildPack(packId: PackId): Deck {
  const order = packOrder(packId);
  return {
    slug: todaySlug(),
    dateLabel: packDateLabel(),
    cards: order.map((id) => buildCard(id, packId)),
  };
}

// Back-compat: the Daily Brief Pack.
export function buildDeck(): Deck {
  return buildPack("daily");
}
