// Daily Bitcoin Cycle Brief generator — composes the engine output + live data
// into a dated brief and copyable X post/thread. No fabricated numbers; every
// figure traces to the live snapshot.

import { format } from "date-fns";
import { SITE_HOST } from "./site";
import { cycleSummary, cycleScorecard } from "./cycleSummary";
import { briefHeadline } from "./dailyChange";
import { SOURCE, TODAY_DAY_IN_CYCLE } from "./btcData";
import { fmtPct, fmtUsd } from "./format";
import { etfStats, ETF } from "./etf";
import { sentimentRead, SENTIMENT_AVAILABLE } from "./sentiment";
import { cycleDivergence } from "./cycleIntel";
import { reelPackage, type ReelPackage } from "./reel";

export interface Brief {
  date: string; // display date
  title: string;
  headline: string;
  conclusion: string;
  disclaimer: string;
  updated: string | null;
}

const DISCLAIMER = "Historical cycle behaviour is not a forecast. This is educational analysis, not financial advice.";

export function buildBrief(): Brief {
  const s = cycleSummary();
  const today = SOURCE.fetchedAt ? new Date(SOURCE.fetchedAt) : new Date();
  return {
    date: format(today, "d MMMM yyyy"),
    title: `Bitcoin Cycle Brief — ${format(today, "d MMM yyyy")}`,
    // Dynamic, change-driven headline (falls back to a stable read with no history).
    headline: briefHeadline(),
    conclusion: s.support,
    disclaimer: DISCLAIMER,
    updated: SOURCE.fetchedAt ? `${format(today, "d MMM yyyy, HH:mm")} UTC` : null,
  };
}

// Short, copy-paste X post. When a prior brief exists, includes a compact
// "what changed today" block (Phase 4 format).
export function shortPost(changed?: { area: string; summary: string }[]): string {
  const s = cycleSummary();
  const b = buildBrief();
  const chg = s.change24h != null ? ` (${fmtPct(s.change24h, 1)} ${s.changeLabel})` : "";
  const lines = [
    `Bitcoin Cycle Brief — ${b.date}`,
    "",
    `BTC ${fmtUsd(s.price)}${chg} · day ${s.cycleDay} (${s.progressPct}% through the cycle).`,
    "",
    s.summary,
  ];
  if (changed && changed.length) {
    lines.push("", "What changed today:");
    for (const c of changed.slice(0, 3)) lines.push(`- ${c.summary}`);
  }
  lines.push(
    "",
    "Cycle read: prior cycles had usually peaked by now. This one is different — slower, flatter, ETF-supported.",
    "",
    "Historical context, not financial advice.",
    SITE_HOST,
  );
  return lines.join("\n");
}

// Longer thread version (array of tweets).
export function threadPost(): string[] {
  const s = cycleSummary();
  const t: string[] = [];
  t.push(
    `Bitcoin Cycle Brief 🧵\n\nBTC ${fmtUsd(s.price)} · day ${s.cycleDay} of the halving cycle, ${s.progressPct}% through.\n\nPhase: ${s.phaseLabel}.`,
  );
  t.push(`1/ ${s.summary}`);
  t.push(
    `2/ ${s.support}`,
  );
  t.push(
    `3/ How stretched is it? ${s.heatPercentile != null ? `Bitcoin sits around the ${s.heatPercentile}th percentile of its historical range vs its long-term average` : "Mid-range vs its history"} — ${s.heat === "cool" || s.heat === "neutral" ? "not near the extremes that have marked past tops" : "in the higher-risk part of its range"}.`,
  );
  t.push(`4/ What makes this cycle different: ${s.whatsDifferent}`);
  t.push(`5/ What to watch: ${s.whatToWatch}`);
  t.push(
    `Historical cycle behaviour is not a forecast — educational analysis, not financial advice.\n\nFull read: ${SITE_HOST}`,
  );
  return t;
}

