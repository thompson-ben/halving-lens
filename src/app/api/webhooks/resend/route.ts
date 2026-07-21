import { NextResponse } from "next/server";
import { verifySvixSignature, parseResendEvent } from "@/lib/resendWebhook";
import { recordEmailEvent } from "@/lib/emailEvents";

// POST /api/webhooks/resend — inbound Resend (Svix-signed) delivery events.
//
// This endpoint is DELIVERY-SAFE and ISOLATED by design: it only WRITES to the
// analytics sink (email_events) and is imported by nothing on the send path, so
// email delivery can never depend on it. It is signature-verified (rejects
// forgeries) and idempotent (Resend's at-least-once retries upsert the same row).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Raw body is required for signature verification — read it as text, once.
  const body = await req.text();

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Not configured: acknowledge so Resend doesn't retry-storm, but store nothing.
    return NextResponse.json({ ok: true, ignored: "not_configured" });
  }

  const verify = verifySvixSignature({
    id: req.headers.get("svix-id") ?? "",
    timestamp: req.headers.get("svix-timestamp") ?? "",
    signature: req.headers.get("svix-signature") ?? "",
    body,
    secret,
  });
  if (!verify.ok) {
    return NextResponse.json({ ok: false, error: "invalid_signature", reason: verify.reason }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const evt = parseResendEvent(payload, req.headers.get("svix-id") ?? "");
  if (!evt) return NextResponse.json({ ok: true, ignored: "unhandled_type" });

  // A store failure must NOT become a webhook error (which would trigger endless
  // provider retries and could mask delivery health). Acknowledge either way.
  const stored = await recordEmailEvent(evt).catch(() => false);
  return NextResponse.json({ ok: true, stored });
}
