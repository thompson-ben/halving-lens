import { NextResponse } from "next/server";
import { readProfileToken, makeProfileToken, SESSION_TTL_MS } from "@/lib/profileToken";
import { upsertProfile, PROFILE_COOKIE } from "@/lib/profile";
import { absoluteUrl } from "@/lib/site";

// Completes magic-link sign-in: validates the token, ensures the profile row
// exists, sets the signed session cookie, and redirects into the product.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeNext(n: string | null): string {
  return n && n.startsWith("/") && !n.startsWith("//") ? n : "/profile/welcome";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = readProfileToken(url.searchParams.get("token"));
  if (!email) {
    return NextResponse.redirect(absoluteUrl("/profile?error=expired"), { status: 302 });
  }
  await upsertProfile(email);
  const session = makeProfileToken(email, SESSION_TTL_MS);
  const res = NextResponse.redirect(absoluteUrl(safeNext(url.searchParams.get("next"))), { status: 302 });
  res.cookies.set(PROFILE_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
