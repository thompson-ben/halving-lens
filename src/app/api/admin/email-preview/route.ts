import { cookies } from "next/headers";
import { dailyEmailHtml } from "@/lib/emailBrief";

// Admin-only live preview of today's daily brief email (the exact HTML that
// would be sent). Gated by the dashboard key/cookie.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
  const cookieKey = cookies().get("hl_admin")?.value;
  const urlKey = new URL(req.url).searchParams.get("key");
  if (!expected || (cookieKey !== expected && urlKey !== expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const html = dailyEmailHtml("https://halvinglens.com/api/unsubscribe?e=preview%40example.com&t=preview");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
