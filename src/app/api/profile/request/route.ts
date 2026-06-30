import { NextResponse } from "next/server";
import { sendEmail, resendConfigured } from "@/lib/resend";
import { makeProfileToken, MAGIC_TTL_MS } from "@/lib/profileToken";
import { profileEmailHtml, profileEmailText, profileEmailSubject } from "@/lib/profileEmail";
import { absoluteUrl } from "@/lib/site";

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
  if (!resendConfigured) return NextResponse.json({ ok: true, sent: false });

  const token = makeProfileToken(email, MAGIC_TTL_MS);
  const next = safeNext(body.next);
  const link = absoluteUrl(`/api/profile/verify?token=${encodeURIComponent(token)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  try {
    await sendEmail({ to: email, subject: profileEmailSubject(), html: profileEmailHtml(link), text: profileEmailText(link) });
  } catch {
    /* best-effort; never reveal failure detail */
  }
  return NextResponse.json({ ok: true, sent: true });
}
