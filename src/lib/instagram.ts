// Thin wrapper around the Instagram Graph API. Designed so the rest of the app
// can call `fetchInstagramPosts()` / `fetchPostInsights()` without caring
// whether we're hitting Meta or falling back to mock data.
//
// See META_API_SETUP.md for full instructions on obtaining the access token
// and Business Account ID.

import { env } from "./env";
import { getResolvedInstagramCreds, hasResolvedInstagramCreds } from "./instagramCreds";
import { mockInstagramPosts } from "./mockData";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

// Re-export so existing call sites that imported `hasInstagramCredentials`
// from this module keep working — they all live in API routes that already
// run async, so the synchronous → async swap is transparent.
export { hasResolvedInstagramCreds as hasInstagramCredentials };

export type IGMedia = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REEL";
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

export type IGInsight = {
  impressions?: number;
  reach?: number;
  saved?: number;
  shares?: number;
  video_views?: number;
  engagement?: number;
};

export class InstagramError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "InstagramError";
  }
}

async function graph<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const creds = await getResolvedInstagramCreds();
  if (!creds.accessToken || !creds.igBusinessAccountId) {
    throw new InstagramError("Instagram credentials are not configured", 401);
  }
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", creds.accessToken);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new InstagramError(`Graph API ${res.status}: ${body}`, res.status);
  }
  return (await res.json()) as T;
}

/**
 * Fetch the most recent media for the connected IG Business Account.
 * Falls back to mock data when credentials aren't configured.
 */
export async function fetchInstagramPosts(limit = 50): Promise<IGMedia[]> {
  const creds = await getResolvedInstagramCreds();
  if (!creds.accessToken || !creds.igBusinessAccountId || env.useMockData) {
    return mockInstagramPosts.slice(0, limit).map((p) => ({
      id: p.id,
      caption: p.caption,
      media_type: p.mediaType as IGMedia["media_type"],
      media_url: p.mediaUrl,
      permalink: p.permalink,
      thumbnail_url: p.thumbnailUrl,
      timestamp: p.timestamp.toISOString(),
      like_count: p.likes,
      comments_count: p.comments,
    }));
  }

  const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "permalink",
    "thumbnail_url",
    "timestamp",
    "like_count",
    "comments_count",
  ].join(",");

  const data = await graph<{ data: IGMedia[] }>(`/${creds.igBusinessAccountId}/media`, {
    fields,
    limit: String(limit),
  });
  return data.data;
}

/**
 * Pull insights for a single media item. Different metric sets are valid for
 * different media types; this requests the safe superset and tolerates
 * partial responses.
 */
export async function fetchPostInsights(mediaId: string, mediaType: string): Promise<IGInsight> {
  const credsReady = await hasResolvedInstagramCreds();
  if (!credsReady || env.useMockData) {
    const seed = mockInstagramPosts.find((p) => p.id === mediaId);
    return {
      reach: seed?.reach,
      impressions: seed?.impressions,
      saved: seed?.saves,
      shares: seed?.shares,
      video_views: seed?.videoViews ?? undefined,
      engagement: seed?.likes && seed?.comments ? seed.likes + seed.comments : undefined,
    };
  }

  const metrics = mediaType === "VIDEO" || mediaType === "REEL"
    ? "impressions,reach,saved,shares,video_views"
    : "impressions,reach,saved,shares,engagement";

  const data = await graph<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
    `/${mediaId}/insights`,
    { metric: metrics },
  );

  const out: IGInsight = {};
  for (const m of data.data) {
    const value = m.values?.[0]?.value;
    if (typeof value === "number") (out as Record<string, number>)[m.name] = value;
  }
  return out;
}

/**
 * Look up a public IG Business / Creator account's recent media via the
 * Graph API's business_discovery edge. Uses our own IG_BUSINESS_ACCOUNT_ID
 * as the entry point — this is the official, non-scrape route for
 * surfacing other accounts' recent posts.
 *
 * Constraints (per Meta docs):
 *   - Only works against Business or Creator accounts (not personal).
 *   - 200 calls/hour per IG User on read endpoints.
 *   - Returns null on any error so callers can mark the competitor as
 *     skipped without blowing up the whole scan.
 */
export type IGBusinessDiscoveryMedia = {
  id: string;
  caption?: string;
  media_type?: string;
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
};

export type IGBusinessDiscovery = {
  username: string;
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  media: IGBusinessDiscoveryMedia[];
};

export async function businessDiscovery(handle: string, mediaLimit = 12): Promise<IGBusinessDiscovery | null> {
  const creds = await getResolvedInstagramCreds();
  if (!creds.accessToken || !creds.igBusinessAccountId) return null;
  const clean = handle.replace(/^@+/, "");
  const profileFields = [
    "username",
    "name",
    "biography",
    "profile_picture_url",
    "followers_count",
    "follows_count",
    "media_count",
  ].join(",");
  const mediaFields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "permalink",
    "thumbnail_url",
    "timestamp",
    "like_count",
    "comments_count",
  ].join(",");
  const fields = `business_discovery.username(${clean}){${profileFields},media.limit(${mediaLimit}){${mediaFields}}}`;
  try {
    const data = await graph<{
      business_discovery?: {
        username: string;
        name?: string;
        biography?: string;
        profile_picture_url?: string;
        followers_count?: number;
        follows_count?: number;
        media_count?: number;
        media?: { data?: IGBusinessDiscoveryMedia[] };
      };
    }>(`/${creds.igBusinessAccountId}`, { fields });
    const bd = data.business_discovery;
    if (!bd) return null;
    return {
      username: bd.username,
      name: bd.name,
      biography: bd.biography,
      profile_picture_url: bd.profile_picture_url,
      followers_count: bd.followers_count,
      follows_count: bd.follows_count,
      media_count: bd.media_count,
      media: bd.media?.data ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Publish a media item to the connected IG Business Account.
 * Two-step process: create container, then publish.
 *
 * NOTE: by default the engine never calls this without explicit user approval.
 * Auto-post is off by default and gated behind a settings flag.
 */
export async function publishImage(opts: { imageUrl: string; caption: string }): Promise<{ id: string }> {
  const creds = await getResolvedInstagramCreds();
  if (!creds.accessToken || !creds.igBusinessAccountId) {
    throw new InstagramError("Instagram credentials are not configured", 401);
  }
  const container = await graph<{ id: string }>(`/${creds.igBusinessAccountId}/media`, {
    image_url: opts.imageUrl,
    caption: opts.caption,
  });
  const published = await graph<{ id: string }>(`/${creds.igBusinessAccountId}/media_publish`, {
    creation_id: container.id,
  });
  return published;
}
