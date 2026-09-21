import { NextResponse } from "next/server";
import { rateLimitAll, clientIp } from "@/lib/rateLimit";
import { normalizeEmail, isValidEmail } from "@/lib/subscribeCore";
import { PRO_SOURCE_DASHBOARD, PRO_SOURCE_BRIEF_FOOTER, PRO_SOURCE_OFFER_PAGE } from "@/lib/proWaitlist";
import { proConfirmationsEnabled, sendProWaitlistEmail } from "@/lib/proWaitlistEmails";

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
// Schema: supabase/pro_waitlist.sql (the repository-owned source of truth,
// following the house one-file-per-table convention — apply once in the
// Supabase SQL editor). GET /api/pro-waitlist/health verifies the table is
// live; until it is, this route can only ever return the retryable error —
// never a false success.

export const runtime = "nodejs";

interface Body {
  email?: string;
  source?: string;
}

// Durable attribution stays trustworthy: only sources this product actually
// renders may be recorded. Anything else — junk, probes, stale clients —
// lands as "unknown" rather than polluting the demand dataset.
const KNOWN_SOURCES = new Set([PRO_SOURCE_DASHBOARD, PRO_SOURCE_BRIEF_FOOTER, PRO_SOURCE_OFFER_PAGE]);

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

  const source = typeof body.source === "string" && KNOWN_SOURCES.has(body.source) ? body.source : "unknown";
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
  if (stored === "created") {
    // Founder feedback flow (20 Sep 2026): confirm the FIRST successful join
    // by email, with the founder's one open question. Capture-first stays the
    // contract — the join above is already durable, and a failed/unconfigured
    // confirmation send never changes the response. Duplicate submissions
    // ("existing" below) never reach this, and the pro_waitlist_emails claim
    // makes the send at-most-once even across retries. Confirmations run only
    // behind the explicit PRO_CONFIRMATION_EMAILS enable flag (paused by
    // default — founder hold, 21 Sep); the capture above is never affected.
    if (proConfirmationsEnabled()) {
      try {
        const r = await sendProWaitlistEmail(email, "confirmation");
        if (r.outcome !== "sent") {
          console.error(`[pro-waitlist] confirmation not sent: ${r.outcome}${r.error ? ` (${r.error})` : ""}`);
        }
      } catch (e) {
        console.error(`[pro-waitlist] confirmation email failed: ${(e as Error).message}`);
      }
    } else {
      console.log("[pro-waitlist] confirmation skipped — PRO_CONFIRMATION_EMAILS not enabled (paused)");
    }
    return NextResponse.json({ ok: true, outcome: "created" }, { status: 200 });
  }
  if (stored === "duplicate") return NextResponse.json({ ok: true, outcome: "existing" }, { status: 200 });

  // Not durably captured — never presented as success.
  console.error(`[pro-waitlist] persist_failed ${JSON.stringify({ source, ts: new Date().toISOString() })}`);
  return NextResponse.json(
    { ok: false, outcome: "error", error: "Could not save your place just now. Please try again." },
    { status: 503 },
  );
}
