// Thin wrapper around the Instagram Graph API. Designed so the rest of the app
// can call `fetchInstagramPosts()` / `fetchPostInsights()` without caring
// whether we're hitting Meta or falling back to mock data.
//
// See META_API_SETUP.md for full instructions on obtaining the access token
// and Business Account ID.

import { env, hasInstagramCredentials } from "./env";
import { mockInstagramPosts } from "./mockData";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

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
  if (!hasInstagramCredentials()) {
    throw new InstagramError("Instagram credentials are not configured", 401);
  }
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", env.meta.accessToken);

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
  if (!hasInstagramCredentials() || env.useMockData) {
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

  const data = await graph<{ data: IGMedia[] }>(`/${env.meta.igBusinessAccountId}/media`, {
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
  if (!hasInstagramCredentials() || env.useMockData) {
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
 * Publish a media item to the connected IG Business Account.
 * Two-step process: create container, then publish.
 *
 * NOTE: by default the engine never calls this without explicit user approval.
 * Auto-post is off by default and gated behind a settings flag.
 */
export async function publishImage(opts: { imageUrl: string; caption: string }): Promise<{ id: string }> {
  if (!hasInstagramCredentials()) {
    throw new InstagramError("Instagram credentials are not configured", 401);
  }
  const container = await graph<{ id: string }>(`/${env.meta.igBusinessAccountId}/media`, {
    image_url: opts.imageUrl,
    caption: opts.caption,
  });
  const published = await graph<{ id: string }>(`/${env.meta.igBusinessAccountId}/media_publish`, {
    creation_id: container.id,
  });
  return published;
}
