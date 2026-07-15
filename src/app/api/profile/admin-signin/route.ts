import { NextResponse } from "next/server";
import { makeProfileToken, SESSION_TTL_MS } from "@/lib/profileToken";
import { upsertProfile, PROFILE_COOKIE } from "@/lib/profile";
import { absoluteUrl } from "@/lib/site";
import { isAdmin } from "@/lib/adminAuth";

// Admin escape hatch: sign in to any Profile WITHOUT the email round-trip. Gated
// by the admin session cookie (log in at /admin first). Use when a corporate
// mail gateway quarantines the sign-in email, or for support/testing.
//
//   /api/profile/admin-signin?email=<addr>[&next=/dashboard]

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: Request) {
  if (!isAdmin()) {
    return new Response("Unauthorized", { status: 401 });
  }
  const url = new URL(req.url);
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return new Response("Provide a valid ?email=", { status: 400 });

  await upsertProfile(email);
  const next = url.searchParams.get("next");
  const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/profile/welcome";
  const res = NextResponse.redirect(absoluteUrl(dest), { status: 302 });
  res.cookies.set(PROFILE_COOKIE, makeProfileToken(email, SESSION_TTL_MS), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
