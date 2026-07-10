import { NextResponse } from "next/server";
import { sbInsert } from "@/lib/supabase";
import { verifyUnsub } from "@/lib/emailToken";
import { emailHash } from "@/lib/emailTracking";
import { SITE_URL, SITE_HOST, absoluteUrl } from "@/lib/site";

// Email click redirect. Records an `email_click` event (hashed subscriber +
// campaign + CTA label) and 302-redirects to the target. Clicks are "confirmed"
// engagement. Open-redirect safe: only same-host targets are honoured; anything
// else falls back to the site root.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same-host is derived from the configured site URL (not only the hardcoded
// constant), so it stays correct if NEXT_PUBLIC_SITE_URL changes (e.g. apex vs
// www) — otherwise a host mismatch would bounce every internal CTA to the root.
const SAME_HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return SITE_HOST;
  }
})();

// Trusted EXTERNAL destinations the tracker is allowed to redirect to — e.g. the
// YouTube channel CTA. Everything else off-site still falls back to the site root,
// so this stays open-redirect safe. The configured YouTube host is included
// automatically so the CTA works whatever channel URL is set.
const EXTERNAL_ALLOW = (() => {
  const hosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
  try {
    if (process.env.LIFECYCLE_YOUTUBE_URL) hosts.add(new URL(process.env.LIFECYCLE_YOUTUBE_URL).host);
  } catch {
    /* ignore a malformed override */
  }
  return hosts;
})();

function safeTarget(raw: string | null): string {
  if (!raw) return SITE_URL;
  try {
    const u = new URL(raw, SITE_URL);
    if (u.protocol !== "https:" && u.protocol !== "http:") return SITE_URL;
    // Honour same-site links and an allowlist of trusted external hosts; anything
    // else off-site falls back to the site root (open-redirect safe).
    if (u.host === SAME_HOST || u.host === SITE_HOST || EXTERNAL_ALLOW.has(u.host)) return u.toString();
    return SITE_URL;
  } catch {
    return SITE_URL;
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = safeTarget(url.searchParams.get("u"));
  try {
    const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
    const token = url.searchParams.get("t") ?? "";
    const campaign = (url.searchParams.get("c") ?? "unknown").slice(0, 64);
    const cta = (url.searchParams.get("cta") ?? "link").slice(0, 64);
    if (email && verifyUnsub(email, token)) {
      await sbInsert("events", {
        name: "email_click",
        path: null,
        props: { campaign, sub: emailHash(email), cta },
        session_id: null,
        is_new: false,
      });
    }
  } catch {
    /* never block the redirect on a logging failure */
  }
  return NextResponse.redirect(target || absoluteUrl("/"), { status: 302 });
}
