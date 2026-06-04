import { NextResponse } from "next/server";
import { SOURCE } from "@/lib/btcData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Data-freshness health check. `fetchedAt` is baked at build time (the Vercel
// build runs `npm run sync`), so its age is the time since the last successful
// deploy/refresh. Returns HTTP 503 once the data is stale, so an external uptime
// monitor (UptimeRobot, cron-job.org, Better Stack…) can alert automatically.
//
// Threshold covers a missed 6-hourly refresh slot plus buffer.
const STALE_AFTER_MIN = 9 * 60;

export async function GET() {
  const fetchedAt = SOURCE.fetchedAt;
  const ageMinutes = fetchedAt
    ? Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60000)
    : null;
  const stale = ageMinutes == null || ageMinutes > STALE_AFTER_MIN;

  return NextResponse.json(
    {
      ok: !stale,
      stale,
      fetchedAt,
      ageMinutes,
      staleAfterMinutes: STALE_AFTER_MIN,
      mode: SOURCE.mode,
      now: new Date().toISOString(),
    },
    { status: stale ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
