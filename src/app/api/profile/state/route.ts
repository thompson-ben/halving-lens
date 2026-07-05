import { NextResponse } from "next/server";
import { currentProfile, getProfileState, upsertProfile, type ProfileState } from "@/lib/profile";

// Read/write the signed-in profile's synced state (saved research, reading
// history, streak, badges). The client merges local + server and PUTs the union.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const p = currentProfile();
  if (!p) return NextResponse.json({ signedIn: false }, { status: 401 });
  const state = await getProfileState(p.email);
  return NextResponse.json({ signedIn: true, state });
}

export async function PUT(req: Request) {
  const p = currentProfile();
  if (!p) return NextResponse.json({ signedIn: false }, { status: 401 });
  let state: ProfileState;
  try {
    state = (await req.json()) as ProfileState;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  // Cap array sizes defensively before persisting.
  const trim = <T,>(a: T[] | undefined, n: number) => (Array.isArray(a) ? a.slice(0, n) : undefined);
  const incoming: Partial<ProfileState> = {
    saved: trim(state.saved, 200),
    recent: trim(state.recent, 200),
    streakDays: trim(state.streakDays, 400),
    badges: trim(state.badges, 100),
  };
  // Merge over existing state so server-owned fields the client doesn't send
  // (Hall opt-out, granted entitlements) survive a sync.
  const existing = await getProfileState(p.email);
  const clean: ProfileState = { ...existing, ...Object.fromEntries(Object.entries(incoming).filter(([, v]) => v !== undefined)) };
  const ok = await upsertProfile(p.email, clean);
  return NextResponse.json({ ok });
}
