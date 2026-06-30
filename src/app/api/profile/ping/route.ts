import { NextResponse } from "next/server";
import { sbInsert } from "@/lib/supabase";
import { currentProfile } from "@/lib/profile";

// Records a `profile_visit` for a signed-in profile, tagged with the same hash
// used by email-engagement events. This links email identity ↔ web identity, so
// WAES becomes the EXACT "opened an email AND visited" count (not click-bridged).

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const p = currentProfile();
  if (!p) return NextResponse.json({ ok: true, skipped: true });
  try {
    await sbInsert("events", { name: "profile_visit", path: null, props: { sub: p.hash }, session_id: null, is_new: false });
  } catch {
    /* never block on logging */
  }
  return NextResponse.json({ ok: true });
}
