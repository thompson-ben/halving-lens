// X (Twitter) API v2 wrapper. Uses the GET /2/tweets/search/recent
// endpoint to surface media tweets matching configured car queries.
//
// IMPORTANT: as of 2024, X API recent search requires the Basic tier or
// higher ($100+/month). The Free tier returns 403 for this endpoint.
// The wrapper degrades gracefully — without a bearer token (or on 403)
// we fall back to mock items, so the dashboard remains demonstrable.

import { env, hasTwitterCredentials } from "./env";

const API_BASE = "https://api.twitter.com/2";

export type TwitterMediaTweet = {
  tweetId: string;
  url: string;
  text: string;
  authorUsername?: string;
  authorName?: string;
  thumbnailUrl?: string;
  likeCount?: number;
  retweetCount?: number;
  replyCount?: number;
  viewCount?: number;
  createdAt?: string;
};

export class TwitterError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "TwitterError";
  }
}

type SearchResponse = {
  data?: Array<{
    id: string;
    text: string;
    author_id: string;
    created_at?: string;
    attachments?: { media_keys?: string[] };
    public_metrics?: {
      like_count?: number;
      retweet_count?: number;
      reply_count?: number;
      impression_count?: number;
    };
  }>;
  includes?: {
    users?: Array<{ id: string; username: string; name: string }>;
    media?: Array<{
      media_key: string;
      type: string;
      url?: string;
      preview_image_url?: string;
    }>;
  };
  errors?: Array<{ title?: string; detail?: string }>;
};

async function call<T>(path: string, params: Record<string, string>): Promise<T> {
  if (!hasTwitterCredentials()) {
    throw new TwitterError("TWITTER_BEARER_TOKEN is not configured", 401);
  }
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { Authorization: `Bearer ${env.twitterBearerToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TwitterError(`Twitter API ${res.status}: ${body}`, res.status);
  }
  return (await res.json()) as T;
}

/**
 * Search recent media tweets matching `query`. Adds `has:media -is:retweet
 * -is:reply` so we only ingest standalone visual content.
 */
export async function searchMediaTweets(query: string, limit = 20): Promise<TwitterMediaTweet[]> {
  const fullQuery = `(${query}) has:media -is:retweet -is:reply lang:en`;
  const max = Math.max(10, Math.min(100, limit));

  const res = await call<SearchResponse>("/tweets/search/recent", {
    query: fullQuery,
    max_results: String(max),
    expansions: "author_id,attachments.media_keys",
    "tweet.fields": "created_at,public_metrics,attachments",
    "user.fields": "username,name",
    "media.fields": "type,url,preview_image_url",
  });

  const usersById = new Map((res.includes?.users ?? []).map((u) => [u.id, u]));
  const mediaByKey = new Map((res.includes?.media ?? []).map((m) => [m.media_key, m]));

  return (res.data ?? []).map((t) => {
    const author = usersById.get(t.author_id);
    const firstMediaKey = t.attachments?.media_keys?.[0];
    const media = firstMediaKey ? mediaByKey.get(firstMediaKey) : undefined;
    const username = author?.username;
    return {
      tweetId: t.id,
      url: username ? `https://x.com/${username}/status/${t.id}` : `https://x.com/i/status/${t.id}`,
      text: t.text,
      authorUsername: username,
      authorName: author?.name,
      thumbnailUrl: media?.url ?? media?.preview_image_url,
      likeCount: t.public_metrics?.like_count,
      retweetCount: t.public_metrics?.retweet_count,
      replyCount: t.public_metrics?.reply_count,
      viewCount: t.public_metrics?.impression_count,
      createdAt: t.created_at,
    };
  });
}

// ---------------------------------------------------------------------------
// Mock fallback — used when no bearer token is set or USE_MOCK_DATA=true.
// ---------------------------------------------------------------------------
const MOCK_ITEMS: TwitterMediaTweet[] = [
  {
    tweetId: "mockTW001",
    url: "https://x.com/bugattiofficial/status/mockTW001",
    text: "Bugatti Tourbillon — 1800hp, V16 hybrid, naturally aspirated. Engineered for the next century.",
    authorUsername: "bugattiofficial",
    authorName: "Bugatti",
    thumbnailUrl: "https://images.unsplash.com/photo-1626668893632-6f3a4466d22f?auto=format&fit=crop&w=900&q=70",
    likeCount: 78_000,
    retweetCount: 12_400,
    replyCount: 1_100,
    viewCount: 4_200_000,
    createdAt: new Date().toISOString(),
  },
  {
    tweetId: "mockTW002",
    url: "https://x.com/ferrari/status/mockTW002",
    text: "F80 — three letters, six syllables, 1200 horsepower. Maranello's next halo.",
    authorUsername: "Ferrari",
    authorName: "Ferrari",
    thumbnailUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=70",
    likeCount: 124_000,
    retweetCount: 22_500,
    replyCount: 3_400,
    viewCount: 7_800_000,
    createdAt: new Date().toISOString(),
  },
  {
    tweetId: "mockTW003",
    url: "https://x.com/Porsche/status/mockTW003",
    text: "992.2 GT3 RS — Weissach pack, aero everywhere, naturally aspirated 4.0-litre flat-six.",
    authorUsername: "Porsche",
    authorName: "Porsche",
    thumbnailUrl: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=900&q=70",
    likeCount: 92_300,
    retweetCount: 14_200,
    replyCount: 2_100,
    viewCount: 5_100_000,
    createdAt: new Date().toISOString(),
  },
];

export function getMockTwitterItems(): TwitterMediaTweet[] {
  return MOCK_ITEMS;
}

export function shouldUseMockTwitter(): boolean {
  return env.useMockData || !hasTwitterCredentials();
}
