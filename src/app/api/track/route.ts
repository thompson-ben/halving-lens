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
  "copy_instagram",
  "copy_linkedin",
  "copy_email",
  "share_image",
  "content_download_card",
  "content_download_zip",
  "feature_vote",
  "feedback",
]);

// Known bots, crawlers, link-preview scrapers, headless browsers and uptime
// monitors. On a new site these can dwarf real human traffic, so we drop their
// events server-side to keep the stats honest. The User-Agent is a request
// header used only for this check — it is never stored (no PII).
const BOT_UA =
  /bot|crawl|spider|slurp|mediapartners|adsbot|bingpreview|facebookexternalhit|facebot|embedly|quora|pinterest|redditbot|vkshare|whatsapp|telegram|discord|slack|twitter|linkedin|skype|google|yandex|baidu|duckduck|petalbot|applebot|headless|phantom|puppeteer|playwright|selenium|lighthouse|pagespeed|gtmetrix|pingdom|uptimerobot|statuscake|monitor|prerender|scrapy|curl|wget|python-requests|python-urllib|httpclient|axios|go-http|node-fetch|okhttp|java\/|libwww|dataprovider|semrush|ahrefs|mj12bot|dotbot/i;

// Internal / non-content paths that should never count as a viewer page view.
const SKIP_PATH = /^\/(admin|api|og)(\/|$)/;

// Real browsers always send a UA. An empty/missing UA on a beacon is almost
// always an automated client, so we drop it too.
function isBot(ua: string | null): boolean {
  if (!ua) return true;
  return BOT_UA.test(ua);
}

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

  await sbInsert("events", {
    name,
    path,
    props: body.props && typeof body.props === "object" ? body.props : {},
    session_id: typeof body.sessionId === "string" ? body.sessionId.slice(0, 64) : null,
    is_new: body.isNew === true,
  });

  return NextResponse.json({ ok: true });
}
