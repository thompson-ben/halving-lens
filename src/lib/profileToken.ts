import { createHmac, timingSafeEqual } from "crypto";
import { signingSecret } from "./signingSecret";

// Stateless, signed identity tokens for the HalvingLens Profile (magic-link).
// A token carries the email + an expiry, signed with HMAC — no server session
// store needed. The same format is used for the short-lived magic link (≈1h)
// and the long-lived session cookie (≈1y). Tampering or expiry → rejected.
//
// The secret is resolved fail-closed (see signingSecret): in production a
// missing secret throws rather than falling back to a known dev literal, so
// tokens can never be forged with a guessable key.

export const MAGIC_TTL_MS = 60 * 60 * 1000; // 1 hour
export const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

function sign(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// Build a token for an email that expires `ttlMs` from now.
export function makeProfileToken(email: string, ttlMs: number): string {
  const payload = `${email.trim().toLowerCase()}|${Date.now() + ttlMs}`;
  const b = Buffer.from(payload).toString("base64url");
  return `${b}.${sign(payload)}`;
}

// Return the email iff the token is well-formed, correctly signed and unexpired.
export function readProfileToken(token: string | undefined | null): string | null {
  if (!token || !token.includes(".")) return null;
  const [b, sig] = token.split(".");
  let payload: string;
  try {
    payload = Buffer.from(b, "base64url").toString();
  } catch {
    return null;
  }
  const [email, expStr] = payload.split("|");
  if (!email || !expStr) return null;
  // If the secret is misconfigured (signingSecret throws in prod), treat the
  // token as invalid — the visitor is simply logged out, rather than every page
  // 500-ing. Issuing a token (makeProfileToken) still throws loudly.
  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }
  if (!safeEq(sig, expected)) return null;
  if (!Number(expStr) || Number(expStr) < Date.now()) return null;
  return email;
}
