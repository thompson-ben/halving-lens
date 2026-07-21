import { NextResponse } from "next/server";
import { sendEmail, resendConfigured } from "@/lib/resend";
import { welcomeEmailHtml, welcomeEmailText, welcomeEmailSubject } from "@/lib/welcomeEmail";
import { unsubToken } from "@/lib/emailToken";
import { emailTracking, emailHash } from "@/lib/emailTracking";
import { absoluteUrl } from "@/lib/site";
import { rateLimitAll, clientIp } from "@/lib/rateLimit";
import { normalizeEmail, isValidEmail, resolveOutcome, type StoreResult } from "@/lib/subscribeCore";

// Email capture for the Daily Brief. Validates server-side, then attempts to
// DURABLY store the signup:
//
//   1. Supabase (preferred) — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
//      Inserts into `brief_subscribers` via PostgREST. 409 = already subscribed.
//   2. SIGNUP_WEBHOOK_URL — an approved durable JSON sink (Zapier/Make/Sheet).
//
// The response is a DISCRIMINATED outcome — created | existing | invalid |
// rate_limited | error — and a success is only returned when the subscriber was
// durably captured. If neither store captures it, we return a retryable 503 and
// log diagnostics (a log line is NOT a durable capture and never reads as
// success). A confirmed-new Supabase subscriber also gets an immediate welcome
// email (best-effort, non-blocking).
//
// No auth, no new dependency.

export const runtime = "nodejs";

interface Body {
  email?: string;
  source?: string;
  consent?: boolean;
}

async function storeInSupabase(record: Record<string, unknown>): Promise<StoreResult> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "unavailable";
  try {
    const res = await fetch(`${url}/rest/v1/brief_subscribers`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(record),
    });
    if (res.status === 409) return "duplicate"; // unique email already present
    if (res.ok) return "created";
    console.error(`[subscribe] supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return "unavailable";
  } catch (e) {
    console.error(`[subscribe] supabase failed: ${(e as Error).message}`);
    return "unavailable";
  }
}

// Immediate, on-theme welcome email. Best-effort: any failure is logged, never
// surfaced to the subscriber (their signup already succeeded).
async function sendWelcome(email: string): Promise<void> {
  if (!resendConfigured) return;
  try {
    const unsubUrl = absoluteUrl(`/api/unsubscribe?e=${encodeURIComponent(email)}&t=${unsubToken(email)}`);
    await sendEmail({
      to: email,
      subject: welcomeEmailSubject(),
      html: welcomeEmailHtml(unsubUrl, emailTracking(email, "welcome")),
      text: welcomeEmailText(),
      headers: {
        "List-Unsubscribe": `<${unsubUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } catch (e) {
    console.error(`[subscribe] welcome email failed: ${(e as Error).message}`);
  }
}

async function storeInWebhook(record: Record<string, unknown>): Promise<boolean> {
  const webhook = process.env.SIGNUP_WEBHOOK_URL;
  if (!webhook) return false;
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (res.ok) return true;
    console.error(`[subscribe] webhook ${res.status}`);
    return false;
  } catch (e) {
    console.error(`[subscribe] webhook failed: ${(e as Error).message}`);
    return false;
  }
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, outcome: "invalid", error: "Invalid request." }, { status: 400 });
  }

  const placement = typeof body.source === "string" ? body.source.slice(0, 120) : "unknown";
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) {
    return NextResponse.json({ ok: false, outcome: "invalid", error: "Please enter a valid email." }, { status: 400 });
  }

  // A new signup can trigger a welcome email, so throttle per-IP and per-email
  // to prevent signup spam / using the endpoint to email-bomb an address.
  const allowed = await rateLimitAll([
    { key: `sub:ip:${clientIp(req)}`, limit: 12, windowSec: 3600 },
    { key: `sub:email:${email}`, limit: 3, windowSec: 3600 },
  ]);
  if (!allowed) {
    return NextResponse.json({ ok: false, outcome: "rate_limited", error: "Too many attempts. Please try again shortly." }, { status: 429 });
  }

  const record = {
    email,
    source: placement,
    consent: body.consent === true,
    signup_at: new Date().toISOString(),
  };

  // Attempt durable capture: Supabase first, then an approved webhook fallback.
  const supa: StoreResult = await storeInSupabase(record);
  const webhookConfigured = !!process.env.SIGNUP_WEBHOOK_URL;
  let webhookOk = false;
  if (supa === "unavailable" && webhookConfigured) webhookOk = await storeInWebhook(record);

  const resolved = resolveOutcome(supa, webhookConfigured, webhookOk);

  // Structured diagnostics (never the raw email — a redacted hash only). We log
  // on a persistence failure so an operator can see failed attempts by placement
  // without exposing PII.
  if (resolved.outcome === "error") {
    console.error(
      `[subscribe] persist_failed ${JSON.stringify({
        ts: record.signup_at,
        placement,
        outcome: resolved.outcome,
        supabase: supa,
        webhookConfigured,
        webhookOk,
        sub: emailHash(email),
      })}`,
    );
  }

  // Welcome only a confirmed-new Supabase subscriber, so resubmits / existing
  // subscribers don't re-trigger it. Awaited (so it fires before the function
  // freezes) but guarded — a mail failure never changes the stored outcome.
  if (resolved.sendWelcome) await sendWelcome(email);

  return NextResponse.json({ ok: resolved.ok, outcome: resolved.outcome }, { status: resolved.status });
}
