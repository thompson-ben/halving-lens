import { createHmac, timingSafeEqual } from "crypto";

// Stateless unsubscribe tokens: an HMAC of the (lowercased) email, so we never
// have to store a per-subscriber token. Anyone with the link can unsubscribe
// that address only — which is exactly the intent of a one-click unsubscribe.
const SECRET =
  process.env.EMAIL_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.ANALYTICS_DASHBOARD_KEY ||
  "halvinglens-dev-secret";

export function unsubToken(email: string): string {
  return createHmac("sha256", SECRET).update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
}

export function verifyUnsub(email: string, token: string): boolean {
  const expected = unsubToken(email);
  if (token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}