// Instagram caption — punchy first line, scannable, emoji + hashtags. IG isn't
// link-friendly, so it points to the bio.
export function instagramCaption(): string {
  const s = cycleSummary();
  const b = buildBrief();
  const heatEmoji =
    s.heat === "cool" ? "🟦" : s.heat === "neutral" ? "🟢" : s.heat === "heating" ? "🟡" : s.heat === "elevated" ? "🟠" : "🔴";
  return [
    `Bitcoin Cycle Read — ${b.date}`,
    "",
    `₿ ${fmtUsd(s.price)} · Day ${s.cycleDay} (${s.progressPct}% through the cycle)`,
    `${heatEmoji} Risk: ${s.heat === "cool" ? "Historically cool" : s.heat === "neutral" ? "Neutral" : s.heat === "heating" ? "Heating up" : s.heat === "elevated" ? "Elevated" : "Euphoric"}`,
    "",
    s.summary,
    "",
    "At this point, previous cycles had usually already peaked. This one's behaving differently — slower, flatter, and ETF-supported.",
    "",
    "📊 Full cycle read + daily brief at the link in bio.",
    "",
    "Historical context, not financial advice.",
    "",
    "#Bitcoin #BTC #crypto #bitcoinhalving #cryptocycle #halvinglens #onchain #bitcoinanalysis",
  ].join("\n");
}

// Email newsletter version — a complete, readable issue with subject + body.
export function emailNewsletter(): { subject: string; body: string } {
  const s = cycleSummary();
  const b = buildBrief();
  const subject = `Bitcoin Cycle Brief — ${b.date}: ${s.phaseLabel}`;
  const body = [
    `Bitcoin Cycle Brief`,
    `${b.date}`,
    "",
    "—",
    "",
    `Where we are`,
    s.summary,
    "",
    `The numbers: BTC ${fmtUsd(s.price)}${s.change24h != null ? ` (${fmtPct(s.change24h, 1)} ${s.changeLabel})` : ""} · day ${s.cycleDay} of the cycle (${s.progressPct}% through) · risk level: ${s.heat}.`,
    "",
    `Historical context`,
    s.support,
    "",
    `What makes this cycle different`,
    s.whatsDifferent,
    "",
    `What to watch next`,
    s.whatToWatch,
    "",
    "—",
    "",
    `Read the full daily brief, with charts: https://${SITE_HOST}/brief`,
    "",
    "Historical cycle behaviour is not a forecast. This is educational analysis, not financial advice.",
    `You're receiving this because you joined the ${SITE_HOST} daily brief waitlist.`,
  ].join("\n");
  return { subject, body };
}

// The full cross-channel content pack from one brief — the content engine.
export interface ContentPack {
  xPost: string;
  xThread: string[];
  instagram: string;
  linkedin: string;
  emailSubject: string;
  emailBody: string;
}

export function contentPack(
  changed?: { area: string; summary: string }[],
): ContentPack {
  const email = emailNewsletter();
  return {
    xPost: shortPost(changed),
    xThread: threadPost(),
    instagram: instagramCaption(),
    linkedin: linkedinPost(),
    emailSubject: email.subject,
    emailBody: email.body,
  };
}

export function briefDayLabel(): string {
  return `Day ${TODAY_DAY_IN_CYCLE} from the 2024 halving`;
}

// LinkedIn-style summary — slightly longer, professional framing.
export function linkedinPost(): string {
  const s = cycleSummary();
  const b = buildBrief();
  return [
    `Bitcoin Cycle Brief — ${b.date}`,
    "",
    s.summary,
    "",
    `Where we are: day ${s.cycleDay} of the halving cycle (${s.progressPct}% through), ${s.phaseLabel.toLowerCase()}. BTC ${fmtUsd(s.price)}.`,
    "",
    `What makes this cycle different: ${s.whatsDifferent}`,
    "",
    `What to watch next: ${s.whatToWatch}`,
    "",
    "Historical cycle behaviour is not a forecast. This is educational analysis, not financial advice.",
    "",
    `More: ${SITE_HOST}`,
  ].join("\n");
}

// ── Persisted archive ───────────────────────────────────────────────────────
// A fully self-contained snapshot of a day's brief, written by the daily sync
// so past dates render real history (not today's live data).

export interface StoredBrief {
  slug: string; // YYYY-MM-DD
  dateLabel: string;
  generatedAt: string | null;
  headline: string;
  phaseLabel: string;
  heat: string;
  price: number;
  changePct: number | null;
  changeLabel: string;
  cycleDay: number;
  progressPct: number;
  gainFromHalving: number;
  drawdownFromAth: number;
  // Raw comparison metrics (for "what changed since yesterday")
  cycleScore?: number;
  heatPercentile: number | null;
  sentimentValue: number | null;
  etfCumulative: number | null;
  etfTrailingWeek: number | null;
  summary: string;
  support: string;
  whatsDifferent: string;
  whatToWatch: string;
  conclusion: string;
  insights: { title: string; body: string }[];
  watchSignals: { signal: string; status: string; level: string; confidence: string }[];
  shortPost: string;
  // Cross-channel content pack, generated once and stored with the brief.
  // Optional: entries persisted before the content engine won't have it.
  content?: ContentPack;
  // Daily Reel package — the short-form video script. Its `angle` also drives
  // the reel's repetition control across days. Optional for older entries.
  reel?: ReelPackage;
}

