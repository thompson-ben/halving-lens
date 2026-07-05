import { NextResponse } from "next/server";
import { currentProfile, getProfileState, upsertProfile } from "@/lib/profile";
import { YOUTUBE_LIVE } from "@/lib/lifecycleConfig";

// Record the signed-in member's self-attested YouTube subscription (honour
// system — YouTube exposes no signal we can verify). Read-modify-write so other
// state fields are preserved. No-op unless the channel is live.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = currentProfile();
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  if (!YOUTUBE_LIVE) return NextResponse.json({ ok: false, error: "not_live" }, { status: 400 });

  let subscribed = true;
  try {
    subscribed = ((await req.json()) as { subscribed?: boolean }).subscribed !== false;
  } catch {
    /* default subscribed=true */
  }

  const state = await getProfileState(p.email);
  const ok = await upsertProfile(p.email, { ...state, youtubeSubscribed: subscribed });
  return NextResponse.json({ ok, youtubeSubscribed: subscribed });
}
