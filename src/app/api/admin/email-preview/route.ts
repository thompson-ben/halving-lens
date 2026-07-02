import { cookies } from "next/headers";
import { dailyEmailHtml } from "@/lib/emailBrief";
import { welcomeEmailHtml } from "@/lib/welcomeEmail";
import { showcaseEmailHtml } from "@/lib/showcaseEmail";

// Admin-only live preview of the outbound emails (the exact HTML that would be
// sent). Gated by the dashboard key/cookie. ?email=daily|welcome|showcase.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
  const cookieKey = cookies().get("hl_admin")?.value;
  const url = new URL(req.url);
  const urlKey = url.searchParams.get("key");
  if (!expected || (cookieKey !== expected && urlKey !== expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const unsub = "https://halvinglens.com/api/unsubscribe?e=preview%40example.com&t=preview";
  const which = url.searchParams.get("email") ?? "daily";
  const html =
    which === "welcome" ? welcomeEmailHtml(unsub) : which === "showcase" ? showcaseEmailHtml(unsub) : dailyEmailHtml(unsub);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
