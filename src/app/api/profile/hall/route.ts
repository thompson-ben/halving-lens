import { NextResponse } from "next/server";
import { currentProfile, getProfileState, upsertProfile } from "@/lib/profile";

// Toggle the signed-in member's visibility in the public Hall of Founders.
// Read-modify-write so other state fields are preserved.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = currentProfile();
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  let hide = true;
  try {
    hide = ((await req.json()) as { hide?: boolean }).hide !== false;
  } catch {
    /* default hide=true */
  }
  const state = await getProfileState(p.email);
  const ok = await upsertProfile(p.email, { ...state, hideFromHall: hide });
  return NextResponse.json({ ok, hideFromHall: hide });
}
