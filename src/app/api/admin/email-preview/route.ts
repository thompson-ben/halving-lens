import { cookies } from "next/headers";
import { dailyEmailHtml } from "@/lib/emailBrief";
import { welcomeEmailHtml } from "@/lib/welcomeEmail";
import { showcaseEmailHtml } from "@/lib/showcaseEmail";
import { previewLifecycleStep, LIFECYCLE_STEPS } from "@/lib/lifecycleEmails";
import { roundupGeneral, roundupEmailHtml } from "@/lib/weeklyRoundup";

// Admin-only live preview of the outbound emails (the exact HTML that would be
// sent). Gated by the dashboard key/cookie.
//   ?email=daily | welcome | showcase
//   ?email=lifecycle&step=tour   (onboarding sequence; omit step to list them)
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

  if (which === "lifecycle") {
    const step = url.searchParams.get("step");
    if (!step) {
      const list = LIFECYCLE_STEPS.map((s) => `<li><a href="?email=lifecycle&step=${s.id}">${s.id}</a> — day ${s.dayOffset} — ${s.subject}</li>`).join("");
      return new Response(`<ul style="font-family:sans-serif">${list}</ul>`, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    const preview = previewLifecycleStep(step);
    if (!preview) return new Response("Unknown lifecycle step", { status: 404 });
    return new Response(preview.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  if (which === "roundup") {
    const general = await roundupGeneral();
    const personal = { streak: 12, longest: 41, referrals: 5, leaderboardPosition: 3, achievements: 6 };
    return new Response(roundupEmailHtml(unsub, general, personal), { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  const html =
    which === "welcome" ? welcomeEmailHtml(unsub) : which === "showcase" ? showcaseEmailHtml(unsub) : dailyEmailHtml(unsub);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
