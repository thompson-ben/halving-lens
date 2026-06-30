import { NextResponse } from "next/server";
import { currentProfile } from "@/lib/profile";

// Lightweight identity check for the client (useProfile).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const p = currentProfile();
  if (!p) return NextResponse.json({ signedIn: false });
  return NextResponse.json({ signedIn: true, email: p.email, referralCode: p.referralCode });
}
