import { cookies } from "next/headers";
import { founderReport } from "@/lib/founderReport";
import { founderReportHtml } from "@/lib/founderReportEmail";

// Admin-only live preview / web view of the founder intelligence report.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = process.env.ANALYTICS_DASHBOARD_KEY;
  const cookieKey = cookies().get("hl_admin")?.value;
  const urlKey = new URL(req.url).searchParams.get("key");
  if (!expected || (cookieKey !== expected && urlKey !== expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const report = await founderReport();
  return new Response(founderReportHtml(report), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
