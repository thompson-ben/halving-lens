import { NextResponse } from "next/server";
import { scrubBriefProp } from "@/lib/briefFunnel";
import { sbInsert } from "@/lib/supabase";
import { isBot } from "@/lib/botCheck";
import { currentProfile } from "@/lib/profile";
import { isTrackedEvent } from "@/lib/analyticsEvents";

// First-party, privacy-friendly event collection. No cookies, no PII — just an
// anonymous per-session id (random, client-generated). Fails open: if Supabase
// isn't configured, returns ok without storing (so the UI never breaks).
//
// Accepted event names derive from the shared taxonomy in
// src/lib/analyticsEvents — the same module the client tracker is typed
// against — so the two sides cannot drift (PR136). Unknown names still 400.

export const runtime = "nodejs";

// Internal / non-content paths that should never count as a viewer page view.
const SKIP_PATH = /^\/(admin|api|og)(\/|$)/;

interface Body {
  name?: string;
  path?: string;
  props?: Record<string, unknown>;
  sessionId?: string;
  isNew?: boolean;
}

export async function POST(req: Request) {
  // Drop automated traffic before it ever reaches the store. Fail-open (200) so
  // the client never sees an error or retries.
  if (isBot(req.headers.get("user-agent"))) {
    return NextResponse.json({ ok: true, skipped: "bot" });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const name = (body.name ?? "").slice(0, 40);
  if (!isTrackedEvent(name)) return NextResponse.json({ ok: false }, { status: 400 });

  const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;
  if (path && SKIP_PATH.test(path)) {
    return NextResponse.json({ ok: true, skipped: "internal" });
  }

  const props: Record<string, unknown> = body.props && typeof body.props === "object" ? { ...body.props } : {};

  // PR2 — a `brief` prop must be a valid non-personal Daily Brief campaign
  // marker; anything malformed/forged is scrubbed (the event survives, the
  // marker does not).
  scrubBriefProp(props);

  // WEAS instrumentation: when the request carries a valid member session cookie,
  // stamp the recognised subscriber's privacy-safe hash (same emailHash the email
  // events use) onto the event, so on-site engagement becomes attributable to a
  // subscriber for the Weekly Engaged Active Subscribers North Star. Server-side
  // (the token is httpOnly), aggregate-safe, and FAIL-OPEN — a recognition error
  // must never drop the event or break tracking. `props.sub` is never overwritten
  // if the client already set it (e.g. email-link events).
  if (props.sub == null) {
    try {
      const sub = currentProfile()?.hash;
      if (sub) props.sub = sub;
    } catch {
      /* recognition is best-effort — analytics must never break */
    }
  }

  await sbInsert("events", {
    name,
    path,
    props,
    session_id: typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null,
    is_new: body.isNew === true,
  });

  return NextResponse.json({ ok: true });
}
