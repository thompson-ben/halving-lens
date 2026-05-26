// Thin wrapper around YouTube Data API v3 for sourcing Shorts.
//
// Search is the expensive endpoint (100 quota units per call) — defaults
// keep daily usage well under the free 10,000-unit quota: a daily sync of
// 5 queries × 1 search + 1 batched videos.list (~50 ids @ 1 unit) ≈ 550
// units. Shorts are detected via `videoDuration=short` (which actually
// returns clips under 4 minutes — we additionally filter on contentDetails
// duration when we want strict ≤60s Shorts).
//
// Falls back to mock data when no key is configured or USE_MOCK_DATA=true.

import { env, hasYouTubeCredentials } from "./env";

const API_BASE = "https://www.googleapis.com/youtube/v3";

export type YouTubeItem = {
  videoId: string;
  url: string;
  title: string;
  description?: string;
  channelTitle?: string;
  channelId?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  durationSeconds?: number;
};

export class YouTubeError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "YouTubeError";
  }
}

type SearchResponse = {
  items?: Array<{
    id: { videoId?: string };
    snippet: {
      title: string;
      description?: string;
      channelTitle?: string;
      channelId?: string;
      publishedAt?: string;
      thumbnails?: { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };
    };
  }>;
};

type VideoStats = {
  id: string;
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails?: { duration?: string };
};

type VideosResponse = {
  items?: VideoStats[];
};

async function call<T>(path: string, params: Record<string, string>): Promise<T> {
  if (!hasYouTubeCredentials()) {
    throw new YouTubeError("YOUTUBE_API_KEY is not configured", 401);
  }
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", env.youtubeApiKey);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new YouTubeError(`YouTube API ${res.status}: ${body}`, res.status);
  }
  return (await res.json()) as T;
}

/**
 * ISO 8601 duration (PT#H#M#S) → seconds. Returns null on parse failure.
 */
export function parseIsoDuration(iso?: string): number | null {
  if (!iso) return null;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const [, h, mn, s] = m;
  return (Number(h ?? 0) * 3600) + (Number(mn ?? 0) * 60) + Number(s ?? 0);
}

/**
 * Search for Shorts matching a query and return enriched items with stats.
 * `maxShortDuration` defaults to 180s (matches YouTube's current Shorts spec).
 */
export async function searchShorts(query: string, opts: { limit?: number; maxShortDuration?: number } = {}): Promise<YouTubeItem[]> {
  const limit = Math.max(1, Math.min(50, opts.limit ?? 10));
  const maxDur = opts.maxShortDuration ?? 180;

  const search = await call<SearchResponse>("/search", {
    part: "snippet",
    type: "video",
    videoDuration: "short",
    order: "viewCount",
    maxResults: String(limit),
    q: query,
  });

  const base: YouTubeItem[] = (search.items ?? [])
    .filter((it) => it.id.videoId)
    .map((it) => ({
      videoId: it.id.videoId!,
      url: `https://www.youtube.com/shorts/${it.id.videoId}`,
      title: it.snippet.title,
      description: it.snippet.description,
      channelTitle: it.snippet.channelTitle,
      channelId: it.snippet.channelId,
      publishedAt: it.snippet.publishedAt,
      thumbnailUrl:
        it.snippet.thumbnails?.high?.url ??
        it.snippet.thumbnails?.medium?.url ??
        it.snippet.thumbnails?.default?.url,
    }));

  if (base.length === 0) return [];

  const videos = await call<VideosResponse>("/videos", {
    part: "statistics,contentDetails",
    id: base.map((b) => b.videoId).join(","),
  });

  const byId = new Map<string, VideoStats>();
  for (const v of videos.items ?? []) {
    byId.set(v.id, v);
  }

  return base
    .map((b) => {
      const stats = byId.get(b.videoId);
      const durationSeconds = parseIsoDuration(stats?.contentDetails?.duration) ?? undefined;
      return {
        ...b,
        viewCount: stats?.statistics?.viewCount ? Number(stats.statistics.viewCount) : undefined,
        likeCount: stats?.statistics?.likeCount ? Number(stats.statistics.likeCount) : undefined,
        commentCount: stats?.statistics?.commentCount ? Number(stats.statistics.commentCount) : undefined,
        durationSeconds,
      };
    })
    .filter((b) => b.durationSeconds === undefined || b.durationSeconds <= maxDur);
}

// ---------------------------------------------------------------------------
// Mock fallback — keeps the dashboard demonstrable without an API key.
// ---------------------------------------------------------------------------
const MOCK_ITEMS: YouTubeItem[] = [
  {
    videoId: "mockYT001",
    url: "https://www.youtube.com/shorts/mockYT001",
    title: "Ferrari SF90 XX Stradale — first track lap",
    description: "986hp hybrid V8 hitting the redline at Fiorano.",
    channelTitle: "Top Gear",
    channelId: "UCmockTopGear",
    publishedAt: new Date().toISOString(),
    thumbnailUrl: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=70",
    viewCount: 2_400_000,
    likeCount: 142_000,
    commentCount: 3_100,
    durationSeconds: 47,
  },
  {
    videoId: "mockYT002",
    url: "https://www.youtube.com/shorts/mockYT002",
    title: "Lamborghini Revuelto vs Porsche 911 GT3 RS — sound check",
    description: "Naturally-aspirated V12 PHEV vs flat-six. Which wins your ears?",
    channelTitle: "Donut Media",
    channelId: "UCmockDonut",
    publishedAt: new Date().toISOString(),
    thumbnailUrl: "https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?auto=format&fit=crop&w=900&q=70",
    viewCount: 1_850_000,
    likeCount: 98_500,
    commentCount: 2_200,
    durationSeconds: 58,
  },
  {
    videoId: "mockYT003",
    url: "https://www.youtube.com/shorts/mockYT003",
    title: "McLaren 750S Spider launch control",
    description: "0-60 in 2.7s with the roof down.",
    channelTitle: "Carwow",
    channelId: "UCmockCarwow",
    publishedAt: new Date().toISOString(),
    thumbnailUrl: "https://images.unsplash.com/photo-1567808291548-fc3ee04dbcf0?auto=format&fit=crop&w=900&q=70",
    viewCount: 1_120_000,
    likeCount: 71_200,
    commentCount: 1_540,
    durationSeconds: 32,
  },
];

export function getMockYoutubeItems(): YouTubeItem[] {
  return MOCK_ITEMS;
}

export function shouldUseMockYouTube(): boolean {
  return env.useMockData || !hasYouTubeCredentials();
}
