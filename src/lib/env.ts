// Centralised, typed environment access. Keeping this thin so the rest of the
// app never reaches into process.env directly.

function flag(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === "1" || v.toLowerCase() === "true";
}

export const env = {
  isProd: process.env.NODE_ENV === "production",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  useMockData: flag("USE_MOCK_DATA", true),

  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",

  youtubeApiKey: process.env.YOUTUBE_API_KEY ?? "",
  twitterBearerToken: process.env.TWITTER_BEARER_TOKEN ?? "",

  meta: {
    appId: process.env.META_APP_ID ?? "",
    appSecret: process.env.META_APP_SECRET ?? "",
    redirectUri: process.env.META_REDIRECT_URI ?? "",
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN ?? "",
    igBusinessAccountId: process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "",
    pageId: process.env.FACEBOOK_PAGE_ID ?? "",
  },

  tiktok: {
    clientKey: process.env.TIKTOK_CLIENT_KEY ?? "",
    clientSecret: process.env.TIKTOK_CLIENT_SECRET ?? "",
    accessToken: process.env.TIKTOK_ACCESS_TOKEN ?? "",
  },
};

export function hasInstagramCredentials(): boolean {
  return Boolean(env.meta.accessToken && env.meta.igBusinessAccountId);
}

export function hasOpenAI(): boolean {
  return Boolean(env.openaiApiKey);
}

export function hasYouTubeCredentials(): boolean {
  return Boolean(env.youtubeApiKey);
}

export function hasTikTokCredentials(): boolean {
  return Boolean(env.tiktok.accessToken);
}

export function hasTwitterCredentials(): boolean {
  return Boolean(env.twitterBearerToken);
}
