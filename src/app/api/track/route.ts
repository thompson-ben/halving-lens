import { NextResponse } from "next/server";
import { sbInsert } from "@/lib/supabase";

// First-party, privacy-friendly event collection. No cookies, no PII — just an
// anonymous per-session id (random, client-generated). Fails open: if Supabase
// isn't configured, returns ok without storing (so the UI never breaks).

export const runtime = "nodejs";

const ALLOWED = new Set([
  "page_view",
  "section_view",
  "section_click",
  "cta_click",
  "signup",
  "copy_post",
  "copy_thread",
  "copy_linkedin",
  "share_image",
  "feature_vote",
  "feedback",
]);

interface Body {
  name?: string;
  path?: string;
  props?: Record<string, unknown>;
  sessionId?: string;
  isNew?: boolean;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const name = (body.name ?? "").slice(0, 40);
  if (!ALLOWED.has(name)) return NextResponse.json({ ok: false }, { status: 400 });

  await sbInsert("events", {
    name,
    path: typeof body.path === "string" ? body.path.slice(0, 200) : null,
    props: body.props && typeof body.props === "object" ? body.props : {},
    session_id: typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null,
    is_new: body.isNew === true,
  });

  return NextResponse.json({ ok: true });
}
