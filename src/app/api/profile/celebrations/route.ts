import { NextResponse } from "next/server";
import { currentProfile, getProfileState, upsertProfile } from "@/lib/profile";

// Toggle the signed-in member's milestone-celebration preference. Read-modify-
// write so other state fields are preserved. Default is on (celebrationsOff unset).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = currentProfile();
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  let enabled = true;
  try {
    enabled = ((await req.json()) as { enabled?: boolean }).enabled !== false;
  } catch {
    /* default enabled=true */
  }
  const state = await getProfileState(p.email);
  const ok = await upsertProfile(p.email, { ...state, celebrationsOff: !enabled });
  return NextResponse.json({ ok, enabled });
}
