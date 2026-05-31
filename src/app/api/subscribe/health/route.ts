import { NextResponse } from "next/server";

// Health check for the subscribe pipeline. Reports whether Supabase is
// configured and reachable WITHOUT exposing any secret. Safe to call from a
// browser: GET /api/subscribe/health
//   - configured: are the env vars set?
//   - ok: did a minimal authorized read against the table succeed?
// Never returns the key or any subscriber data (uses HEAD + count, limit 0).

export const runtime = "nodejs";

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const webhook = !!process.env.SIGNUP_WEBHOOK_URL;

  if (!url || !key) {
    return NextResponse.json({
      configured: false,
      supabase: false,
      webhook,
      destination: webhook ? "webhook" : "logs",
      hint: "Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in Vercel, then redeploy.",
    });
  }

  // Minimal authorized request: count rows, return none.
  try {
    const res = await fetch(`${url}/rest/v1/brief_subscribers?select=id&limit=0`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact",
      },
    });
    const range = res.headers.get("content-range"); // e.g. "0-0/12" or "*/12"
    const count = range && range.includes("/") ? range.split("/")[1] : null;
    if (res.ok) {
      return NextResponse.json({
        configured: true,
        supabase: true,
        destination: "supabase",
        table: "brief_subscribers",
        subscriberCount: count != null && count !== "*" ? Number(count) : null,
      });
    }
    return NextResponse.json(
      {
        configured: true,
        supabase: false,
        status: res.status,
        hint:
          res.status === 404
            ? "Table not found — run supabase/brief_subscribers.sql in the SQL editor."
            : res.status === 401
              ? "Unauthorized — check the service_role / secret key value."
              : "Supabase rejected the request; see Vercel function logs.",
      },
      { status: 200 },
    );
  } catch (e) {
    return NextResponse.json(
      { configured: true, supabase: false, error: (e as Error).message },
      { status: 200 },
    );
  }
}
