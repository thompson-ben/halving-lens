import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { actOnEvent, linkCreative } from "@/lib/intelligenceStore";
import type { IntelligenceEvent, EventStatus } from "@/lib/intelligenceEvents";

// Admin-only: founder actions from the Intelligence Queue (snooze / dismiss /
// mark-posted / mark-creative-generated). The full event is sent from the client
// so an action on a not-yet-persisted event still records it, then applies the
// status — keeping the historical intelligence database complete. Gated by the
// admin session cookie.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  action?: "snooze" | "dismiss" | "posted" | "new" | "creative";
  event?: IntelligenceEvent;
  socialPostId?: number | null;
}

const ACTION_STATUS: Record<string, EventStatus> = { snooze: "snoozed", dismiss: "dismissed", posted: "posted", new: "new" };

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const { action, event } = body;
  if (!action || !event?.dedupeKey) return NextResponse.json({ ok: false, error: "missing_action_or_event" }, { status: 400 });

  if (action === "creative") {
    const ok = await linkCreative(event.dedupeKey, { createdCreative: true, linkedSocialPost: body.socialPostId ?? null });
    return NextResponse.json({ ok });
  }

  const status = ACTION_STATUS[action];
  if (!status) return NextResponse.json({ ok: false, error: "unknown_action" }, { status: 400 });
  const ok = await actOnEvent(event, status);
  // "posted" also records that a creative exists for the event.
  if (ok && action === "posted") await linkCreative(event.dedupeKey, { createdCreative: true, linkedSocialPost: body.socialPostId ?? null });
  return NextResponse.json({ ok });
}
