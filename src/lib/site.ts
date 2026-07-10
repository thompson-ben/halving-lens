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

// ── Canonical host for embedded email IMAGES ─────────────────────────────────
// Mail image proxies (Gmail / Apple Mail) fetch an <img src> exactly once and do
// NOT follow redirects. So if SITE_URL's host 3xx-redirects to another host
// (e.g. apex <-> www on the CDN — invisible in a browser, which follows it), the
// hero image silently breaks in the email. Links are unaffected (clients follow
// redirects), so ONLY images need this.
//
// We resolve the redirect ONCE at send time (following it from SITE_URL) and use
// the FINAL origin — the host that serves a direct 200 — for image URLs. If the
// probe fails for any reason we fall back to SITE_URL, so sending never depends
// on it. Cached for the process lifetime.
let cachedImageBase: string | null = null;

export async function resolveEmailImageBase(): Promise<string> {
  if (cachedImageBase) return cachedImageBase;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    // A cheap host-level path — a host redirect applies to every path, so this
    // reveals the canonical origin without downloading the image itself.
    const res = await fetch(`${SITE_URL}/robots.txt`, { redirect: "follow", signal: ctrl.signal });
    clearTimeout(timer);
    cachedImageBase = new URL(res.url).origin;
  } catch {
    cachedImageBase = SITE_URL;
  }
  return cachedImageBase;
}

// Synchronous accessor for HTML builders: the resolved canonical origin once a
// send path has probed it (see resolveEmailImageBase), otherwise SITE_URL.
export function emailImageBase(): string {
  return cachedImageBase ?? SITE_URL;
}
