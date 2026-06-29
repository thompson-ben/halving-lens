import { cookies } from "next/headers";
import { weeklyEmailHtml } from "@/lib/weeklyEmail";
import { latestWeekly } from "@/lib/weekly";

// Admin-only live preview of the weekly research email.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
  const cookieKey = cookies().get("hl_admin")?.value;
  const urlKey = new URL(req.url).searchParams.get("key");
  if (!expected || (cookieKey !== expected && urlKey !== expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const w = latestWeekly();
  if (!w) return new Response("No weekly report yet.", { status: 404 });
  const html = weeklyEmailHtml(w, "https://halvinglens.com/api/unsubscribe?e=preview%40example.com&t=preview");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
