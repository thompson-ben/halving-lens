import { NextResponse } from "next/server";
import { sbInsert } from "@/lib/supabase";

// "What should we build next?" feature votes. No PII.
export const runtime = "nodejs";

const FEATURES = new Set([
  "alerts",
  "daily_emails",
  "etf_tracking",
  "more_cycle_comparisons",
  "portfolio_tracking",
  "other",
]);

interface Body {
  feature?: string;
  sessionId?: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const feature = (body.feature ?? "").slice(0, 40);
  if (!FEATURES.has(feature)) return NextResponse.json({ ok: false }, { status: 400 });

  await sbInsert("feature_votes", {
    feature,
    session_id: typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null,
  });
  return NextResponse.json({ ok: true });
}
