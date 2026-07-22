import { NextResponse } from "next/server";
import { subscriberStats } from "@/lib/analytics";
import { roundedReaders, SOCIAL_PROOF_MIN_DEFAULT } from "@/lib/socialProof";

// Live-ish social-proof count for the client SocialProof component. Decoupled
// from page rendering (the landing pages are static, so a server-rendered count
// would be frozen at build). Reads the REAL active-subscriber count, rounds DOWN,
// and gates on SOCIAL_PROOF_MIN — returns { readers: null } when below the
// threshold or unknown, so the UI shows nothing. CDN-cached (10 min) so it never
// hammers the database. Named neutrally (not "social"/"proof") so privacy
// blockers don't false-positive and drop the in-page fetch. Debug: /api/readers
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const min = Number(process.env.SOCIAL_PROOF_MIN) || SOCIAL_PROOF_MIN_DEFAULT;
  const stats = await subscriberStats();
  const readers = roundedReaders(stats.active, min);
  return NextResponse.json(
    { readers },
    { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } },
  );
}
