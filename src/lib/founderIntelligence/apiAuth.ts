// Authorization for the read-only Founder Intelligence API. Two credentials are
// accepted, both fail-closed:
//
//   1. Bearer token — `Authorization: Bearer <INTELLIGENCE_API_KEY>`. This is the
//      path for machine consumers (the ChatGPT / MCP connector). The key is NEVER
//      read from a query string (it would leak into logs, history and Referer);
//      only the Authorization header. If no key is configured, the bearer path is
//      unavailable rather than open.
//   2. Admin session — the founder's signed, expiring `hl_admin` cookie also
//      grants access, so the endpoint is browsable while signed into the
//      dashboards. (Resolved by the caller via isAdmin(); passed in here so this
//      module stays pure and unit-testable.)
//
// The endpoint is GET-only and aggregate-only; this module only decides *whether*
// a request may read, never what it may write (it can't write anything).

import { timingSafeEqual } from "crypto";

export type IntelligencePrincipal = "bearer" | "admin";

export interface AuthResult {
  ok: boolean;
  principal: IntelligencePrincipal | null;
  reason: string | null; // machine-readable failure reason (never echoes the key)
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

// Pure authorization decision. The admin cookie short-circuits; otherwise a
// well-formed Bearer token must constant-time match a CONFIGURED api key.
export function authorizeIntelligence(opts: {
  authorization: string | null;
  apiKey: string | undefined | null;
  isAdminSession: boolean;
}): AuthResult {
  if (opts.isAdminSession) return { ok: true, principal: "admin", reason: null };

  const header = (opts.authorization ?? "").trim();
  if (!header) return { ok: false, principal: null, reason: "missing_credentials" };

  const m = /^Bearer\s+(.+)$/i.exec(header);
  if (!m) return { ok: false, principal: null, reason: "malformed_authorization" };

  const key = (opts.apiKey ?? "").trim();
  if (!key) return { ok: false, principal: null, reason: "api_key_not_configured" }; // fail-closed

  if (!safeEq(m[1].trim(), key)) return { ok: false, principal: null, reason: "invalid_token" };
  return { ok: true, principal: "bearer", reason: null };
}
