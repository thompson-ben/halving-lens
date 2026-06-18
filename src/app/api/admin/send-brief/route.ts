import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sendDailyBrief } from "@/lib/emailSend";

// Admin-only manual trigger for the daily brief send (testing / re-runs).
// Gated by the same key/cookie as the dashboards. Pass { force: true } to send
// again even if today's send is already logged.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authed(req: Request): boolean {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
  if (!expected) return false;
  const cookieKey = cookies().get("hl_admin")?.value;
  const urlKey = new URL(req.url).searchParams.get("key");
  return cookieKey === expected || urlKey === expected;
}

export async function POST(req: Request) {
  if (!authed(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const force = new URL(req.url).searchParams.get("force") === "1";
  const summary = await sendDailyBrief({ force });
  return NextResponse.json(summary);
}
