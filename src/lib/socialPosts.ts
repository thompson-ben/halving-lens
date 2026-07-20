// Persisted social-post history — the memory behind the Editorial Story Engine.
//
// Social content is published manually from /admin/content. When the operator
// marks a pack as posted, one row lands in the `social_posts` table (see
// supabase/social_posts.sql). The story engine reads the recent rows so it can
// keep consecutive posts fresh — never the same hero chart, layout, angle or
// headline two posts running (unless today's story is genuinely the biggest).
//
// Everything fails open: with Supabase unconfigured, reads return [] and the
// engine falls back to pure importance scoring (no diversity), so the studio and
// the render pipeline never break.

import { sbSelect, sbInsert, supabaseConfigured } from "./supabase";
import type { RecentPost } from "./storyEngine";

interface SocialPostRow {
  post_date: string;
  pack: string;
  hero_card: string | null;
  headline: string | null;
  layout: string | null;
  primary_metric: string | null;
  story_category: string | null;
  score: number | null;
}

// The most recent published posts (newest first), as the engine's diversity
// memory. `limit` covers the widest diversity window with margin.
export async function recentSocialPosts(limit = 60): Promise<RecentPost[]> {
  if (!supabaseConfigured) return [];
  const rows = await sbSelect<SocialPostRow[]>(
    `social_posts?select=post_date,pack,hero_card,headline,layout,primary_metric,story_category,score&order=post_date.desc,posted_at.desc&limit=${Math.max(1, Math.min(200, limit))}`,
  );
  if (!rows) return [];
  return rows.map((r) => ({
    postDate: r.post_date,
    pack: r.pack,
    heroCard: r.hero_card,
    headline: r.headline,
    layout: r.layout,
    primaryMetric: r.primary_metric,
    category: r.story_category,
  }));
}

export interface RecordSocialPostInput {
  postDate: string; // yyyy-mm-dd
  pack: string;
  heroCard?: string | null;
  headline?: string | null;
  layout?: string | null;
  primaryMetric?: string | null;
  category?: string | null;
  score?: number | null;
}

export interface RecordResult {
  ok: boolean;
  error?: "not_configured" | "store_failed";
}

// Log a published post. Idempotency is intentionally NOT enforced — an operator
// may post the same pack more than once, and a duplicate row simply reinforces
// recency in the diversity memory.
export async function recordSocialPost(input: RecordSocialPostInput): Promise<RecordResult> {
  if (!supabaseConfigured) return { ok: false, error: "not_configured" };
  const ok = await sbInsert("social_posts", {
    post_date: input.postDate,
    pack: input.pack,
    hero_card: input.heroCard ?? null,
    headline: input.headline ?? null,
    layout: input.layout ?? null,
    primary_metric: input.primaryMetric ?? null,
    story_category: input.category ?? null,
    score: input.score ?? null,
  });
  return ok ? { ok: true } : { ok: false, error: "store_failed" };
}
