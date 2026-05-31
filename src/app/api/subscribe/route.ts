import { NextResponse } from "next/server";

// Email capture for the Daily Brief waitlist. Validates server-side, then
// stores the signup in the first destination that's configured:
//
//   1. Supabase (preferred) — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
//      Inserts into a `brief_subscribers` table via the PostgREST REST API
//      (no SDK / dependency). Duplicate emails are treated as success.
//   2. SIGNUP_WEBHOOK_URL — any JSON POST sink (Zapier, Make, Sheet webhook…).
//   3. Logs — captured in serverless logs so a signup is never lost.
//
// No auth, no subscriptions, no new dependency.

export const runtime = "nodejs";

interface Body {
  email?: string;
  source?: string;
  consent?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function storeInSupabase(record: Record<string, unknown>): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return false;
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
    // 201 created, or 409 duplicate (unique email) — both mean "captured".
    if (res.ok || res.status === 409) return true;
    console.error(`[subscribe] supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return false;
  } catch (e) {
    console.error(`[subscribe] supabase failed: ${(e as Error).message}`);
    return false;
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
  const stored = (await storeInSupabase(record)) || (await storeInWebhook(record));
  if (!stored) console.log(`[subscribe] ${JSON.stringify(record)}`);

  return NextResponse.json({ ok: true });
}
