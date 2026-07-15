import { NextResponse } from "next/server";
import { sendFounderReport } from "@/lib/emailSend";
import { isAdmin } from "@/lib/adminAuth";

// Admin-only manual trigger for the founder intelligence report. ?force=1
// bypasses the Monday + once-per-week guards.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const force = new URL(req.url).searchParams.get("force") === "1";
  return NextResponse.json(await sendFounderReport({ force }));
}
