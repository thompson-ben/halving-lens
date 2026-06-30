import { sbInsert } from "@/lib/supabase";
import { verifyUnsub } from "@/lib/emailToken";
import { emailHash } from "@/lib/emailTracking";

// Email open pixel. Records an `email_open` event (privacy-safe hashed
// subscriber + campaign) and returns a 1×1 transparent GIF. Always returns the
// pixel so a mail client never shows a broken image; only records on a valid
// token. Opens are "estimated" — image proxies / Apple MPP inflate them.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 1×1 transparent GIF.
const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

function pixel(): Response {
  return new Response(GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
    },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
    const token = url.searchParams.get("t") ?? "";
    const campaign = (url.searchParams.get("c") ?? "unknown").slice(0, 64);
    if (email && verifyUnsub(email, token)) {
      // Gmail's image proxy is a strong "estimated open" signal; flag it.
      const ua = req.headers.get("user-agent") ?? "";
      const proxied = /GoogleImageProxy|YahooMailProxy/i.test(ua);
      await sbInsert("events", {
        name: "email_open",
        path: null,
        props: { campaign, sub: emailHash(email), proxied },
        session_id: null,
        is_new: false,
      });
    }
  } catch {
    /* never fail an open pixel */
  }
  return pixel();
}
