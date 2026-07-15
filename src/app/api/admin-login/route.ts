import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, ADMIN_TTL_SEC, makeAdminToken } from "@/lib/adminAuth";
import { rateLimit, clientIp } from "@/lib/rateLimit";

// Sets a session cookie for the admin dashboards when the password matches
// ANALYTICS_DASHBOARD_KEY. The cookie value is a SIGNED, EXPIRING token — never
// the raw key (see adminAuth). Brute-force attempts are throttled per-IP.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tight lockout: 8 attempts per 10 minutes per IP. The key is high-entropy, so
// this makes online guessing hopeless without ever inconveniencing the founder.
const MAX_ATTEMPTS = 8;
const WINDOW_SEC = 10 * 60;

export async function POST(req: Request) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;

  const ip = clientIp(req);
  const { allowed } = await rateLimit(`admin_login:${ip}`, MAX_ATTEMPTS, WINDOW_SEC);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, { status: 429 });
  }

  let key = "";
  try {
    const body = (await req.json()) as { key?: string };
    key = (body.key ?? "").trim();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!expected || key !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  cookies().set(ADMIN_COOKIE, makeAdminToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_TTL_SEC,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  cookies().delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
