import { NextResponse } from "next/server";

// Health check for the Pro waitlist pipeline. Reports whether Supabase is
// configured AND the pro_waitlist table (supabase/pro_waitlist.sql) is
// actually live, without exposing any secret or row data. Safe to call from
// a browser: GET /api/pro-waitlist/health — the deployment verification that
// the capture form has a real table behind it. (Until it does, the POST
// route can only return its retryable error — never a false success.)

export const runtime = "nodejs";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({
      configured: false,
      table: false,
      hint: "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy.",
    });
  }

  // Minimal authorized requests: count rows, return none. Also verifies the
  // send-log table behind the confirmation/feedback emails
  // (supabase/pro_waitlist_emails.sql) — the deployment gate for the founder
  // feedback flow.
  try {
    const res = await fetch(`${url}/rest/v1/pro_waitlist?select=id&limit=0`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact" },
    });
    const range = res.headers.get("content-range");
    const count = range && range.includes("/") ? range.split("/")[1] : null;
    const logRes = await fetch(`${url}/rest/v1/pro_waitlist_emails?select=id&limit=0`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    }).catch(() => null);
    const emailLog = logRes?.ok === true;
    if (res.ok) {
      return NextResponse.json({
        configured: true,
        table: true,
        emailLog,
        waitlistCount: count ? Number(count) : 0,
        ...(emailLog ? {} : { hint: "Apply supabase/pro_waitlist_emails.sql to enable the confirmation/feedback emails." }),
      });
    }
    return NextResponse.json({
      configured: true,
      table: false,
      emailLog,
      status: res.status,
      hint: "Apply supabase/pro_waitlist.sql in the Supabase SQL editor.",
    });
  } catch {
    return NextResponse.json({ configured: true, table: false, emailLog: false, hint: "Supabase unreachable." });
  }
}
