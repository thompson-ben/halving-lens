// HalvingLens Evidence Briefs (HL-E) — the one-page micro-format of the research
// library. Each brief answers a single question with a single headline figure,
// a compact visual, and just enough context. Like the HL-R papers, each brief
// gets a permanent, citable ID (HL-E001, HL-E002, …) that is never reused.
//
// Editorial standard, identical to the papers: evidence first, no prediction, no
// hype, no advice. The one rule that defines this tier — every headline number
// recomputes LIVE from the same engine the flagship tools use (see `briefStat`
// below), so a brief can never quote a figure that has drifted from the data.
// The framing is authored and fixed; the numbers are not.

import type { FindingRelated, FindingStatus, FindingTopic } from "./findings";
import type { ResearchBadge } from "./researchBadges";
import { accumulationSeries } from "./accumulation";
import { forwardReturnByBand, type SentimentBand } from "./sentiment";
import { SENTIMENT, SOURCE } from "./btcData";
import { bandFor } from "./sentiment";

// Which live computation powers a brief's headline figure and its visual.
export type BriefMetric = "below-ath" | "fear-forward-1y" | "fear-greed-mood";

export interface EvidenceBrief {
  id: string; // "HL-E001" — permanent citation ID, never reused
  slug: string; // "hl-e001"
  number: number;
  question: string; // the single question (used as the title)
  answer: string; // the evergreen one-line answer (the exact number renders live)
  summary: string; // one sentence for cards & meta description
  datePublished: string; // YYYY-MM-DD (fixed once published)
  status: FindingStatus; // lifecycle standing; the ID stays fixed regardless
  editorsPick?: boolean;
  topics: FindingTopic[];
  metric: BriefMetric; // the live engine behind the headline + chart
  context: string[]; // one or two short paragraphs of framing
  limitations: string[]; // the honest caveats, kept brief
  related: FindingRelated[];
}

// ── The briefs (append-only; newest entries get the next free ID) ─────────────
export const EVIDENCE_BRIEFS: EvidenceBrief[] = [
  {
    id: "HL-E001",
    slug: "hl-e001",
    number: 1,
    question: "How much of its life has Bitcoin spent below its record high?",
    answer:
      "Most of it. Across Bitcoin's full weekly history, the large majority of weekly closes have sat below the prior all-time high — new highs are the exception, not the norm.",
    summary:
      "Across Bitcoin's full weekly history, most weekly closes have been below the prior all-time high — a new record high is a rare state, not the usual one.",
    datePublished: "2026-07-18",
    status: "active",
    editorsPick: true,
    topics: ["Drawdowns"],
    metric: "below-ath",
    context: [
      "It is easy to remember Bitcoin by its record highs, because that is when it makes headlines. The record itself understates how much of the journey is spent climbing back toward one.",
      "Reframing the base rate this way makes drawdowns feel less like an emergency and more like the default condition of holding the asset — historically, not predictively.",
    ],
    limitations: [
      "Weekly closes, reconstructed point-in-time across all cycles from 2012. Weekly observations overlap and are highly autocorrelated — they are not independent samples.",
      "Bitcoin's whole record sits within one long secular uptrend; a different price path would produce different base rates.",
      "This is descriptive history, not a prediction, signal, or advice. Past behaviour is not a guide to future results.",
    ],
    related: [
      { label: "Historical Price Paths — how far past cycles travelled from here", href: "/historical-price-paths", kind: "tool" },
      { label: "Accumulation Index — where today sits in Bitcoin's range", href: "/accumulation", kind: "tool" },
      { label: "HL-R002 — Extreme Fear: Weakness, or Opportunity?", href: "/research/findings/hl-r002", kind: "finding" },
    ],
  },
  {
    id: "HL-E002",
    slug: "hl-e002",
    number: 2,
    question: "What has extreme fear paid, one year later?",
    answer:
      "Historically, more than greed did. Days that read extreme fear were followed by materially stronger average one-year returns than days of greed or extreme greed — the reward showed over a year, not a week.",
    summary:
      "Since 2018, days of extreme fear were followed by much stronger average one-year Bitcoin returns than days of greed — the shareable one-figure distillation of research finding HL-R002.",
    datePublished: "2026-07-18",
    status: "active",
    topics: ["Sentiment", "Fear & Greed"],
    metric: "fear-forward-1y",
    context: [
      "This is the one-number version of research paper HL-R002. When the Fear & Greed Index reads extreme fear, the popular reading is that Bitcoin is breaking down — the record one year forward tells a different story.",
      "It is a long-horizon effect, not a timing signal: over the following one to three months, fearful periods actually lagged greedy ones. Read the full paper for the short-horizon numbers and the caveats.",
    ],
    limitations: [
      "The Fear & Greed Index only begins in February 2018 — roughly two and a half cycles. A small sample for cross-cycle claims.",
      "Averages hide wide dispersion; individual extreme-fear episodes ranged from sharp rebounds to further deep drawdowns.",
      "Descriptive history of a sentiment gauge — not a signal, a strategy, or advice.",
    ],
    related: [
      { label: "HL-R002 — the full paper behind this figure", href: "/research/findings/hl-r002", kind: "finding" },
      { label: "Sentiment — the live Fear & Greed read", href: "/sentiment", kind: "tool" },
      { label: "HL-E003 — Is Bitcoin usually fearful or greedy?", href: "/research/briefs/hl-e003", kind: "brief" },
    ],
  },
  {
    id: "HL-E003",
    slug: "hl-e003",
    number: 3,
    question: "Is Bitcoin usually fearful or greedy?",
    answer:
      "Fearful, more often than not. Across the Fear & Greed record since 2018, the market has read fear or extreme fear on more days than it has read greed or extreme greed.",
    summary:
      "Across the Fear & Greed record since 2018, Bitcoin's market has spent more days in fear than in greed — fear, not euphoria, has been its default mood.",
    datePublished: "2026-07-18",
    status: "active",
    topics: ["Sentiment", "Fear & Greed"],
    metric: "fear-greed-mood",
    context: [
      "The loudest moments are the greedy ones, so it is easy to assume crypto sentiment runs hot most of the time. The daily record since 2018 shows the opposite: the default mood has leaned fearful.",
      "It is useful context for reading any single day's number — fear is common, so a fearful reading is closer to Bitcoin's baseline than to an emergency.",
    ],
    limitations: [
      "The Fear & Greed Index only begins in February 2018, so this excludes the 2012–2017 era entirely.",
      "The index is a composite gauge of market conditions, not a direct survey; band boundaries are fixed conventions.",
      "Descriptive history, not a prediction or a trading signal.",
    ],
    related: [
      { label: "Sentiment — today's Fear & Greed read in context", href: "/sentiment", kind: "tool" },
      { label: "HL-E002 — What has extreme fear paid, one year later?", href: "/research/briefs/hl-e002", kind: "brief" },
      { label: "HL-R002 — Extreme Fear: Weakness, or Opportunity?", href: "/research/findings/hl-r002", kind: "finding" },
    ],
  },
];

