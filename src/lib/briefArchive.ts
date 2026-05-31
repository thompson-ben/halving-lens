// Daily Brief archive scaffolding. Briefs are generated live from the current
// snapshot, so a true historical archive needs persisted daily snapshots (a
// follow-up: have the daily sync write a dated brief JSON). For now we expose:
//   - today's dated slug (permalink target)
//   - a month/year index structure
//   - helpers to parse/validate a brief date slug
// The dated route renders today's live brief when the slug is today, and an
// honest "not archived yet" state for past/future dates — never fabricated.

import { SOURCE } from "./btcData";
import { format } from "date-fns";

export function briefDate(): Date {
  return SOURCE.fetchedAt ? new Date(SOURCE.fetchedAt) : new Date();
}

// Slug format: YYYY-MM-DD
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

export interface ArchiveMonth {
  year: number;
  month: number; // 1-12
  label: string; // "May 2026"
  days: { slug: string; day: number; isToday: boolean; available: boolean }[];
}

// Build the archive index. Today is the only "available" brief; earlier days in
// the current month are listed as upcoming-archive placeholders so the
// month/year structure is real and SEO-crawlable without faking content.
export function archiveIndex(): ArchiveMonth[] {
  const today = briefDate();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-11
  const tSlug = todaySlug();

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const upToToday = today.getDate();
  const days = Array.from({ length: upToToday }, (_, i) => {
    const day = i + 1;
    const slug = format(new Date(y, m, day), "yyyy-MM-dd");
    return { slug, day, isToday: slug === tSlug, available: slug === tSlug };
  }).reverse();

  void daysInMonth;
  return [
    {
      year: y,
      month: m + 1,
      label: format(today, "MMMM yyyy"),
      days,
    },
  ];
}
