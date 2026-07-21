import { NextResponse } from "next/server";
import { sbInsert } from "@/lib/supabase";
import { isBot } from "@/lib/botCheck";
import { currentProfile } from "@/lib/profile";

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
  "copy_instagram",
  "copy_linkedin",
  "copy_email",
  "share_image",
  "content_download_card",
  "content_download_zip",
  "content_share_card",
  "content_share_all",
  "feature_vote",
  "feedback",
  // Engagement + Accumulation-specific (growth sprint)
  "engagement",
  "copy_summary",
  "dca_change",
  "timeline_range",
  // Morning Research Library
  "research_view",
  "research_search",
  "research_filter",
  "research_share",
  // Research Findings (library + finding pages + share kit)
  "findings_search",
  "findings_filter",
  "findings_sort",
  "copy_x",
  "copy_carousel",
  "copy_link",
  "copy_citation",
  // Personalised dashboard
  "dashboard_view",
  "favourite_toggle",
  // Profile (magic-link identity)
  "profile_request",
  "profile_signin",
  // Weekly Research + /start landing
  "weekly_view",
  "weekly_share",
  "landing_view",
  "landing_cta",
  // Universal share system (button + modal + QR)
  "share_open", // Share modal opened on a page
  "share", // a share action fired (method in props: copy|native|x|linkedin|email|qr)
  "qr_view", // branded QR shown for a page/campaign
  "campaign_create", // founder created a share campaign
]);

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
  if (!ALLOWED.has(name)) return NextResponse.json({ ok: false }, { status: 400 });

  const path = typeof body.path === "string" ? body.path.slice(0, 200) : null;
  if (path && SKIP_PATH.test(path)) {
    return NextResponse.json({ ok: true, skipped: "internal" });
  }

  const props: Record<string, unknown> = body.props && typeof body.props === "object" ? { ...body.props } : {};

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
