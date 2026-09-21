import { NextResponse } from "next/server";
import { proConfirmationsEnabled, proReplyTo } from "@/lib/proWaitlistEmails";

// Health check for the Pro waitlist pipeline. Reports whether Supabase is
// configured AND the pro_waitlist table (supabase/pro_waitlist.sql) is
// actually live, without exposing any secret or row data. Safe to call from
// a browser: GET /api/pro-waitlist/health — the deployment verification that
// the capture form has a real table behind it. (Until it does, the POST
// route can only return its retryable error — never a false success.)

export const runtime = "nodejs";
// A health check must NEVER be a build-time snapshot: without this, Next
// statically evaluates the GET at deploy time and the response freezes —
// schema changes made after the deploy (e.g. applying a table's SQL) then
// never show up until the next build. Live on every request, always.
export const dynamic = "force-dynamic";

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
      cache: "no-store",
    });
    const range = res.headers.get("content-range");
    const count = range && range.includes("/") ? range.split("/")[1] : null;
    const logRes = await fetch(`${url}/rest/v1/pro_waitlist_emails?select=id&limit=0`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    }).catch(() => null);
    const emailLog = logRes?.ok === true;
    // Diagnostics on a FAILING probe only: the HTTP status and PostgREST
    // error code (e.g. PGRST205 = table not in the API schema cache) —
    // never credentials, addresses or row data. Full message goes to the
    // server log only.
    let emailLogStatus: number | null = null;
    let emailLogCode: string | null = null;
    if (!emailLog && logRes != null) {
      emailLogStatus = logRes.status;
      const body = (await logRes.json().catch(() => ({}))) as { code?: string; message?: string };
      emailLogCode = typeof body.code === "string" ? body.code.slice(0, 24) : null;
      console.error(`[pro-waitlist-health] email-log probe failed: http ${logRes.status} code=${body.code ?? "?"} message=${(body.message ?? "").slice(0, 200)}`);
    }
    if (res.ok) {
      return NextResponse.json({
        configured: true,
        table: true,
        emailLog,
        // Booleans only — never the addresses. Confirms the runtime env
        // actually picked up the public Reply-To and the enable flag.
        publicReplyTo: proReplyTo() != null,
        confirmationsEnabled: proConfirmationsEnabled(),
        waitlistCount: count ? Number(count) : 0,
        ...(emailLog
          ? {}
          : {
              emailLogStatus,
              emailLogCode,
              hint: "Apply supabase/pro_waitlist_emails.sql to enable the confirmation/feedback emails.",
            }),
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
