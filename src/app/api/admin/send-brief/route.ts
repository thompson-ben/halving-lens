import { NextResponse } from "next/server";
import { sendDailyBrief } from "@/lib/emailSend";
import { isAdmin } from "@/lib/adminAuth";

// Admin-only manual trigger for the daily brief send. Gated by the admin
// session cookie (log in at /admin first).
//   ?test=1[&to=you@x.com]  → send ONLY to you (the admin) — a real test email,
//                             no subscribers touched. Defaults to FOUNDER_EMAIL.
//   ?force=1                → re-send today's brief to ALL subscribers.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);

  // Test send — to the admin only.
  if (url.searchParams.get("test") === "1") {
    const to = (url.searchParams.get("to") || process.env.FOUNDER_EMAIL || "").trim().toLowerCase();
    if (!EMAIL_RE.test(to)) {
      return NextResponse.json({ ok: false, error: "no_test_recipient", reason: "set FOUNDER_EMAIL or pass ?to=" }, { status: 400 });
    }
    return NextResponse.json(await sendDailyBrief({ testTo: to }));
  }

  // Real send — to every active subscriber.
  const force = url.searchParams.get("force") === "1";
  return NextResponse.json(await sendDailyBrief({ force }));
}
