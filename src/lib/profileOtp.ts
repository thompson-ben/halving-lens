import { createHmac, timingSafeEqual } from "crypto";
import { sbSelect, sbUpsert, sbUpdate } from "./supabase";

// One-time sign-in codes for the HalvingLens Profile. Only a hash is stored;
// codes expire (15 min) and lock after too many attempts. This is the
// gateway-safe alternative to the magic link (no scannable URL).

const SECRET =
  process.env.EMAIL_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.ANALYTICS_DASHBOARD_KEY ||
  "halvinglens-dev-secret";

const TTL_MIN = 15;
const MAX_ATTEMPTS = 6;

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits, no leading zero
}

function codeHash(email: string, code: string): string {
  return createHmac("sha256", SECRET).update(`${email.trim().toLowerCase()}|${code.trim()}`).digest("hex");
}

function hashEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function storeOtp(email: string, code: string): Promise<boolean> {
  return sbUpsert(
    "profile_otps",
    {
      email: email.trim().toLowerCase(),
      code_hash: codeHash(email, code),
      expires_at: new Date(Date.now() + TTL_MIN * 60_000).toISOString(),
      attempts: 0,
    },
    "email",
  );
}

export type OtpResult = "ok" | "invalid" | "expired" | "locked" | "error";

export async function verifyOtp(email: string, code: string): Promise<OtpResult> {
  const e = email.trim().toLowerCase();
  const filter = `email=eq.${encodeURIComponent(e)}`;
  const rows = await sbSelect<{ code_hash: string; expires_at: string; attempts: number }[]>(
    `profile_otps?select=code_hash,expires_at,attempts&${filter}&limit=1`,
  );
  if (rows == null) return "error";
  const row = rows[0];
  if (!row) return "invalid";
  if (Date.parse(row.expires_at) < Date.now()) return "expired";
  if (row.attempts >= MAX_ATTEMPTS) return "locked";
  if (!hashEq(row.code_hash, codeHash(e, code))) {
    await sbUpdate("profile_otps", filter, { attempts: row.attempts + 1 });
    return "invalid";
  }
  // Success — single-use: expire it so the same code can't be replayed.
  await sbUpdate("profile_otps", filter, { expires_at: new Date(0).toISOString(), attempts: MAX_ATTEMPTS });
  return "ok";
}
