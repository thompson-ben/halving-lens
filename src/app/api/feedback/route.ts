import { NextResponse } from "next/server";
import { sbInsert } from "@/lib/supabase";

// Lightweight page feedback: 👍 / 👎 + optional text. No PII.
export const runtime = "nodejs";

interface Body {
  path?: string;
  helpful?: boolean;
  message?: string;
  sessionId?: string;
}

export async function POST(req: Request) {
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
    path: typeof body.path === "string" ? body.path.slice(0, 200) : null,
    helpful: body.helpful,
    message: typeof body.message === "string" ? body.message.slice(0, 1000) : null,
    session_id: typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null,
  });
  return NextResponse.json({ ok: true });
}
