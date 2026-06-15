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
import { etfStats, ETF } from "./etf";
import { sentimentRead, pricedSentimentSeries, bandFor, SENTIMENT_AVAILABLE } from "./sentiment";
import { currentSentiment } from "./sentiment";
import { accumulationRead } from "./accumulation";
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
  // Accumulation Index asset
  | "accumulation";

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

export type CardBody =
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
  | AccumulationCardView;

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
};

// ── Packs ─────────────────────────────────────────────────────────────────
// Two content types share one asset library: the Daily Brief Pack (the
// established 11-card daily carousel) and the Historical Context Pack (a
// 6-slide carousel whose lead assets are chosen by the strongest live
// narrative). Selection is deterministic, so the image route and the studio
// always agree on the same ordering for the same data snapshot.

export type PackId = "daily" | "historical" | "similar" | "accumulation";

export const PACK_LABELS: Record<PackId, string> = {
  daily: "Daily Brief Pack",
  historical: "Historical Context Pack",
  similar: "Similar Moments Pack",
  accumulation: "Accumulation Index Pack",
};

// The Accumulation Index Pack — a focused share asset (the index card) followed
// by the brand CTA. Instagram-ready 1080×1350 portrait, like every other card.
export const ACCUMULATION_PACK: CardId[] = ["accumulation", "cta"];

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
