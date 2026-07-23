// "Since Last Wednesday" — deterministic seven-day continuity for The State of
// Bitcoin. Compares today's live readings against the nearest archived brief to
// ~7 days ago, and answers the signature Documenting-the-Cycle question:
// "last week we were watching X — here's what actually happened."
//
// Every value traces to existing reads (the StoredBrief archive + the live
// metric-change service / accumulation series). Nothing is fabricated: when no
// prior brief exists we return an honest first-edition state, and we always
// disclose the actual date the comparison is drawn from.

import { format } from "date-fns";
import { STORED_BRIEFS } from "./data/briefs";
import { briefDate, todaySlug } from "./briefArchive";
import type { StoredBrief } from "./brief";
import { metricChange } from "./metricChange";
import { etfStats, ETF } from "./etf";
import { accumulationRead, accumulationSeries, bandFor as accBand } from "./accumulation";
import { sentimentRead, bandFor as sentimentBand, SENTIMENT_AVAILABLE } from "./sentiment";
import { cyclePhase } from "./cycleIntel";
import { cycleSummary, type WatchLevel } from "./cycleSummary";
import { snapshotWatchItems } from "./snapshot";
import { fmtUsd } from "./format";

const DAY = 86_400_000;

export interface WeekAgo {
  brief: StoredBrief;
  slug: string;
  dateLabel: string; // "16 Jul 2026"
  weekday: string; // "Thursday" — the weekday of the comparison point
  daysAgo: number;
}

// The archived brief nearest to seven days ago. Prefers the closest brief on or
// before the target, then the nearest either side. Null until a prior brief has
// been persisted (honest first-edition state).
export function weekAgoBrief(): WeekAgo | null {
  const nowTs = briefDate().getTime();
  const target = nowTs - 7 * DAY;
  const tSlug = todaySlug();
  const past = STORED_BRIEFS.filter((b) => b.slug < tSlug);
  if (past.length === 0) return null;
  // Closest to the 7-day target; on ties prefer the older (fuller week).
  let best = past[0];
  let bestDist = Infinity;
  for (const b of past) {
    const dist = Math.abs(Date.parse(b.slug) - target);
    if (dist < bestDist || (dist === bestDist && b.slug < best.slug)) {
      best = b;
      bestDist = dist;
    }
  }
  const daysAgo = Math.max(1, Math.round((nowTs - Date.parse(best.slug)) / DAY));
  return {
    brief: best,
    slug: best.slug,
    dateLabel: format(new Date(best.slug), "d MMM yyyy"),
    weekday: format(new Date(best.slug), "EEEE"),
    daysAgo,
  };
}

export type RowTone = "good" | "bad" | "neutral";

export interface ComparisonRow {
  key: string;
  label: string;
  then: string;
  now: string;
  delta: string | null;
  tone: RowTone;
  meaning: string;
}

export interface SinceLastWeek {
  available: boolean;
  dateLabel: string | null;
  daysAgo: number | null;
  rows: ComparisonRow[];
}

