import { NextResponse } from "next/server";
import { sbInsert } from "@/lib/supabase";
import { isBot } from "@/lib/botCheck";

// Lightweight, section-level feedback: 👍 / 👎 + optional text. No PII — only an
// anonymous session/visitor id and a coarse device class.
export const runtime = "nodejs";

const DEVICE = new Set(["mobile", "tablet", "desktop"]);
const str = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim() ? v.slice(0, max) : null;

interface Body {
  path?: string;
  section?: string;
  contentType?: string;
  helpful?: boolean;
  message?: string;
  sessionId?: string;
  visitorId?: string;
  deviceType?: string;
}

export async function POST(req: Request) {
  if (isBot(req.headers.get("user-agent"))) {
    return NextResponse.json({ ok: true, skipped: "bot" });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof body.helpful !== "boolean") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await sbInsert("feedback", {
    path: str(body.path, 200),
    section: str(body.section, 80),
    content_type: str(body.contentType, 40),
    helpful: body.helpful,
    message: str(body.message, 250),
    session_id: str(body.sessionId, 64),
    visitor_id: str(body.visitorId, 64),
    device_type: DEVICE.has(body.deviceType as string) ? body.deviceType : null,
  });
  return NextResponse.json({ ok: true });
}
