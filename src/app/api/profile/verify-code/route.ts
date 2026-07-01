import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/profileOtp";
import { makeProfileToken, SESSION_TTL_MS } from "@/lib/profileToken";
import { upsertProfile, PROFILE_COOKIE } from "@/lib/profile";

// Sign in with the 6-digit code. On success, sets the signed session cookie and
// returns where to go next. Codes are hashed, expiring and rate-limited server-
// side (see profileOtp.ts).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeNext(n: unknown): string {
  return typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/profile/welcome";
}

const MESSAGES: Record<string, string> = {
  invalid: "That code isn't right. Check the email and try again.",
  expired: "That code has expired — request a new one.",
  locked: "Too many attempts. Request a new code.",
  error: "Something went wrong. Please try again.",
};

export async function POST(req: Request) {
  let body: { email?: string; code?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const code = (body.code ?? "").replace(/\D/g, "");
  if (!EMAIL_RE.test(email) || code.length !== 6) {
    return NextResponse.json({ ok: false, error: MESSAGES.invalid }, { status: 400 });
  }

  const result = await verifyOtp(email, code);
  if (result !== "ok") {
    return NextResponse.json({ ok: false, error: MESSAGES[result] ?? MESSAGES.error }, { status: 400 });
  }

  await upsertProfile(email);
  const next = safeNext(body.next);
  const res = NextResponse.json({ ok: true, next });
  res.cookies.set(PROFILE_COOKIE, makeProfileToken(email, SESSION_TTL_MS), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
