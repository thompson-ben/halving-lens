import { founderReport } from "@/lib/founderReport";
import { founderReportHtml } from "@/lib/founderReportEmail";
import { isAdmin } from "@/lib/adminAuth";

// Admin-only live preview / web view of the founder intelligence report.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAdmin()) {
    return new Response("Unauthorized", { status: 401 });
  }
  const report = await founderReport();
  return new Response(founderReportHtml(report), { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
