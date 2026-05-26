import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { autoShortlistRun, type AutoShortlistResult } from "@/lib/autoShortlist";

export const dynamic = "force-dynamic";

// POST without a body runs the auto-shortlist pass using the current
// settings. POST with { dryRun: true } returns what would happen without
// committing the status changes — used by the Settings UI to preview the
// threshold's behaviour before turning it on.
export async function POST(req: Request) {
  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dryRun === true;
  } catch {
    /* empty body is fine */
  }

  const settings = await loadSettings();
  const result = await autoShortlistRun({ settings, dryRun });
  return NextResponse.json(result satisfies AutoShortlistResult);
}

async function loadSettings() {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["auto_shortlist_enabled", "auto_shortlist_threshold"] } },
  });
  const out = new Map(rows.map((r) => [r.key, r.value]));
  return {
    enabled: Boolean(out.get("auto_shortlist_enabled") ?? false),
    threshold: Number(out.get("auto_shortlist_threshold") ?? 75),
  };
}
