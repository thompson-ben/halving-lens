import { NextResponse } from "next/server";

// Real email capture for the Daily Brief waitlist. Validates server-side and
// forwards the signup to a storage destination configured by env var — no DB,
// no new dependency, no auth. Set ONE of:
//   SIGNUP_WEBHOOK_URL  — any endpoint that accepts a JSON POST (Zapier,
//                         Make, Google Apps Script, Formspree, a Sheet webhook…)
//   SIGNUP_FORWARD_EMAIL — informational only; surfaced in logs.
// If neither is set, the signup is logged (captured in serverless logs) and the
// user still gets a success state — we validate demand without losing entries.

export const runtime = "nodejs";

interface Body {
  email?: string;
  source?: string;
  consent?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    signupAt: new Date().toISOString(),
  };

  const webhook = process.env.SIGNUP_WEBHOOK_URL;
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      if (!res.ok) {
        console.error(`[subscribe] webhook ${res.status}`);
        // Still log the record so it isn't lost.
        console.log(`[subscribe] ${JSON.stringify(record)}`);
      }
    } catch (e) {
      console.error(`[subscribe] webhook failed: ${(e as Error).message}`);
      console.log(`[subscribe] ${JSON.stringify(record)}`);
    }
  } else {
    // No destination configured yet — capture in logs so nothing is lost.
    console.log(`[subscribe] ${JSON.stringify(record)}`);
  }

  return NextResponse.json({ ok: true });
}
