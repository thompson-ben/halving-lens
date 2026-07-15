import { NextResponse } from "next/server";
import { sbDelete } from "@/lib/supabase";
import { isAdmin } from "@/lib/adminAuth";

// Admin-only: clears the analytics `events` table (page views, sessions, section
// interactions) so the dashboard can start from a clean, real-traffic baseline.
// Does NOT touch subscribers, feedback, feature votes or any warehouse tables.
// Gated by the admin session cookie.
export const runtime = "nodejs";

export async function POST() {
  if (!isAdmin()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  // id is a bigint identity (starts at 1), so id=gte.0 matches every row.
  const ok = await sbDelete("events", "id=gte.0");
  return NextResponse.json({ ok });
}
