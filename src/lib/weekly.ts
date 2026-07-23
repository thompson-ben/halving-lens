// HalvingLens Weekly Research — a premium weekly publication generated from the
// week's data. Deeper than the Daily Brief: the week's story, not today's. Each
// report is a permanent, git-frozen record (like editions), keyed by ISO week.
//
// Historical context only — no advice, predictions or price targets.

import { editionContent } from "./emailBrief";
import { cycleSummary } from "./cycleSummary";
import { briefDate } from "./briefArchive";
import { WEEKLIES } from "./data/weeklies";
import type { EditionMarketHealth } from "./research";
import { SITE_HOST } from "./site";
import { format } from "date-fns";

export interface WeeklyChange {
  label: string;
  from: string | null;
  to: string;
  dir: "up" | "down" | "flat";
}

export interface WeeklyReport {
  slug: string; // ISO week, e.g. "2026-W26"
  edition: number; // weekly edition number
  weekLabel: string; // "Week of 22–28 June 2026"
  generatedAt: string; // YYYY-MM-DD (the Sunday / latest run)
  executiveSummary: string[];
  biggestStory: { title: string; body: string };
  chartNarrative: string;
  whatChanged: WeeklyChange[];
  marketHealth: EditionMarketHealth[];
  similar: { match: string; similarity: number; body: string } | null;
  historicalInsight: string;
  researchDesk: string;
  weekAhead: string[];
  longView: string;
  education: string;
  contextScore: { score: number; label: string; stars: number };
  metrics: {
    price: number;
    fearGreed: number | null;
    accumulationScore: number;
    accumulationBand: string;
    contextScore: number;
    cycleDay: number;
    sentiment: string;
  };
  search: string;
}

// ── ISO week helpers ─────────────────────────────────────────────────────────
function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}
function weekSlug(d: Date): string {
  const { year, week } = isoWeek(d);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
function weekLabel(d: Date): string {
  const day = d.getUTCDay() || 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - (day - 1));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const sameMonth = monday.getUTCMonth() === sunday.getUTCMonth();
  const a = format(monday, sameMonth ? "d" : "d MMM");
  const b = format(sunday, "d MMM yyyy");
  return `Week of ${a}–${b}`;
}
const LAUNCH = Date.UTC(2025, 5, 1);
function weeklyEditionNumber(d: Date): number {
  return Math.max(1, Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - LAUNCH) / (7 * 86_400_000)) + 1);
}

// Exposed for The Journal, so a Chapter's number and week-slug are computed from
// the exact same weekly cadence the reports use (no parallel numbering).
export function editionForDate(d: Date): number {
  return weeklyEditionNumber(d);
}
export function weekSlugForDate(d: Date): string {
  return weekSlug(d);
}
export function weekLabelForDate(d: Date): string {
  return weekLabel(d);
}

