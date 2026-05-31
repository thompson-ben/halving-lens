// Daily Brief archive. Past briefs are persisted by the daily sync into
// src/lib/data/briefs.ts; today's brief renders live. The archive index merges
// stored history with today so the month/year structure is real and crawlable.

import { format } from "date-fns";
import { SOURCE } from "./btcData";
import { STORED_BRIEFS } from "./data/briefs";
import type { StoredBrief } from "./brief";

export function briefDate(): Date {
  return SOURCE.fetchedAt ? new Date(SOURCE.fetchedAt) : new Date();
}

export function todaySlug(): string {
  return format(briefDate(), "yyyy-MM-dd");
}

export function isValidSlug(slug: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(slug) && !Number.isNaN(new Date(slug).getTime());
}

export function isToday(slug: string): boolean {
  return slug === todaySlug();
}

export function formatSlugDate(slug: string): string {
  return format(new Date(slug), "d MMMM yyyy");
}

export function storedBrief(slug: string): StoredBrief | null {
  return STORED_BRIEFS.find((b) => b.slug === slug) ?? null;
}

// The most recent stored brief from BEFORE today — the "yesterday" comparison
// point. Null until at least one prior day has been persisted.
export function priorBrief(): StoredBrief | null {
  const tSlug = todaySlug();
  const past = STORED_BRIEFS.filter((b) => b.slug < tSlug).sort((a, b) => (a.slug < b.slug ? 1 : -1));
  return past[0] ?? null;
}

export function allBriefSlugs(): string[] {
  const set = new Set(STORED_BRIEFS.map((b) => b.slug));
  set.add(todaySlug());
  return [...set];
}

export interface ArchiveDay {
  slug: string;
  day: number;
  isToday: boolean;
  available: boolean; // has stored content or is today
}

export interface ArchiveMonth {
  key: string; // YYYY-MM
  label: string; // "May 2026"
  days: ArchiveDay[];
}

// Group every available brief (stored history + today) by month, newest first.
export function archiveIndex(): ArchiveMonth[] {
  const tSlug = todaySlug();
  const stored = new Set(STORED_BRIEFS.map((b) => b.slug));
  const slugs = allBriefSlugs().sort((a, b) => (a < b ? 1 : -1));

  const byMonth = new Map<string, ArchiveDay[]>();
  for (const slug of slugs) {
    const d = new Date(slug);
    const key = format(d, "yyyy-MM");
    const arr = byMonth.get(key) ?? [];
    arr.push({
      slug,
      day: d.getUTCDate(),
      isToday: slug === tSlug,
      available: slug === tSlug || stored.has(slug),
    });
    byMonth.set(key, arr);
  }

  return [...byMonth.entries()].map(([key, days]) => ({
    key,
    label: format(new Date(`${key}-01`), "MMMM yyyy"),
    days,
  }));
}
