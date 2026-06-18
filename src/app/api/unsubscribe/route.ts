import { verifyUnsub } from "@/lib/emailToken";
import { unsubscribeEmail } from "@/lib/emailSend";
import { SITE_HOST } from "@/lib/site";

// One-click unsubscribe from the daily brief. GET so it works straight from an
// email link (and the List-Unsubscribe header). Verifies the HMAC token, marks
// the subscriber unsubscribed, and returns a small confirmation page.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(title: string, body: string): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#0a0e14;color:#e7edf4;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;">
<div style="max-width:480px;margin:14vh auto;padding:32px;text-align:center;">
  <div style="color:#5eead4;font-weight:700;font-size:18px;margin-bottom:18px;">● ${SITE_HOST}</div>
  <h1 style="font-size:22px;margin:0 0 10px;">${title}</h1>
  <p style="color:#9aa6b4;margin:0 0 22px;">${body}</p>
  <a href="https://${SITE_HOST}" style="color:#5eead4;text-decoration:none;">Back to ${SITE_HOST} →</a>
</div></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = (url.searchParams.get("e") ?? "").trim().toLowerCase();
  const token = url.searchParams.get("t") ?? "";

  if (!email || !token || !verifyUnsub(email, token)) {
    return page("Invalid unsubscribe link", "This link is invalid or has expired. If you keep receiving emails, just reply and we'll remove you.");
  }

  await unsubscribeEmail(email);
  return page("You're unsubscribed", "You won't receive the daily Bitcoin Cycle Brief any more. You can re-subscribe any time from the site.");
}