function signedPts(n: number): string {
  const r = Math.round(n);
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${Math.abs(r)} pts`;
}

// Nearest accumulation score at/just before a timestamp (weekly cadence series).
function accScoreAt(ts: number): number | null {
  const pts = accumulationSeries();
  let out: number | null = null;
  for (const p of pts) {
    if (p.ts <= ts) out = p.score;
    else break;
  }
  return out;
}

export function sinceLastWeek(): SinceLastWeek {
  const wa = weekAgoBrief();
  if (!wa) return { available: false, dateLabel: null, daysAgo: null, rows: [] };
  const b = wa.brief;
  const rows: ComparisonRow[] = [];

  // Price
  const price = metricChange("price");
  {
    const then = b.price;
    const now = price.current;
    const pct = then ? (now / then - 1) * 100 : null;
    rows.push({
      key: "price",
      label: "Bitcoin",
      then: fmtUsd(then),
      now: fmtUsd(now),
      delta: pct != null ? `${pct >= 0 ? "+" : "−"}${Math.abs(pct).toFixed(1)}%` : null,
      tone: pct == null || Math.abs(pct) < 1 ? "neutral" : pct > 0 ? "good" : "bad",
      meaning: pct == null || Math.abs(pct) < 1 ? "Little changed" : pct > 0 ? "Strengthened" : "Softened",
    });
  }

  // ETF seven-day demand
  if (ETF.connected && b.etfTrailingWeek != null) {
    const then = b.etfTrailingWeek;
    const now = etfStats().trailingWeek;
    const d = now - then;
    rows.push({
      key: "etf",
      label: "ETF demand (7-day)",
      then: fmtUsd(then, { compact: true }),
      now: fmtUsd(now, { compact: true }),
      delta: `${d >= 0 ? "+" : "−"}${fmtUsd(Math.abs(d), { compact: true })}`,
      tone: now > 0 ? "good" : now < 0 ? "bad" : "neutral",
      meaning: now > 0 ? "Net inflows continued" : now < 0 ? "Net outflows" : "Broadly flat",
    });
  }

  // Market Health (composite)
  if (b.cycleScore != null) {
    const then = b.cycleScore;
    const mh = metricChange("market_health");
    const now = mh.current;
    const d = now - then;
    rows.push({
      key: "market_health",
      label: "Market Health",
      then: `${then}/100`,
      now: `${now}/100`,
      delta: signedPts(d),
      tone: Math.abs(d) < 2 ? "neutral" : d > 0 ? "good" : "bad",
      meaning: Math.abs(d) < 2 ? "Held its regime" : d > 0 ? "Conditions improved" : "Conditions softened",
    });
  }

  // Sentiment
  if (SENTIMENT_AVAILABLE && b.sentimentValue != null) {
    const then = b.sentimentValue;
    const sr = sentimentRead();
    const now = sr?.value ?? then;
    const nowBand = sr?.band.label ?? sentimentBand(now).label;
    const thenBand = sentimentBand(then).label;
    const d = now - then;
    rows.push({
      key: "sentiment",
      label: "Sentiment",
      then: `${then} · ${thenBand}`,
      now: `${now} · ${nowBand}`,
      delta: signedPts(d),
      tone: "neutral",
      meaning: thenBand === nowBand ? `Still within ${nowBand}` : `Moved to ${nowBand}`,
    });
  }

  // Accumulation Index (from the weekly series; not stored on the brief)
  {
    const then = accScoreAt(briefDate().getTime() - 7 * DAY);
    const acc = accumulationRead();
    const now = acc.score;
    if (then != null) {
      const thenBand = accBand(then).label;
      const nowBand = acc.band.label;
      const d = now - then;
      rows.push({
        key: "accumulation",
        label: "Accumulation Index",
        then: `${then}/100 · ${thenBand}`,
        now: `${now}/100 · ${nowBand}`,
        delta: signedPts(d),
        // A LOWER accumulation score is the historically more attractive read.
        tone: Math.abs(d) < 2 ? "neutral" : d < 0 ? "good" : "bad",
        meaning: thenBand === nowBand ? "No material band change" : `Moved into ${nowBand}`,
      });
    }
  }

  // Cycle chapter
  {
    const then = b.phaseLabel;
    const now = cyclePhase().label;
    rows.push({
      key: "chapter",
      label: "Cycle chapter",
      then,
      now,
      delta: null,
      tone: "neutral",
      meaning: then === now ? "Unchanged" : "Chapter changed",
    });
  }

  return { available: true, dateLabel: wa.dateLabel, daysAgo: wa.daysAgo, rows };
}

// ── "Last week we were watching … here's what happened" ──────────────────────
export type WatchOutcome = "held" | "moved" | "escalated" | "eased" | "insufficient";

export interface LastWeekWatch {
  available: boolean;
  firstEdition: boolean; // true when no prior brief is archived yet
  dateLabel: string | null;
  signal: string | null;
  why: string | null;
  then: string | null; // status a week ago
  now: string | null; // status today
  outcome: WatchOutcome;
  detail: string;
}

const LEVEL_RANK: Record<WatchLevel, number> = { calm: 0, watch: 1, elevated: 2 };

export function lastWeekWatch(): LastWeekWatch {
  const wa = weekAgoBrief();
  if (!wa || !wa.brief.watchSignals || wa.brief.watchSignals.length === 0) {
    return {
      available: false,
      firstEdition: !wa,
      dateLabel: wa?.dateLabel ?? null,
      signal: null,
      why: null,
      then: null,
      now: null,
      outcome: "insufficient",
      detail: !wa
        ? "This is an early edition — once a prior week is archived, we'll track how each week's watch item actually played out."
        : "No watch item was archived for the comparison week.",
    };
  }

  // Preferred path: the exact page watch items, archived going forward. Compare
  // the top item's live reading then vs now (same thresholds the visitor saw).
  const archivedItems = wa.brief.watchItems;
  if (archivedItems && archivedItems.length > 0) {
    const top = archivedItems[0];
    const current = snapshotWatchItems().find((w) => w.title === top.title) ?? null;
    const nowReading = current?.current ?? null;
    const outcome: WatchOutcome = !current ? "insufficient" : nowReading === top.current ? "held" : "moved";
    const clause =
      outcome === "held"
        ? "It held — the reading is unchanged from a week ago."
        : outcome === "moved"
          ? "The reading moved over the week."
          : "It is no longer among the tracked signals this week.";
    return {
      available: true,
      firstEdition: false,
      dateLabel: wa.dateLabel,
      signal: top.title,
      why: top.trigger,
      then: top.current,
      now: nowReading,
      outcome,
      detail: `A week ago we were watching: ${top.title.toLowerCase()} — then, ${top.current}. Today: ${nowReading ?? "—"}. ${clause}`,
    };
  }

  // Highest-level (most notable) archived watch item.
  const archived = [...wa.brief.watchSignals].sort(
    (a, b) => (LEVEL_RANK[b.level as WatchLevel] ?? 0) - (LEVEL_RANK[a.level as WatchLevel] ?? 0),
  )[0];

  const current = cycleSummary().watchSignals.find((w) => w.signal === archived.signal) ?? null;

  if (!current) {
    return {
      available: true,
      firstEdition: false,
      dateLabel: wa.dateLabel,
      signal: archived.signal,
      why: null,
      then: archived.status,
      now: null,
      outcome: "insufficient",
      detail: `A week ago we were watching ${archived.signal.toLowerCase()} (${archived.status}). It is no longer among the tracked signals this week.`,
    };
  }

  const thenRank = LEVEL_RANK[archived.level as WatchLevel] ?? 0;
  const nowRank = LEVEL_RANK[current.level] ?? 0;
  let outcome: WatchOutcome;
  if (nowRank > thenRank) outcome = "escalated";
  else if (nowRank < thenRank) outcome = "eased";
  else if (current.status !== archived.status) outcome = "moved";
  else outcome = "held";

  const clause: Record<WatchOutcome, string> = {
    escalated: "It became more notable over the week.",
    eased: "It calmed over the week.",
    moved: "It shifted, but stayed at the same level of note.",
    held: "It held — no change over the week.",
    insufficient: "",
  };

  return {
    available: true,
    firstEdition: false,
    dateLabel: wa.dateLabel,
    signal: archived.signal,
    why: current.why,
    then: archived.status,
    now: current.status,
    outcome,
    detail: `A week ago we were watching ${archived.signal.toLowerCase()} — then, ${archived.status.toLowerCase()}. Today: ${current.status.toLowerCase()}. ${clause[outcome]}`,
  };
}