// ── Accessors ────────────────────────────────────────────────────────────────
export function allBriefs(): EvidenceBrief[] {
  return [...EVIDENCE_BRIEFS].sort((a, b) => b.number - a.number);
}

export function briefBySlug(slug: string): EvidenceBrief | null {
  return EVIDENCE_BRIEFS.find((b) => b.slug === slug.toLowerCase()) ?? null;
}

export function briefSlugs(): string[] {
  return EVIDENCE_BRIEFS.map((b) => b.slug);
}

export function briefStats(): { total: number; latestId: string } {
  const list = allBriefs();
  return { total: list.length, latestId: list[0]?.id ?? "—" };
}

export function nextBriefId(): string {
  const max = EVIDENCE_BRIEFS.reduce((m, b) => Math.max(m, b.number), 0);
  return `HL-E${String(max + 1).padStart(3, "0")}`;
}

// ── Live headline figure + visual, recomputed from source ────────────────────
export interface BriefBar {
  label: string;
  pct: number; // 0..100, bar width
  value: string; // rendered value on the bar
  highlight?: boolean;
}

export interface BriefStat {
  available: boolean;
  headline: string; // the big number, e.g. "89%" or "+98%"
  statement: string; // what the number counts
  sub?: string; // a secondary comparison line
  rangeLabel: string; // sample size + span
  bars: BriefBar[];
  barCaption?: string;
}

function committedYears(fromYear: number): { from: number; to: number } {
  const toISO = SOURCE.fetchedAt ?? "";
  const to = toISO ? Number(toISO.slice(0, 4)) : new Date().getUTCFullYear();
  return { from: fromYear, to };
}

const BAND_LABEL: Record<SentimentBand, string> = {
  "extreme-fear": "Extreme fear",
  fear: "Fear",
  neutral: "Neutral",
  greed: "Greed",
  "extreme-greed": "Extreme greed",
};
const BAND_ORDER: SentimentBand[] = ["extreme-fear", "fear", "neutral", "greed", "extreme-greed"];

const UNAVAILABLE: BriefStat = {
  available: false,
  headline: "—",
  statement: "This figure is unavailable until the underlying data has synced.",
  rangeLabel: "Awaiting data",
  bars: [],
};

