// HalvingLens Research Notes (HL-N) — the desk-observation tier of the research
// library. A note sits between the one-figure Evidence Briefs (HL-E) and the
// full Research Papers (HL-R): a short, self-contained observation grounded in
// the historical record, quicker to publish than a paper but more than a single
// number. Each note gets a permanent, citable ID (HL-N001, HL-N002, …).
//
// Same editorial standard as every other tier: evidence first, no prediction,
// no hype, no advice. Any figure a note leans on is recomputed LIVE from source
// (see `noteData`), so the numbers can never drift from the data; the framing is
// authored and fixed.

import type { FindingRelated, FindingStatus, FindingTopic } from "./findings";
import type { ResearchBadge } from "./researchBadges";
import { accumulationSeries, ACCUMULATION_BANDS, bandFor } from "./accumulation";
import { SOURCE } from "./btcData";

// Which live computation, if any, backs a note's inline data strip.
export type NoteMetric = "accumulation-bands";

export interface ResearchNote {
  id: string; // "HL-N001" — permanent citation ID, never reused
  slug: string; // "hl-n001"
  number: number;
  title: string;
  observation: string; // the headline take, in one line
  summary: string; // one sentence for cards & meta description
  datePublished: string; // YYYY-MM-DD (fixed once published)
  status: FindingStatus;
  editorsPick?: boolean;
  topics: FindingTopic[];
  body: string[]; // the short narrative
  metric?: NoteMetric; // optional live data strip
  takeaway: string;
  limitations: string[];
  related: FindingRelated[];
}

// ── The notes (append-only; newest entries get the next free ID) ──────────────
export const RESEARCH_NOTES: ResearchNote[] = [
  {
    id: "HL-N001",
    slug: "hl-n001",
    number: 1,
    title: "How often is Bitcoin actually overheated?",
    observation:
      "Far less often than the mood suggests. Across Bitcoin's full weekly history, the Accumulation Index has sat in its overheated band only a small share of the time — and in its cheaper half more than any other state.",
    summary:
      "Across Bitcoin's full weekly history, the Accumulation Index sat in its 'overheated' band only a small fraction of weeks — euphoria has been rare and brief, not the default.",
    datePublished: "2026-07-18",
    status: "active",
    editorsPick: true,
    topics: ["Accumulation"],
    body: [
      "It is easy to feel like Bitcoin is permanently expensive — every green candle brings another round of “this is a bubble.” The historical record of the Accumulation Index, HalvingLens's point-in-time, price-only read of how attractive conditions are versus history, tells a calmer story.",
      "Reconstructed for every week since 2012 using only the data available at the time, the Index has spent the clear majority of Bitcoin's life in its cheaper-to-neutral range. The genuinely overheated band — the stretched end associated with late-cycle peaks — is where it has spent the least time of all.",
      "The distribution below is the full weekly record, recomputed live. Read it as base rates: overheating is the exception, and it has never lasted long before conditions cooled again.",
    ],
    metric: "accumulation-bands",
    takeaway:
      "Euphoria is rare and fleeting; most weeks have sat closer to the middle or cheaper end of Bitcoin's historical range. That is context for reading any single day's number — not a signal, and not a forecast.",
    limitations: [
      "Weekly closes since 2012, reconstructed point-in-time. Observations overlap heavily and are highly autocorrelated — they are not independent samples.",
      "The Index is a price-only historical mapping (Mayer Multiple, 200-week average, drawdown from the running high). It is a description of range, not a valuation or a prediction.",
      "Bitcoin's whole record sits within one long secular uptrend; a different price path would redistribute these base rates.",
    ],
    related: [
      { label: "Accumulation Index — today's read in context", href: "/accumulation", kind: "tool" },
      { label: "HL-E001 — How much of its life has Bitcoin spent below its record high?", href: "/research/briefs/hl-e001", kind: "brief" },
      { label: "HL-R001 — Does Taking Profits Beat Dynamic DCA?", href: "/research/findings/hl-r001", kind: "finding" },
    ],
  },
];

// ── Accessors ────────────────────────────────────────────────────────────────
export function allNotes(): ResearchNote[] {
  return [...RESEARCH_NOTES].sort((a, b) => b.number - a.number);
}

export function noteBySlug(slug: string): ResearchNote | null {
  return RESEARCH_NOTES.find((n) => n.slug === slug.toLowerCase()) ?? null;
}

export function noteSlugs(): string[] {
  return RESEARCH_NOTES.map((n) => n.slug);
}

export function noteStats(): { total: number; latestId: string } {
  const list = allNotes();
  return { total: list.length, latestId: list[0]?.id ?? "—" };
}

export function nextNoteId(): string {
  const max = RESEARCH_NOTES.reduce((m, n) => Math.max(m, n.number), 0);
  return `HL-N${String(max + 1).padStart(3, "0")}`;
}

// ── Live data strip, recomputed from source ──────────────────────────────────
export interface NoteStatRow {
  label: string;
  value: string;
  pct: number; // 0..100 bar width
  highlight?: boolean;
}

export interface NoteData {
  available: boolean;
  title: string;
  rows: NoteStatRow[];
  caption: string;
  rangeLabel: string;
}

export function noteData(note: ResearchNote): NoteData | null {
  if (note.metric !== "accumulation-bands") return null;

  const s = accumulationSeries();
  const total = s.length;
  if (!total) {
    return { available: false, title: "Accumulation environment", rows: [], caption: "", rangeLabel: "Awaiting data" };
  }

  const counts = new Map<string, number>();
  for (const p of s) {
    const key = bandFor(p.score).key;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // Highlight the extremes — the deep-value and overheated ends — as the story.
  const rows: NoteStatRow[] = ACCUMULATION_BANDS.map((b) => {
    const n = counts.get(b.key) ?? 0;
    const pct = (100 * n) / total;
    return { label: b.label, value: `${Math.round(pct)}%`, pct, highlight: b.key === "overheated" || b.key === "deep_value" };
  });

  const fromYear = Number((s[0].date ?? "2012").slice(0, 4));
  const toISO = SOURCE.fetchedAt ?? "";
  const toYear = toISO ? Number(toISO.slice(0, 4)) : fromYear;

  return {
    available: true,
    title: "Share of all weeks by Accumulation Index band",
    rows,
    caption: "Point-in-time Accumulation Index, weekly, across every cycle. Cheapest band at the top.",
    rangeLabel: `${total.toLocaleString()} weekly closes · ${fromYear}–${toYear} · recomputed live from source`,
  };
}

// ── Editorial badges (deterministic; no engagement signals wired for notes) ───
const NEW_WINDOW_DAYS = 45;

export function noteBadges(n: ResearchNote, todayISO: string): ResearchBadge[] {
  const badges: ResearchBadge[] = [];
  if (n.editorsPick) badges.push({ key: "editors-pick", label: "Editor's Pick", emoji: "⭐", tone: "gold" });
  const pub = Date.parse(`${n.datePublished}T00:00:00Z`);
  const today = Date.parse(`${todayISO}T00:00:00Z`);
  if (!Number.isNaN(pub) && !Number.isNaN(today) && Math.round((today - pub) / 86_400_000) <= NEW_WINDOW_DAYS) {
    badges.push({ key: "new", label: "New", emoji: "🆕", tone: "teal" });
  }
  return badges;
}