// ── Build this week's report from the latest data + last week's frozen report ─
export function weeklyContent(): WeeklyReport {
  const e = editionContent();
  const s = cycleSummary();
  const d = briefDate();
  const slug = weekSlug(d);
  const cheaper = 100 - e.metrics.accumulationPercentile;

  // Week-over-week change vs the most recent prior weekly (if archived).
  const prior = [...WEEKLIES].filter((w) => w.slug < slug).sort((a, b) => (a.slug < b.slug ? 1 : -1))[0] ?? null;
  const delta = (label: string, to: string, fromNum: number | null, toNum: number | null): WeeklyChange => {
    const dir = fromNum != null && toNum != null ? (toNum > fromNum ? "up" : toNum < fromNum ? "down" : "flat") : "flat";
    return { label, from: prior ? (fromNum != null ? String(fromNum) : "—") : null, to, dir };
  };
  const whatChanged: WeeklyChange[] = [
    delta("Context Score", String(e.contextScore.score), prior?.contextScore.score ?? null, e.contextScore.score),
    delta("Accumulation Index", String(e.metrics.accumulationScore), prior?.metrics.accumulationScore ?? null, e.metrics.accumulationScore),
    delta("Fear & Greed", e.metrics.fearGreed != null ? String(e.metrics.fearGreed) : "—", prior?.metrics.fearGreed ?? null, e.metrics.fearGreed),
    delta("Sentiment", e.metrics.sentiment, null, null),
  ];

  const biggestStory = weeklyBiggestStory(e, cheaper);
  const researchDesk = weeklyResearchDesk(e, cheaper);

  const executiveSummary = [
    `Bitcoin is ${e.metrics.accumulationBand.replace("Historically ", "").toLowerCase()} by historical standards, at the ${e.metrics.accumulationPercentile}th percentile of its range.`,
    `Context Score is ${e.contextScore.score}/100 — ${e.contextScore.label.toLowerCase()}.`,
    e.metrics.fearGreed != null ? `Sentiment sits in ${e.metrics.sentiment.toLowerCase()} (Fear & Greed ${e.metrics.fearGreed}).` : "Sentiment data is unavailable this week.",
    e.historicalContext ? `This week most resembles ${e.historicalContext.match} (${e.historicalContext.similarity}% match).` : "No single historical analogue dominates this week.",
    `The cycle continues to run ${s.phaseLabel.toLowerCase()}.`,
  ];

  const weekAhead = [
    "ETF flows — whether institutional demand confirms or diverges from price.",
    "Sentiment extremes — fear and greed matter most at the edges.",
    "Cycle timing — how this cycle's pace compares with prior ones.",
    "Historical divergence — where today keeps breaking from the 2016/2020 template.",
  ];

  const report: WeeklyReport = {
    slug,
    edition: weeklyEditionNumber(d),
    weekLabel: weekLabel(d),
    generatedAt: format(d, "yyyy-MM-dd"),
    executiveSummary,
    biggestStory,
    chartNarrative: e.heroNarrative,
    whatChanged,
    marketHealth: e.marketHealth,
    similar: e.historicalContext,
    historicalInsight: e.memory,
    researchDesk,
    weekAhead,
    longView: weeklyLongView(e),
    education: e.memory,
    contextScore: e.contextScore,
    metrics: {
      price: e.metrics.price,
      fearGreed: e.metrics.fearGreed,
      accumulationScore: e.metrics.accumulationScore,
      accumulationBand: e.metrics.accumulationBand,
      contextScore: e.contextScore.score,
      cycleDay: e.metrics.cycleDay,
      sentiment: e.metrics.sentiment,
    },
    search: "",
  };
  report.search = [
    ...executiveSummary, biggestStory.title, biggestStory.body, researchDesk, report.longView,
    report.similar?.body ?? "", report.historicalInsight, e.metrics.sentiment, e.metrics.accumulationBand,
  ].join(" ").toLowerCase();
  return report;
}

function weeklyBiggestStory(e: ReturnType<typeof editionContent>, cheaper: number): { title: string; body: string } {
  const cheap = e.metrics.accumulationPercentile <= 40;
  const fear = e.metrics.fearGreed != null && e.metrics.fearGreed <= 25;
  if (cheap && fear)
    return {
      title: "Value and fear arrived together",
      body: `The week's defining feature was the rare overlap of a ${e.metrics.accumulationBand.replace("Historically ", "").toLowerCase()} valuation — cheaper than ${cheaper}% of Bitcoin's history — with sentiment in ${e.metrics.sentiment.toLowerCase()}. Historically, the crowd has been most fearful precisely when, by the numbers, conditions were most constructive. This week sat squarely in that pattern.`,
    };
  if (cheap)
    return {
      title: "Bitcoin held a historically cheap footing",
      body: `Through the week Bitcoin stayed in the cheaper end of its historical range — cheaper than ${cheaper}% of weeks by our price-only measure — without the drama that usually accompanies such readings. The quiet weeks, not the loud ones, tend to be where positioning is decided.`,
    };
  if (e.metrics.fearGreed != null && e.metrics.fearGreed >= 75)
    return {
      title: "Sentiment ran hot into the weekend",
      body: `The week's strongest signal was sentiment: ${e.metrics.sentiment.toLowerCase()} against a valuation in the upper part of Bitcoin's historical range. History has tended to reward patience over conviction once both line up this way.`,
    };
  return {
    title: "A week of consolidation",
    body: `No single development dominated the week. Bitcoin held the middle of its historical range while the cycle continued to diverge — slower and flatter — from its predecessors. Weeks like this are where context, not noise, does the work.`,
  };
}

