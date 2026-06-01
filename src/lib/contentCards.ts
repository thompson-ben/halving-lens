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
import { priorBrief, briefDate, todaySlug } from "./briefArchive";
import { etfStats, ETF } from "./etf";
import { sentimentRead, currentSentiment, SENTIMENT_AVAILABLE } from "./sentiment";
import { fmtUsd, fmtPct } from "./format";
import { TODAY_DAY_IN_CYCLE } from "./btcData";

export type CardId = "hero" | "changed" | "history" | "watch" | "takeaway" | "cta";

export const CARD_ORDER: CardId[] = ["hero", "changed", "history", "watch", "takeaway", "cta"];

export const CARD_LABELS: Record<CardId, { kicker: string; name: string }> = {
  hero: { kicker: "Daily Bitcoin Cycle Brief", name: "Hero summary" },
  changed: { kicker: "What changed today", name: "What changed" },
  history: { kicker: "Today vs history", name: "Today vs history" },
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

export type CardBody =
  | HeroCard
  | ChangedCard
  | HistoryCard
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

const BUILDERS: Record<CardId, () => CardBody> = {
  hero: heroCard,
  changed: changedCard,
  history: historyCard,
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
