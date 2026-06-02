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
import { priorCyclesAtSameDay, currentGainFromHalving } from "./cycleIntel";
import { cycleTiming, cyclePeakTroughs } from "./cycleTiming";
import { priorBrief, briefDate, todaySlug } from "./briefArchive";
import { etfStats, ETF } from "./etf";
import { sentimentRead, pricedSentimentSeries, SENTIMENT_AVAILABLE } from "./sentiment";
import { currentSentiment } from "./sentiment";
import { CYCLES } from "./btcData";
import { fmtUsd, fmtPct } from "./format";
import { TODAY_DAY_IN_CYCLE } from "./btcData";

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
  | "cta";

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
export interface FgVsPriceCard {
  kind: "fear_greed_vs_price";
  available: boolean;
  price: [number, number][];
  fg: [number, number][];
  priceRange: string;
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
  | CtaCard;

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
    return { kind: "fear_greed_vs_price", available: false, price: [], fg: [], priceRange: "" };
  }
  const pts = downsample(raw, 90);
  const t0 = pts[0].ts;
  const t1 = pts[pts.length - 1].ts;
  const prices = pts.map((p) => p.price);
  const pLo = Math.log10(Math.min(...prices));
  const pHi = Math.log10(Math.max(...prices));
  const xFrac = (ts: number) => (ts - t0) / (t1 - t0 || 1);
  const price = pts.map((p) => [xFrac(p.ts), (Math.log10(p.price) - pLo) / (pHi - pLo || 1)] as [number, number]);
  const fg = pts.map((p) => [xFrac(p.ts), p.value / 100] as [number, number]);
  return {
    kind: "fear_greed_vs_price",
    available: true,
    price,
    fg,
    priceRange: `${fmtUsd(Math.min(...prices), { compact: true })} – ${fmtUsd(Math.max(...prices), { compact: true })}`,
  };
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
};

export function buildCard(id: CardId): Card {
  const index = CARD_ORDER.indexOf(id);
  return {
    id,
    index: index + 1,
    total: CARD_ORDER.length,
    kicker: CARD_LABELS[id].kicker,
    body: BUILDERS[id](),
  };
}

export function buildDeck(): Deck {
  return {
    slug: todaySlug(),
    dateLabel: format(briefDate(), "d MMMM yyyy"),
    cards: CARD_ORDER.map(buildCard),
  };
}
