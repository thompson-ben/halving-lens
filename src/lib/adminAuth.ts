import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { signingSecret } from "./signingSecret";

// Central admin authentication for HalvingLens dashboards + admin APIs.
//
// The founder authenticates once (POST /api/admin-login with the dashboard key),
// which sets an httpOnly `hl_admin` cookie. Two hardening changes over the old
// scheme:
//
//   1. The cookie holds a SIGNED, EXPIRING token — not the raw dashboard key.
//      A stolen cookie can't be replayed past its expiry, and the key itself
//      never sits at rest in a cookie value.
//   2. Auth is COOKIE-ONLY. We no longer accept the key in a `?key=` query
//      param anywhere (it leaked into server logs, browser history and the
//      Referer header). Callers rely on the httpOnly cookie, which is sent
//      automatically on same-origin navigations and fetches.
//
// The token is domain-separated ("admin:") from the profile tokens so the two
// contexts can never be confused even though they share the app signing secret.
// The secret is resolved fail-closed (see signingSecret): a missing prod secret
// makes every token fail to verify — the admin is locked out rather than
// authenticated with a guessable key.

export const ADMIN_COOKIE = "hl_admin";
export const ADMIN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const ADMIN_TTL_SEC = Math.floor(ADMIN_TTL_MS / 1000);

// True when the dashboard key is configured at all. Pages use this to show the
// "set ANALYTICS_DASHBOARD_KEY" hint instead of a login form.
export function adminConfigured(): boolean {
  return !!process.env.ANALYTICS_DASHBOARD_KEY;
}

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(`admin:${payload}`).digest("base64url");
}

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// A signed admin session token that expires `ADMIN_TTL_MS` from now.
export function makeAdminToken(): string {
  const exp = String(Date.now() + ADMIN_TTL_MS);
  return `${exp}.${sign(exp)}`;
}

// Verify a signed admin token: well-formed, correctly signed, unexpired. If the
// signing secret is misconfigured (throws in prod), the token is treated as
// invalid — fail-closed, so a missing secret locks admin out rather than
// admitting a forged token.
export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token || !token.includes(".")) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  let expected: string;
  try {
    expected = sign(exp);
  } catch {
    return false;
  }
  if (!safeEq(sig, expected)) return false;
  return Number(exp) > Date.now();
}

// The single admin gate used by every dashboard page and admin API route.
// Reads the httpOnly cookie (works in both server components and route
// handlers). No query-param fallback by design.
export function isAdmin(): boolean {
  return verifyAdminToken(cookies().get(ADMIN_COOKIE)?.value);
}
