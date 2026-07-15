import { weeklyEmailHtml } from "@/lib/weeklyEmail";
import { latestWeekly } from "@/lib/weekly";
import { isAdmin } from "@/lib/adminAuth";

// Admin-only live preview of the weekly research email.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdmin()) {
    return new Response("Unauthorized", { status: 401 });
  }
  const w = latestWeekly();
  if (!w) return new Response("No weekly report yet.", { status: 404 });
  const html = weeklyEmailHtml(w, "https://halvinglens.com/api/unsubscribe?e=preview%40example.com&t=preview");
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
