// Single source of truth for HalvingLens share links. Every shared URL — from
// the Share button, a QR code, a business card or an email — routes through the
// branded short-link path /r/<slug>, which records the hit and redirects to the
// real page (see src/app/r/[slug]/route.ts).
//
// Two kinds of canonical short link, neither of which needs a database row (so we
// never create duplicate links every time someone taps Share):
//
//   1. Friendly aliases for the major pages (home, accumulation, hl-r002, …).
//   2. A reversible path encoding (~<base64url>) for any other page, so the
//      Share button works universally without ever minting a new stored link.
//
// Founder CAMPAIGN links (/r/norfolk-networking) are the third kind — those DO
// live in the database (share_campaigns) and are resolved first in the redirect
// route. Campaign slugs must not collide with the reserved aliases below.
//
// This module is pure (no DB, no secrets) so it is safe on both client + server.

import { SITE_URL } from "./site";

// Friendly, permanent aliases for the major pages. slug → destination path.
// Stable over time — treat these as canonical URLs; don't renumber them.
export const CANONICAL_ALIASES: Record<string, string> = {
  home: "/",
  "state-of-bitcoin": "/state-of-bitcoin",
  snapshot: "/state-of-bitcoin", // legacy alias — keeps old /r/snapshot short links working
  dashboard: "/dashboard",
  cycles: "/cycles",
  "similar-moments": "/similar-moments",
  accumulation: "/accumulation",
  "market-health": "/market-health",
  "etf-flows": "/etf",
  "historical-price-paths": "/historical-price-paths",
  downside: "/historical-price-paths", // legacy alias — keeps old /r/downside short links working
  "price-paths": "/historical-price-paths",
  brief: "/brief",
  research: "/research",
  findings: "/research/findings",
  weekly: "/weekly",
  sentiment: "/sentiment",
  replay: "/replay",
  metrics: "/metrics",
  learn: "/learn",
  price: "/price",
  etf: "/etf",
  halving: "/halving",
  miners: "/miners",
  free: "/free",
  start: "/start",
};

// Reverse: destination path → friendly slug (first alias wins).
const PATH_TO_ALIAS: Record<string, string> = Object.fromEntries(
  Object.entries(CANONICAL_ALIASES).map(([slug, path]) => [path, slug]),
);

const ENCODED_PREFIX = "~"; // /r/~<base64url(path)> for arbitrary pages
const FINDING_SLUG_RE = /^hl-r\d{3,}$/i; // research findings, e.g. hl-r002
const FINDINGS_BASE = "/research/findings";

// Slugs the campaign system may never claim (they resolve to canonical pages).
export function isReservedSlug(slug: string): boolean {
  const s = slug.toLowerCase();
  return (
    s in CANONICAL_ALIASES ||
    FINDING_SLUG_RE.test(s) ||
    s.startsWith(ENCODED_PREFIX) ||
    s === "r" ||
    s.length < 2
  );
}

// Normalise a page path: drop query/hash, strip a trailing slash (keep root "/").
function normalisePath(path: string): string {
  let p = path.split(/[?#]/)[0] || "/";
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

// The canonical share slug for the page currently being viewed. Prefers a
// friendly alias, then a research-finding id, else a reversible path encoding —
// so the Share button always produces a stable link for the exact page.
export function shareSlugForPath(path: string): string {
  const p = normalisePath(path);
  if (PATH_TO_ALIAS[p]) return PATH_TO_ALIAS[p];
  if (p.startsWith(`${FINDINGS_BASE}/`)) {
    const slug = p.slice(FINDINGS_BASE.length + 1).split("/")[0];
    if (FINDING_SLUG_RE.test(slug)) return slug.toLowerCase();
  }
  return ENCODED_PREFIX + b64urlEncode(p);
}

// Resolve a share slug back to its destination path. Returns null if unknown
// (the redirect route falls back to home). Does NOT resolve campaign slugs —
// those are looked up in the database first, before this is called.
export function pathForCanonicalSlug(slug: string): string | null {
  const s = slug.toLowerCase();
  if (CANONICAL_ALIASES[s]) return CANONICAL_ALIASES[s];
  if (FINDING_SLUG_RE.test(s)) return `${FINDINGS_BASE}/${s}`;
  if (slug.startsWith(ENCODED_PREFIX)) {
    const decoded = b64urlDecode(slug.slice(ENCODED_PREFIX.length));
    // Only ever redirect to a same-site relative path (no open redirect).
    if (decoded && decoded.startsWith("/") && !decoded.startsWith("//")) return normalisePath(decoded);
    return null;
  }
  return null;
}

// The full branded short URL for a slug — what goes on the card / into the QR.
export function shortUrl(slug: string): string {
  return `${SITE_URL}/r/${slug}`;
}

// Convenience: the short URL for the page at `path`.
export function shortUrlForPath(path: string): string {
  return shortUrl(shareSlugForPath(path));
}

// A short, human label for a slug — used in share UI + analytics tables.
export function labelForSlug(slug: string): string {
  const s = slug.toLowerCase();
  if (s === "home") return "Homepage";
  if (FINDING_SLUG_RE.test(s)) return s.toUpperCase();
  if (s.startsWith(ENCODED_PREFIX)) {
    const p = pathForCanonicalSlug(slug);
    return p ?? "Page";
  }
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Share destinations (kept as data so new ones are trivial to add) ──────────
export type ShareMethod = "qr" | "copy" | "native" | "x" | "linkedin" | "email";

export function shareIntentUrl(method: "x" | "linkedin" | "email", url: string, title: string): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  switch (method) {
    case "x":
      return `https://twitter.com/intent/tweet?text=${t}&url=${u}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${u}`;
    case "email":
      return `mailto:?subject=${t}&body=${encodeURIComponent(`${title}\n\n${url}`)}`;
  }
}

// ── isomorphic base64url (browser + node) ─────────────────────────────────────
function b64urlEncode(s: string): string {
  const B = (globalThis as { Buffer?: { from(s: string, e: string): { toString(e: string): string } } }).Buffer;
  const b64 = B ? B.from(s, "utf8").toString("base64") : btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): string {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const B = (globalThis as { Buffer?: { from(s: string, e: string): { toString(e: string): string } } }).Buffer;
    return B ? B.from(b64, "base64").toString("utf8") : decodeURIComponent(escape(atob(b64)));
  } catch {
    return "";
  }
}
