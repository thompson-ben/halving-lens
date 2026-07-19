// Editorial badge system for the Research Findings library. Fully deterministic:
// every badge is derived from the finding's own fixed metadata, from real
// first-party engagement passed in, and from the site's committed "today"
// (SOURCE.fetchedAt, never the wall clock). No fabricated signals — "Trending"
// is intentionally omitted until it can be measured honestly.

import type { ResearchFinding } from "./findings";

export interface ResearchBadge {
  key: string;
  label: string;
  emoji: string;
  tone: "gold" | "teal" | "violet" | "dim";
}

interface Engagement {
  views: number;
  shares: number;
}

// Days between two YYYY-MM-DD strings (both fixed, committed values — never the
// wall clock). Positive when `later` is after `earlier`.
function daysBetween(earlierISO: string, laterISO: string): number {
  const a = Date.parse(`${earlierISO}T00:00:00Z`);
  const b = Date.parse(`${laterISO}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.round((b - a) / 86_400_000);
}

// The single most-read and most-shared slug across the library, from real
// analytics. Returns null for a category when every finding scored zero, so we
// never crown a "leader" that no one actually engaged with.
export function findingLeaders(
  engagement: Record<string, Engagement>,
): { mostReadSlug: string | null; mostSharedSlug: string | null } {
  let mostReadSlug: string | null = null;
  let mostSharedSlug: string | null = null;
  let bestViews = 0;
  let bestShares = 0;
  for (const [slug, e] of Object.entries(engagement)) {
    if (e.views > bestViews) {
      bestViews = e.views;
      mostReadSlug = slug;
    }
    if (e.shares > bestShares) {
      bestShares = e.shares;
      mostSharedSlug = slug;
    }
  }
  return { mostReadSlug, mostSharedSlug };
}

const NEW_WINDOW_DAYS = 45;

// The badge row for a finding, in priority order.
export function findingBadges(
  f: ResearchFinding,
  ctx: {
    engagement: Record<string, Engagement>;
    leaders: ReturnType<typeof findingLeaders>;
    todayISO: string;
  },
): ResearchBadge[] {
  const badges: ResearchBadge[] = [];

  if (f.foundational) {
    badges.push({ key: "foundational", label: "Foundational", emoji: "📚", tone: "gold" });
  }
  if (f.editorsPick) {
    badges.push({ key: "editors-pick", label: "Editor's Pick", emoji: "⭐", tone: "gold" });
  }
  if (daysBetween(f.datePublished, ctx.todayISO) <= NEW_WINDOW_DAYS) {
    badges.push({ key: "new", label: "New", emoji: "🆕", tone: "teal" });
  }

  const eng = ctx.engagement[f.slug];
  if (f.slug === ctx.leaders.mostReadSlug && (eng?.views ?? 0) > 0) {
    badges.push({ key: "most-read", label: "Most Read", emoji: "📈", tone: "violet" });
  }
  if (f.slug === ctx.leaders.mostSharedSlug && (eng?.shares ?? 0) > 0) {
    badges.push({ key: "most-shared", label: "Most Shared", emoji: "📤", tone: "violet" });
  }

  return badges;
}
