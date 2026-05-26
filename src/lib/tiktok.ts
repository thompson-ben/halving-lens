// TikTok Display API wrapper.
//
// IMPORTANT scope note: the Display API only exposes the *authenticated
// user's own* videos via OAuth (scopes: user.info.basic + video.list). It
// has no public search endpoint, so this connector pulls videos from the
// account that owns `TIKTOK_ACCESS_TOKEN` — useful for reposting your own
// TikTok content to Instagram, or for collaborators who connect their own
// account. Discovery of arbitrary third-party creators requires either:
//   - Each creator connecting their own account, or
//   - Manual URL imports via /import, or
//   - TikTok's closed Research API (academic only).
//
// OAuth bootstrap (token acquisition) is intentionally not implemented
// here — for now, drop a long-lived access token into TIKTOK_ACCESS_TOKEN
// and the sync route will use it. A full OAuth flow can land in a
// follow-up modeled on the Instagram callback route.

import { env, hasTikTokCredentials } from "./env";

const API_BASE = "https://open.tiktokapis.com/v2";

export type TikTokVideo = {
  videoId: string;
  url: string;
  title?: string;
  description?: string;
  username?: string;
  thumbnailUrl?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  duration?: number;
  createdAt?: string;
};

export class TikTokError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "TikTokError";
  }
}

type VideoListItem = {
  id: string;
  title?: string;
  video_description?: string;
  cover_image_url?: string;
  share_url?: string;
  embed_link?: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  create_time?: number;
};

type VideoListResponse = {
  data?: { videos?: VideoListItem[]; cursor?: number; has_more?: boolean };
  error?: { code?: string; message?: string };
};

type UserInfoResponse = {
  data?: { user?: { open_id?: string; union_id?: string; display_name?: string; username?: string } };
  error?: { code?: string; message?: string };
};

async function call<T>(path: string, init: RequestInit): Promise<T> {
  if (!hasTikTokCredentials()) {
    throw new TikTokError("TIKTOK_ACCESS_TOKEN is not configured", 401);
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${env.tiktok.accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new TikTokError(`TikTok API ${res.status}: ${body}`, res.status);
  }
  return (await res.json()) as T;
}

async function fetchUsername(): Promise<string | undefined> {
  try {
    const res = await call<UserInfoResponse>(
      "/user/info/?fields=open_id,username,display_name",
      { method: "GET" },
    );
    return res.data?.user?.username ?? res.data?.user?.display_name;
  } catch {
    return undefined;
  }
}

/**
 * Fetch the connected user's recent videos. `limit` caps at 20 per page
 * (TikTok's documented max for video/list).
 */
export async function fetchUserVideos(limit = 20): Promise<TikTokVideo[]> {
  const fields = [
    "id",
    "title",
    "video_description",
    "cover_image_url",
    "share_url",
    "embed_link",
    "duration",
    "view_count",
    "like_count",
    "comment_count",
    "share_count",
    "create_time",
  ].join(",");

  const res = await call<VideoListResponse>(`/video/list/?fields=${fields}`, {
    method: "POST",
    body: JSON.stringify({ max_count: Math.min(20, limit) }),
  });

  if (res.error?.code && res.error.code !== "ok") {
    throw new TikTokError(res.error.message ?? "TikTok video list error");
  }

  const username = await fetchUsername();
  const items = res.data?.videos ?? [];
  return items.map((v) => ({
    videoId: v.id,
    url: v.share_url ?? (username ? `https://www.tiktok.com/@${username}/video/${v.id}` : `https://www.tiktok.com/video/${v.id}`),
    title: v.title,
    description: v.video_description,
    username,
    thumbnailUrl: v.cover_image_url,
    viewCount: v.view_count,
    likeCount: v.like_count,
    commentCount: v.comment_count,
    shareCount: v.share_count,
    duration: v.duration,
    createdAt: v.create_time ? new Date(v.create_time * 1000).toISOString() : undefined,
  }));
}

// ---------------------------------------------------------------------------
// Mock fallback — keeps the dashboard demonstrable without OAuth setup.
// ---------------------------------------------------------------------------
const MOCK_ITEMS: TikTokVideo[] = [
  {
    videoId: "mockTT001",
    url: "https://www.tiktok.com/@porschefiles/video/mockTT001",
    title: "Porsche 992 GT3 RS — Weissach pack flyby",
    description: "Nürburgring flyby, full send, full Weissach pack.",
    username: "porschefiles",
    thumbnailUrl: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=900&q=70",
    viewCount: 3_800_000,
    likeCount: 211_000,
    commentCount: 3_400,
    shareCount: 18_400,
    duration: 14,
    createdAt: new Date().toISOString(),
  },
  {
    videoId: "mockTT002",
    url: "https://www.tiktok.com/@supercarblondie/video/mockTT002",
    title: "Bugatti Tourbillon launch walkaround",
    description: "1800hp V16 hybrid — first hands-on with the Tourbillon.",
    username: "supercarblondie",
    thumbnailUrl: "https://images.unsplash.com/photo-1626668893632-6f3a4466d22f?auto=format&fit=crop&w=900&q=70",
    viewCount: 5_200_000,
    likeCount: 412_000,
    commentCount: 7_100,
    shareCount: 32_900,
    duration: 28,
    createdAt: new Date().toISOString(),
  },
  {
    videoId: "mockTT003",
    url: "https://www.tiktok.com/@italian_supercars/video/mockTT003",
    title: "Lamborghini Revuelto — V12 PHEV cold start",
    description: "Sant'Agata's flagship waking up — listen on headphones.",
    username: "italian_supercars",
    thumbnailUrl: "https://images.unsplash.com/photo-1614200179396-2bdb77ebf81b?auto=format&fit=crop&w=900&q=70",
    viewCount: 1_900_000,
    likeCount: 142_500,
    commentCount: 2_300,
    shareCount: 9_800,
    duration: 11,
    createdAt: new Date().toISOString(),
  },
];

export function getMockTikTokItems(): TikTokVideo[] {
  return MOCK_ITEMS;
}

export function shouldUseMockTikTok(): boolean {
  return env.useMockData || !hasTikTokCredentials();
}