function weeklyResearchDesk(e: ReturnType<typeof editionContent>, cheaper: number): string {
  const cheap = e.metrics.accumulationPercentile <= 40;
  const lead = cheap
    ? `Step back from the week's candles and a simple fact remains: Bitcoin is trading cheaper than ${cheaper}% of its recorded history. That doesn't predict anything — history never does — but it changes the question a serious observer asks. The question stops being "what will it do next week?" and becomes "how often has the setup looked like this, and what tended to follow over the cycle?"`
    : `The week's tape invited strong opinions; the data invited fewer. Bitcoin sits near the middle of its historical range, and the honest read of a middling environment is patience — watch the extremes, don't chase the centre.`;
  const middle = e.historicalContext
    ? ` The closest historical rhyme this week is ${e.historicalContext.match}, a ${e.historicalContext.similarity}% match. The resemblance is structural — a comparable position in the cycle and a similar valuation backdrop — not a promise that the same script plays out.`
    : ` No prior moment dominates as an analogue this week, which is itself informative: the cycle keeps refusing to map cleanly onto 2016 or 2020.`;
  const close = ` The throughline of every HalvingLens edition holds here too: judge the present against Bitcoin's own history, not against expectations. The ETF era has changed the market's plumbing; it has not changed the behaviour that runs through it.`;
  return lead + middle + close;
}

function weeklyLongView(e: ReturnType<typeof editionContent>): string {
  return `In the arc of the current cycle, this week reads as ${e.metrics.accumulationBand.replace("Historically ", "").toLowerCase()} territory — day ${e.metrics.cycleDay} from the halving, with the cycle running slower and flatter than its predecessors. Zoomed out, the signal is less about any single week and more about how persistently this cycle has diverged from the template that came before it.`;
}

// ── Cross-channel copy (X / LinkedIn / Instagram / email) ────────────────────
export interface WeeklyContentPack {
  xThread: string[];
  linkedin: string;
  instagram: string;
  emailSubject: string;
  emailBody: string;
}
export function weeklyContentPack(): WeeklyContentPack {
  const w = weeklyContent();
  const link = `https://${SITE_HOST}/weekly`;
  return {
    xThread: [
      `HalvingLens Weekly Research 🧵\n\n${w.weekLabel}.\n\n${w.biggestStory.title}.`,
      ...w.executiveSummary.slice(0, 3).map((b, i) => `${i + 1}/ ${b}`),
      `Context Score ${w.contextScore.score}/100 — ${w.contextScore.label.toLowerCase()}.`,
      `Full weekly research (historical context, not advice): ${link}`,
    ],
    linkedin: [
      `HalvingLens Weekly Research — ${w.weekLabel}`,
      "",
      w.biggestStory.title,
      w.biggestStory.body,
      "",
      `Context Score: ${w.contextScore.score}/100 (${w.contextScore.label}).`,
      "",
      `Read the full weekly: ${link}`,
      "",
      "Historical context, not financial advice.",
    ].join("\n"),
    instagram: [
      `HalvingLens Weekly Research`,
      w.weekLabel,
      "",
      w.biggestStory.title,
      "",
      `Context Score ${w.contextScore.score}/100 · ${w.contextScore.label}`,
      "",
      "Historical context. Not prediction.",
      "",
      "#bitcoin #btc #crypto #bitcoinhalving #research",
    ].join("\n"),
    emailSubject: `Weekly Research — ${w.biggestStory.title}`,
    emailBody: [
      `HalvingLens Weekly Research`,
      w.weekLabel,
      "",
      "The week in 30 seconds:",
      ...w.executiveSummary.map((b) => `• ${b}`),
      "",
      w.biggestStory.title,
      w.biggestStory.body,
      "",
      `Read the full weekly: ${link}`,
      "",
      "Historical context, not a prediction. Not financial advice.",
    ].join("\n"),
  };
}

// ── Archive accessors ────────────────────────────────────────────────────────
export function allWeeklies(): WeeklyReport[] {
  return [...WEEKLIES].sort((a, b) => (a.slug < b.slug ? 1 : -1));
}
export function getWeekly(slug: string): WeeklyReport | null {
  return WEEKLIES.find((w) => w.slug === slug) ?? null;
}
export function latestWeekly(): WeeklyReport | null {
  return allWeeklies()[0] ?? null;
}
export function allWeeklySlugs(): string[] {
  return WEEKLIES.map((w) => w.slug);
}
export function weeklyStats(): { total: number; first: string | null; latest: string | null } {
  const all = allWeeklies();
  return { total: all.length, first: all[all.length - 1]?.slug ?? null, latest: all[0]?.slug ?? null };
}
