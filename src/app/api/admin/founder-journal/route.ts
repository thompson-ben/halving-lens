import { NextResponse } from "next/server";
import { addJournalEntry, captureMonthlySnapshot, monthKey, type JournalEntry, type SnapshotMetrics } from "@/lib/companyHistory";
import { isAdmin } from "@/lib/adminAuth";

// Admin-only: record a Founder Reflection journal entry for a month, and/or log
// manual metrics that have no automatic source yet (e.g. social followers,
// social posts, content packs). Metrics merge into that month's snapshot, so
// they also flow into "Since Launch" and future year-over-year comparisons.
//
//   POST { entry: { proud, surprised, lesson, differently, focus }, month?, metrics? }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { entry?: JournalEntry; month?: string; metrics?: SnapshotMetrics } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const month = (body.month && /^\d{4}-\d{2}$/.test(body.month)) ? body.month : monthKey(Date.now());
  const results: Record<string, boolean> = {};

  if (body.entry && Object.values(body.entry).some((v) => v && String(v).trim())) {
    results.journal = await addJournalEntry(month, body.entry);
  }
  if (body.metrics && typeof body.metrics === "object") {
    // Keep only finite numbers.
    const clean: SnapshotMetrics = {};
    for (const [k, v] of Object.entries(body.metrics)) if (Number.isFinite(v)) clean[k] = Number(v);
    if (Object.keys(clean).length) results.metrics = await captureMonthlySnapshot(clean);
  }

  return NextResponse.json({ ok: true, month, ...results });
}