export function serializeBrief(): StoredBrief {
  const b = buildBrief();
  const s = cycleSummary();
  const day = SOURCE.fetchedAt ? new Date(SOURCE.fetchedAt) : new Date();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const etf = ETF.connected ? etfStats() : null;
  return {
    slug: format(day, "yyyy-MM-dd"),
    dateLabel: b.date,
    generatedAt: SOURCE.fetchedAt,
    headline: b.headline,
    phaseLabel: s.phaseLabel,
    heat: s.heat,
    price: s.price,
    changePct: s.change24h,
    changeLabel: s.changeLabel,
    cycleDay: s.cycleDay,
    progressPct: s.progressPct,
    gainFromHalving: s.gainFromHalving,
    drawdownFromAth: s.drawdownFromAth,
    cycleScore: cycleScorecard().overall,
    heatPercentile: s.heatPercentile,
    sentimentValue: sr?.value ?? null,
    etfCumulative: etf?.cumulative ?? null,
    etfTrailingWeek: etf?.trailingWeek ?? null,
    summary: s.summary,
    support: s.support,
    whatsDifferent: s.whatsDifferent,
    whatToWatch: s.whatToWatch,
    conclusion: b.conclusion,
    insights: [cycleInsight(), etfInsight(), sentimentInsight()].map((i) => ({
      title: i.title,
      body: i.body,
    })),
    watchSignals: s.watchSignals.map((w) => ({
      signal: w.signal,
      status: w.status,
      level: w.level,
      confidence: w.confidence,
    })),
    shortPost: shortPost(),
    content: contentPack(),
    reel: reelPackage(),
  };
}

// ── Insight-of-the-day blocks ───────────────────────────────────────────────

export interface Insight {
  title: string;
  body: string;
  available: boolean;
  href: string;
}

export function etfInsight(): Insight {
  if (!ETF.connected) {
    return {
      title: "ETF insight",
      body: "Spot ETF flow data isn't connected yet — it will appear here once live.",
      available: false,
      href: "/etf",
    };
  }
  const s = etfStats();
  const wk = s.trailingWeek;
  const dir = wk > 0 ? "net inflows" : wk < 0 ? "net outflows" : "broadly flat flows";
  const big = s.biggestInflow;
  return {
    title: "ETF insight of the day",
    body:
      `US spot Bitcoin ETFs have seen ${dir} over the past week` +
      (Math.abs(wk) >= 1e6 ? ` (~${fmtUsd(Math.abs(wk), { compact: true })})` : "") +
      `. Cumulative net flow since launch stands at ${fmtUsd(s.cumulative, { compact: true })}` +
      (big ? `, with the largest single inflow day at ${fmtUsd(big.netFlow, { compact: true })}.` : ".") +
      " ETF demand is the structural variable unique to this cycle.",
    available: true,
    href: "/etf",
  };
}

export function sentimentInsight(): Insight {
  if (!SENTIMENT_AVAILABLE) {
    return {
      title: "Sentiment insight",
      body: "Sentiment data isn't connected yet — it will appear here once live.",
      available: false,
      href: "/sentiment",
    };
  }
  const r = sentimentRead();
  if (!r) return { title: "Sentiment insight", body: "Sentiment unavailable.", available: false, href: "/sentiment" };
  return {
    title: "Sentiment insight of the day",
    body:
      `Market mood reads ${r.band.label.toLowerCase()} (Fear & Greed ${r.value}/100)` +
      (r.change ? `, ${r.change.direction} over the past month` : "") +
      ". Extremes matter most: euphoria has often appeared near cycle tops, deep fear near lows — a contrarian read, not a timing tool.",
    available: true,
    href: "/sentiment",
  };
}

export function cycleInsight(): Insight {
  const div = cycleDivergence();
  return {
    title: "Cycle insight of the day",
    body: div.summary,
    available: true,
    href: "/cycles",
  };
}
