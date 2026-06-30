import { NextResponse } from "next/server";
import { sendEmail, resendConfigured } from "@/lib/resend";
import { welcomeEmailHtml, welcomeEmailText, welcomeEmailSubject } from "@/lib/welcomeEmail";
import { unsubToken } from "@/lib/emailToken";
import { emailTracking } from "@/lib/emailTracking";
import { absoluteUrl } from "@/lib/site";

// Email capture for the Daily Brief. Validates server-side, then stores the
// signup in the first destination that's configured:
//
//   1. Supabase (preferred) — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
//      Inserts into a `brief_subscribers` table via the PostgREST REST API
//      (no SDK / dependency). Duplicate emails are treated as success.
//   2. SIGNUP_WEBHOOK_URL — any JSON POST sink (Zapier, Make, Sheet webhook…).
//   3. Logs — captured in serverless logs so a signup is never lost.
//
// On a genuinely NEW Supabase signup we also send an immediate welcome email
// (same theme as the Daily Brief) — best-effort, never blocking the response.
//
// No auth, no new dependency.

export const runtime = "nodejs";

interface Body {
  email?: string;
  source?: string;
  consent?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type StoreResult = "created" | "duplicate" | "unavailable";

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
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });
  }

  const record = {
    email,
    source: typeof body.source === "string" ? body.source.slice(0, 120) : "unknown",
    consent: body.consent === true,
    signup_at: new Date().toISOString(),
  };

  // Try destinations in order; always succeed for the user (log as last resort).
  const supa = await storeInSupabase(record);
  let stored = supa === "created" || supa === "duplicate";
  if (!stored) stored = await storeInWebhook(record);
  if (!stored) console.log(`[subscribe] ${JSON.stringify(record)}`);

  // Welcome only a confirmed-new subscriber, so resubmits don't re-send. Awaited
  // (so it actually fires before the serverless function freezes) but guarded, so
  // a mail failure never breaks the signup.
  if (supa === "created") await sendWelcome(email);

  return NextResponse.json({ ok: true });
}
