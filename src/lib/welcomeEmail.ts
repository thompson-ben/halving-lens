// Immediate welcome email, sent the moment someone subscribes. Same dark + gold
// theme as the Daily Brief, so it doubles as proof the pipeline works and that
// our mail renders correctly in their client. Content is deliberately minimal:
// confirm the subscription, say when the first brief arrives, and help with
// deliverability. Historical context, not advice.

import { SITE_HOST, SITE_URL } from "./site";
import { type EmailTracking, NO_EMAIL_TRACKING, forHtmlAttr } from "./emailTracking";

const C = {
  bg: "#0a0c10",
  card: "#13161d",
  cardHi: "#171b24",
  border: "#23272f",
  goldBorder: "#4a3f23",
  ink: "#f4f1ea",
  sub: "#c2c6cf",
  dim: "#8c919c",
  faint: "#6b7079",
  gold: "#d9b96a",
  green: "#5fd0a0",
  hair: "#1d212a",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function welcomeEmailSubject(): string {
  return "Welcome to HalvingLens — your Cycle Brief is on the way";
}

export function welcomeEmailText(): string {
  return [
    "You're subscribed.",
    "",
    "Thanks for joining HalvingLens Research — this confirms your subscription is active and everything's working.",
    "",
    "When your first brief arrives:",
    "You'll get the Daily Cycle Brief each morning, around 8am UK time. Your first edition lands with the next morning's send.",
    "",
    "What's inside, every day:",
    "• A 30-second read",
    "• What changed today",
    "• Historical context",
    "• What to watch next",
    "• No hype, no predictions",
    "",
    `Tip: add brief@${SITE_HOST} to your contacts so the brief always reaches your inbox — and if you don't see it, check your spam or junk folder.`,
    "",
    `Read today's brief now: ${SITE_URL}/brief`,
    "",
    "Historical context, not a prediction. Educational analysis — not financial advice, no price targets.",
  ].join("\n");
}

export function welcomeEmailHtml(unsubUrl: string, tracking: EmailTracking = NO_EMAIL_TRACKING): string {
  const bullets = ["A 30-second read", "What changed today", "Historical context", "What to watch next", "No hype, no predictions"];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(welcomeEmailSubject())}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">You're subscribed — your first Daily Cycle Brief is on the way.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:30px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.bg};">

      <!-- Masthead -->
      <tr><td style="padding:8px 36px 24px;">
        <table role="presentation" width="100%"><tr>
          <td style="font:700 15px/1 ${SANS};letter-spacing:.26em;text-transform:uppercase;color:${C.ink};">
            <span style="color:${C.gold};">◆</span>&nbsp; HalvingLens Research
          </td>
          <td style="text-align:right;font:400 12px/1 ${SANS};color:${C.dim};">Welcome</td>
        </tr></table>
      </td></tr>

      <!-- Hero -->
      <tr><td style="padding:6px 36px 8px;">
        <div style="font:700 11px/1.4 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.gold};">Subscription confirmed</div>
        <div style="font:600 34px/1.15 ${SERIF};color:${C.ink};margin-top:12px;letter-spacing:-0.5px;">You're subscribed.</div>
        <div style="font:400 16px/1.6 ${SANS};color:${C.sub};margin-top:14px;">
          Thanks for joining HalvingLens Research. This email confirms your subscription is active — and that our mail
          lands cleanly in your client.
        </div>
      </td></tr>

      <!-- When it arrives -->
      <tr><td style="padding:22px 36px 6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.border};border-radius:14px;">
          <tr><td style="padding:22px 24px;">
            <div style="font:700 10.5px/1.4 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:${C.gold};">When your first brief arrives</div>
            <div style="font:400 15px/1.6 ${SANS};color:${C.sub};margin-top:10px;">
              You'll get the <span style="color:${C.ink};font-weight:600;">Daily Cycle Brief</span> each morning, around
              <span style="color:${C.ink};">8am UK time</span>. Your first edition lands with the next morning's send.
            </div>
          </td></tr>
        </table>
      </td></tr>

      <!-- What's inside -->
      <tr><td style="padding:20px 36px 6px;">
        <div style="font:700 10.5px/1.4 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:${C.dim};margin-bottom:10px;">What's inside, every day</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${bullets
            .map(
              (b) => `<tr><td style="padding:5px 0;font:400 14.5px/1.5 ${SANS};color:${C.sub};">
            <span style="color:${C.green};font-weight:700;">✓</span>&nbsp;&nbsp;${esc(b)}</td></tr>`,
            )
            .join("")}
        </table>
      </td></tr>

      <!-- Deliverability -->
      <tr><td style="padding:18px 36px 6px;">
        <div style="font:400 13px/1.6 ${SANS};color:${C.faint};border-left:2px solid ${C.goldBorder};padding-left:14px;">
          Tip: add <span style="color:${C.sub};">brief@${SITE_HOST}</span> to your contacts so the brief always reaches
          your inbox — and if you don't see it, check your spam or junk folder.
        </div>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:22px 36px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:10px;background:${C.gold};">
            <a href="${tracking.link(`${SITE_URL}/brief`, "welcome_read_brief")}" style="display:inline-block;padding:13px 26px;font:600 14px/1 ${SANS};color:#15120a;text-decoration:none;border-radius:10px;">Read today's brief →</a>
          </td>
        </tr></table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:24px 36px 30px;border-top:1px solid ${C.hair};">
        <div style="font:500 13px/1.5 ${SERIF};color:${C.sub};">The clearest view of the Bitcoin cycle.</div>
        <div style="font:400 11px/1.7 ${SANS};color:${C.faint};margin-top:12px;">
          Historical context, not a prediction. Educational analysis — not financial advice, no price targets.<br>
          You're receiving this because you just subscribed at ${SITE_HOST}.
          <a href="${forHtmlAttr(unsubUrl)}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
${tracking.openPixel}
</body></html>`;
}
