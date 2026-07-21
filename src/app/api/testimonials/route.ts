import { NextResponse } from "next/server";
import { rateLimitAll, clientIp } from "@/lib/rateLimit";
import { verifyUnsub } from "@/lib/emailToken";
import { emailHash } from "@/lib/emailTracking";
import { cleanTestimonial, submitTestimonial, type TestimonialInput } from "@/lib/testimonials";

// POST /api/testimonials — a reader submits a testimonial. Always stored as
// PENDING (never published without admin approval). Rate-limited. If the request
// carries a valid signed email token (from the Day-14 email link), the
// submission is attributed to that subscriber via a salted HASH — the raw email
// is never stored.
export const runtime = "nodejs";

interface Body extends TestimonialInput {
  email?: string;
  token?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const clean = cleanTestimonial(body);
  if (!clean.ok || !clean.value) {
    return NextResponse.json({ ok: false, error: clean.error ?? "Invalid submission." }, { status: 400 });
  }

  const ip = clientIp(req);
  const allowed = await rateLimitAll([
    { key: `tst:ip:${ip}`, limit: 5, windowSec: 3600 },
    { key: `tst:day:${ip}`, limit: 20, windowSec: 86400 },
  ]);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  // Optional attribution from the signed email link — hashed, never raw.
  let sub: string | null = null;
  let source = "site";
  const email = (body.email ?? "").trim().toLowerCase();
  const token = body.token ?? "";
  if (email && token && verifyUnsub(email, token)) {
    sub = emailHash(email);
    source = "day14_email";
  }

  const ok = await submitTestimonial(clean.value, { sub, source });
  if (!ok) return NextResponse.json({ ok: false, error: "Couldn’t save your testimonial. Please try again." }, { status: 503 });

  return NextResponse.json({ ok: true });
}
