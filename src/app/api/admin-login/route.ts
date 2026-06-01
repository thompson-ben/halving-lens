import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Sets a session cookie for the metrics dashboard when the password matches
// ANALYTICS_DASHBOARD_KEY. The cookie value is the key itself (httpOnly), so the
// page can verify it server-side without exposing the key to the client.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
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

  cookies().set("hl_admin", expected, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  cookies().delete("hl_admin");
  return NextResponse.json({ ok: true });
}
