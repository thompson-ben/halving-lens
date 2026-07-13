// Best-effort, FAIL-OPEN rate limiter backed by a single Supabase table
// (rate_limits — see supabase/rate_limits.sql). If Supabase isn't configured or
// any call errors, the request is allowed: the limiter can never take the site
// down, it only ever *reduces* abuse. It is approximate under high concurrency
// (read-modify-write, no atomic lock), which is fine for throttling email/DB
// abuse on public endpoints — the goal is to stop floods, not to be exact.

import { sbSelect, sbUpsert, supabaseConfigured } from "./supabase";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

// Allow up to `limit` hits per `windowSec` for `key`. Windows are fixed and
// reset lazily the first time a request arrives after the window has elapsed.
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  if (!supabaseConfigured) return { allowed: true, remaining: limit };
  try {
    const rows = await sbSelect<{ count: number; window_start: string }[]>(
      `rate_limits?select=count,window_start&key=eq.${encodeURIComponent(key)}&limit=1`,
    );
    const now = Date.now();
    const windowMs = windowSec * 1000;
    const row = rows?.[0];

    // No row yet, or the window has elapsed → start a fresh window.
    if (!row || now - Date.parse(row.window_start) >= windowMs) {
      await sbUpsert("rate_limits", { key, count: 1, window_start: new Date(now).toISOString() }, "key");
      return { allowed: true, remaining: limit - 1 };
    }
    if (row.count >= limit) return { allowed: false, remaining: 0 };
    await sbUpsert("rate_limits", { key, count: row.count + 1, window_start: row.window_start }, "key");
    return { allowed: true, remaining: limit - row.count - 1 };
  } catch {
    return { allowed: true, remaining: limit }; // fail open — never block on limiter error
  }
}

// Convenience: check several limiters together; blocked if ANY is over its cap.
export async function rateLimitAll(
  limiters: { key: string; limit: number; windowSec: number }[],
): Promise<boolean> {
  const results = await Promise.all(limiters.map((l) => rateLimit(l.key, l.limit, l.windowSec)));
  return results.every((r) => r.allowed);
}

// Best-effort client IP from proxy headers (Vercel/Cloudflare set x-forwarded-for).
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
