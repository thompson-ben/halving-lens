// The Journal — the publication layer over HalvingLens.
//
// A CHAPTER is a weekly edition. The CURRENT chapter is this week, read live as
// The State of Bitcoin (/state-of-bitcoin). PREVIOUS chapters are the weekly
// editions already archived by the Weekly Research system (/weekly/<slug>).
// This is a pure framing layer — no new storage, no snapshotting, no parallel
// numbering: chapter numbers come from the same weekly cadence the reports use,
// and every value is derived deterministically from existing reads.
//
// It is also the seam for later phases: the Ribbon consumes chapters(); the
// Watch / Confidence / Provenance layers attach fields to a Chapter; a
// cross-cycle Journal groups chapters by cycle. Nothing here blocks them.

import { format } from "date-fns";
import { briefDate } from "./briefArchive";
import { allWeeklies, editionForDate, weekSlugForDate, weekLabelForDate, type WeeklyReport } from "./weekly";
import { weekStory } from "./weekStory";
import { selectChartOfWeek } from "./chartOfWeek";

export type ChapterTone = "constructive" | "cautious" | "mixed" | "quiet";

export interface Chapter {
  number: number; // weekly edition number
  slug: string; // ISO week, e.g. "2026-W30"
  href: string; // where to read it
  isCurrent: boolean;
  dateLabel: string; // "Week of 21–27 July 2026"
  title: string; // the defining headline
  subtitle: string; // one calm line
  verdict: string; // "Constructive week" / "Quiet week" / a context label
  tone: ChapterTone;
  readingMinutes: number;
}

// Tone → a single restrained accent. Meaning, never decoration: constructive
// leans brand-teal, caution amber, a mixed read soft-blue, a quiet week grey.
export const CHAPTER_ACCENT: Record<ChapterTone, string> = {
  constructive: "#5eead4",
  cautious: "#f5b942",
  mixed: "#8aa0b5",
  quiet: "#5a6677",
};

function words(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// ── the current chapter — this week, read live as The State of Bitcoin ───────
export function currentChapter(): Chapter {
  const now = briefDate();
  const story = weekStory();
  const cs = story.cycleStatus;

  // The current chapter is always one ahead of the most recent archived edition
  // (or the day-derived edition before any exist), so the live chapter never
  // collides with last week's back-issue number.
  const prev = previousChapters();
  const number = prev.length ? prev[0].number + 1 : editionForDate(now);

  let tone: ChapterTone;
  let verdict: string;
  if (story.quietWeek) {
    tone = "quiet";
    verdict = "Quiet week";
  } else if (story.improved > story.weakened) {
    tone = "constructive";
    verdict = "Constructive week";
  } else if (story.weakened > story.improved) {
    tone = "cautious";
    verdict = "Cautious week";
  } else {
    tone = "mixed";
    verdict = "Mixed week";
  }

  return {
    number,
    slug: weekSlugForDate(now),
    href: "/state-of-bitcoin",
    isCurrent: true,
    dateLabel: weekLabelForDate(now),
    title: selectChartOfWeek().title,
    subtitle: cs.changed ? "The cycle read shifted this week." : "The broader cycle thesis held.",
    verdict,
    tone,
    readingMinutes: 6,
  };
}

// ── a previous chapter — an archived weekly edition ──────────────────────────
function chapterFromWeekly(w: WeeklyReport): Chapter {
  const stars = w.contextScore.stars;
  const tone: ChapterTone = stars >= 4 ? "constructive" : stars <= 2 ? "cautious" : "mixed";
  const mins = clamp(Math.round((words(w.executiveSummary.join(" ")) + words(w.biggestStory.body)) / 200), 3, 9);
  return {
    number: w.edition,
    slug: w.slug,
    href: `/weekly/${w.slug}`,
    isCurrent: false,
    dateLabel: w.weekLabel,
    title: w.biggestStory.title,
    subtitle: w.executiveSummary[0] ?? w.contextScore.label,
    verdict: w.contextScore.label,
    tone,
    readingMinutes: mins,
  };
}

// Previous chapters, newest first, excluding the current week (which is read
// live as the current chapter rather than as a frozen back-issue).
export function previousChapters(): Chapter[] {
  const currentSlug = weekSlugForDate(briefDate());
  return allWeeklies()
    .filter((w) => w.slug !== currentSlug)
    .map(chapterFromWeekly);
}

// The whole publication, newest first (current chapter leads).
export function chapters(): Chapter[] {
  return [currentChapter(), ...previousChapters()];
}

export function chapterCount(): number {
  return chapters().length;
}

// The chapter immediately before the current one — for "← Previous Chapter".
export function previousChapter(): Chapter | null {
  return previousChapters()[0] ?? null;
}