export function briefStat(brief: EvidenceBrief): BriefStat {
  switch (brief.metric) {
    case "below-ath": {
      const s = accumulationSeries();
      const total = s.length;
      if (!total) return UNAVAILABLE;
      // "At / near a record high" = within 0.5% of the running all-time high.
      const nearHigh = s.filter((p) => p.drawdownPct >= -0.5).length;
      const belowPct = 100 * (1 - nearHigh / total);
      const buckets = [
        { label: "At / near a record high", test: (d: number) => d >= -0.5 },
        { label: "Down up to 20%", test: (d: number) => d < -0.5 && d > -20 },
        { label: "Down 20–50%", test: (d: number) => d <= -20 && d > -50 },
        { label: "More than 50% below", test: (d: number) => d <= -50 },
      ];
      const bars: BriefBar[] = buckets.map((b) => {
        const n = s.filter((p) => b.test(p.drawdownPct)).length;
        const pct = (100 * n) / total;
        return { label: b.label, pct, value: `${Math.round(pct)}%`, highlight: b.label !== "At / near a record high" };
      });
      const fromYear = Number((s[0].date ?? "2012").slice(0, 4));
      const { to } = committedYears(fromYear);
      return {
        available: true,
        headline: `${Math.round(belowPct)}%`,
        statement: "of Bitcoin's weekly closes have sat below its prior all-time high",
        sub: "A fresh record high has been the exception, not the norm.",
        rangeLabel: `${total.toLocaleString()} weekly closes · ${fromYear}–${to}`,
        bars,
        barCaption: "Share of all weekly closes, by distance below the running all-time high.",
      };
    }

    case "fear-forward-1y": {
      const rows = forwardReturnByBand(365);
      if (!rows.length) return UNAVAILABLE;
      const by = new Map(rows.map((r) => [r.band, r]));
      const ef = by.get("extreme-fear");
      const eg = by.get("extreme-greed");
      if (!ef) return UNAVAILABLE;
      const maxAbs = Math.max(...rows.map((r) => Math.abs(r.avgReturn)), 1);
      const bars: BriefBar[] = BAND_ORDER.filter((b) => by.has(b)).map((b) => {
        const r = by.get(b)!;
        return {
          label: BAND_LABEL[b],
          pct: (100 * Math.abs(r.avgReturn)) / maxAbs,
          value: `${r.avgReturn >= 0 ? "+" : ""}${Math.round(r.avgReturn)}%`,
          highlight: b === "extreme-fear",
        };
      });
      return {
        available: true,
        headline: `+${Math.round(ef.avgReturn)}%`,
        statement: "average one-year Bitcoin return after a day of extreme fear",
        sub: eg ? `versus +${Math.round(eg.avgReturn)}% after extreme greed` : undefined,
        rangeLabel: `Daily Fear & Greed · from 2018 · ${ef.count.toLocaleString()} extreme-fear days measured`,
        bars,
        barCaption: "Average Bitcoin return one year later, grouped by that day's sentiment.",
      };
    }

    case "fear-greed-mood": {
      if (!SENTIMENT || !SENTIMENT.points.length) return UNAVAILABLE;
      const pts = SENTIMENT.points;
      const total = pts.length;
      const counts = new Map<SentimentBand, number>();
      for (const p of pts) {
        const b = bandFor(p.value).band;
        counts.set(b, (counts.get(b) ?? 0) + 1);
      }
      const fearish = (counts.get("extreme-fear") ?? 0) + (counts.get("fear") ?? 0);
      const greedish = (counts.get("extreme-greed") ?? 0) + (counts.get("greed") ?? 0);
      const bars: BriefBar[] = BAND_ORDER.map((b) => {
        const n = counts.get(b) ?? 0;
        const pct = (100 * n) / total;
        return { label: BAND_LABEL[b], pct, value: `${Math.round(pct)}%`, highlight: b === "fear" || b === "extreme-fear" };
      });
      const fromYear = Number(new Date(pts[0].ts).toISOString().slice(0, 4));
      const { to } = committedYears(fromYear);
      return {
        available: true,
        headline: `${Math.round((100 * fearish) / total)}%`,
        statement: "of days since 2018, the market read fear or extreme fear",
        sub: `Greed or extreme greed: ${Math.round((100 * greedish) / total)}% of days.`,
        rangeLabel: `${total.toLocaleString()} daily readings · ${fromYear}–${to}`,
        bars,
        barCaption: "Share of all daily readings in each Fear & Greed band.",
      };
    }

    default:
      return UNAVAILABLE;
  }
}

// ── Editorial badges for a brief ─────────────────────────────────────────────
// Deterministic and honest: Editor's Pick from fixed metadata, New from the
// committed "today". No engagement-based badges here — brief-level analytics
// are not wired, so we never show a "most read" signal we cannot measure.
const NEW_WINDOW_DAYS = 45;

export function briefBadges(b: EvidenceBrief, todayISO: string): ResearchBadge[] {
  const badges: ResearchBadge[] = [];
  if (b.editorsPick) badges.push({ key: "editors-pick", label: "Editor's Pick", emoji: "⭐", tone: "gold" });
  const pub = Date.parse(`${b.datePublished}T00:00:00Z`);
  const today = Date.parse(`${todayISO}T00:00:00Z`);
  if (!Number.isNaN(pub) && !Number.isNaN(today) && Math.round((today - pub) / 86_400_000) <= NEW_WINDOW_DAYS) {
    badges.push({ key: "new", label: "New", emoji: "🆕", tone: "teal" });
  }
  return badges;
}
