import { NextResponse } from "next/server";
import { rateLimitAll, clientIp } from "@/lib/rateLimit";
import { normalizeEmail, isValidEmail } from "@/lib/subscribeCore";

// Pro early-access waitlist capture (CD2) — first-class Pro intent,
// deliberately SEPARATE from the Daily Brief subscription:
//
//   · stores into `pro_waitlist` (email primary key), never the Daily
//     Brief subscriber store — joining Pro early access subscribes no one
//     to anything else;
//   · no welcome email, no entitlement, no gating — demand validation only;
//   · idempotent: the email is the primary key, so a repeat submission is a
//     harmless confirmed "existing";
//   · success is returned ONLY on confirmed durable capture, matching the
//     subscription contract's discipline. The table is the authoritative
//     demand count.
//
// Table (one-time migration, run in Supabase):
//   create table if not exists pro_waitlist (
//     email      text primary key,
//     source     text not null,
//     created_at timestamptz not null default now()
//   );

export const runtime = "nodejs";

interface Body {
  email?: string;
  source?: string;
}

type StoreResult = "created" | "duplicate" | "unavailable";

async function storeInterest(record: Record<string, unknown>): Promise<StoreResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "unavailable";
  try {
    const res = await fetch(`${url}/rest/v1/pro_waitlist`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(record),
    });
    if (res.status === 409) return "duplicate"; // email already on the list
    if (res.ok) return "created";
    console.error(`[pro-waitlist] supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return "unavailable";
  } catch (e) {
    console.error(`[pro-waitlist] supabase failed: ${(e as Error).message}`);
    return "unavailable";
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, outcome: "invalid", error: "Invalid request." }, { status: 400 });
  }

  const source = typeof body.source === "string" ? body.source.slice(0, 120) : "unknown";
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, outcome: "invalid", error: "Please enter a valid email." }, { status: 400 });
  }

  const allowed = await rateLimitAll([
    { key: `prow:ip:${clientIp(req)}`, limit: 12, windowSec: 3600 },
    { key: `prow:email:${email}`, limit: 5, windowSec: 3600 },
  ]);
  if (!allowed) {
    return NextResponse.json({ ok: false, outcome: "rate_limited", error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  const stored = await storeInterest({ email, source, created_at: new Date().toISOString() });
  if (stored === "created") return NextResponse.json({ ok: true, outcome: "created" }, { status: 200 });
  if (stored === "duplicate") return NextResponse.json({ ok: true, outcome: "existing" }, { status: 200 });

  // Not durably captured — never presented as success.
  console.error(`[pro-waitlist] persist_failed ${JSON.stringify({ source, ts: new Date().toISOString() })}`);
  return NextResponse.json(
    { ok: false, outcome: "error", error: "Could not save your place just now. Please try again." },
    { status: 503 },
  );
}
