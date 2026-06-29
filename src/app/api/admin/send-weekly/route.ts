import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sendWeekly } from "@/lib/emailSend";

// Admin-only manual trigger for the weekly research send (testing / re-runs).
// Gated by the dashboard key/cookie. ?force=1 bypasses the Sunday + once-per-week
// guards.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
  const cookieKey = cookies().get("hl_admin")?.value;
  const urlKey = new URL(req.url).searchParams.get("key");
  if (!expected || (cookieKey !== expected && urlKey !== expected)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const force = new URL(req.url).searchParams.get("force") === "1";
  return NextResponse.json(await sendWeekly({ force }));
}
