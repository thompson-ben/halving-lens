import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { sendIntelligenceBriefing } from "@/lib/intelligenceEmail";

// Admin-only manual trigger for the daily Founder Intelligence Briefing. Also
// the entrypoint the daily cron script calls. Sends only when publishable
// events exist (never an empty email).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isAdmin()) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await sendIntelligenceBriefing());
}
