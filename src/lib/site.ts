// Single source of truth for the production URL. Override via NEXT_PUBLIC_SITE_URL
// (e.g. for preview deploys); defaults to the live custom domain.
//
// CRITICAL: this must ALWAYS be an absolute https URL. Emails embed images and
// links as `${SITE_URL}/path`, so an empty or malformed value makes every URL
// relative — which silently breaks the hero image AND every link in the email.
// The daily-brief cron passes NEXT_PUBLIC_SITE_URL from a GitHub secret; when
// that secret is unset it arrives as an empty string, and `??` would NOT fall
// back (it only catches null/undefined). So validate: use the override only when
// it's a non-blank absolute http(s) URL, otherwise fall back to production.
function resolveSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const url = raw && /^https?:\/\//i.test(raw) ? raw : "https://halvinglens.com";
  return url.replace(/\/$/, "");
}

export const SITE_URL = resolveSiteUrl();
export const SITE_HOST = "halvinglens.com";
export const SITE_NAME = "halvinglens.com";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
