import { NextResponse } from "next/server";
import { sendEmail, resendConfigured } from "@/lib/resend";
import { makeProfileToken, MAGIC_TTL_MS } from "@/lib/profileToken";
import { generateCode, storeOtp } from "@/lib/profileOtp";
import { profileEmailHtml, profileEmailText, profileEmailSubject } from "@/lib/profileEmail";
import { absoluteUrl } from "@/lib/site";
import { rateLimitAll, clientIp } from "@/lib/rateLimit";

// Request a magic sign-in link for a HalvingLens Profile. Always returns ok
// (never reveals whether an address exists). Sends a one-hour, single-use link.

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeNext(n: unknown): string {
  return typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "";
}

export async function POST(req: Request) {
  let body: { email?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "Please enter a valid email." }, { status: 400 });

  // Throttle before sending: each request fires a sign-in email, so cap per-IP
  // and per-email to stop email-bombing a victim / running up send cost.
  const ok = await rateLimitAll([
    { key: `otp:ip:${clientIp(req)}`, limit: 8, windowSec: 900 },
    { key: `otp:email:${email}`, limit: 4, windowSec: 900 },
  ]);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  if (!resendConfigured) return NextResponse.json({ ok: true, sent: false });

  const token = makeProfileToken(email, MAGIC_TTL_MS);
  const next = safeNext(body.next);
  const link = absoluteUrl(`/api/profile/verify?token=${encodeURIComponent(token)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);

  // A 6-digit code (gateway-safe) alongside the magic link.
  const code = generateCode();
  await storeOtp(email, code);

  // sendEmail never throws (returns {ok,error}); log failures server-side so they
  // are diagnosable, but never reveal detail to the caller.
  const res = await sendEmail({
    to: email,
    subject: profileEmailSubject(),
    html: profileEmailHtml(link, code),
    text: profileEmailText(link, code),
  });
  if (!res.ok) console.error(`[profile/request] send failed: ${res.error ?? "unknown"}`);
  return NextResponse.json({ ok: true, sent: res.ok });
}
