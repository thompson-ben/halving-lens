import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel Cron → redeploy trigger.
//
// The Vercel build runs `npm run sync && npm run build` (see vercel.json), so a
// fresh deployment re-fetches live price/sentiment and updates the site's
// "last updated" time. Pinging a Vercel Deploy Hook on a schedule therefore
// refreshes the data on Vercel's reliable cron — independent of GitHub Actions'
// best-effort scheduling, which routinely delays or skips runs.
//
// Setup (one-time, in the Vercel project):
//   1. Settings → Git → Deploy Hooks → create a hook on `main`; copy its URL.
//   2. Settings → Environment Variables:
//        VERCEL_DEPLOY_HOOK_URL = <the hook URL>
//        CRON_SECRET            = <a long random string>
//   Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on cron
//   invocations once CRON_SECRET is set, which we verify below.
//
// Note: sub-daily cron schedules require a Vercel Pro plan (Hobby allows one
// cron run per day).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) {
    return NextResponse.json({ ok: false, error: "VERCEL_DEPLOY_HOOK_URL not configured" }, { status: 503 });
  }

  try {
    const res = await fetch(hook, { method: "POST" });
    return NextResponse.json(
      { ok: res.ok, deployHookStatus: res.status, triggeredAt: new Date().toISOString() },
      { status: res.ok ? 200 : 502 },
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
