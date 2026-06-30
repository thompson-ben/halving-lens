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

function safeTarget(raw: string | null): string {
  if (!raw) return SITE_URL;
  try {
    const u = new URL(raw, SITE_URL);
    if (u.protocol !== "https:" && u.protocol !== "http:") return SITE_URL;
    if (u.host !== SITE_HOST) return SITE_URL; // never redirect off-site
    return u.toString();
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
