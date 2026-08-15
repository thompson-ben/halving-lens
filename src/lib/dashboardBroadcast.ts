// CDOE — the one-off Cycle Dashboard introduction for the ESTABLISHED
// subscriber base.
//
// Why this exists: the onboarding drip's 30-day catch-up window (a deliberate
// safeguard against back-blasting) means the day-3 Cycle Dashboard email
// reaches new and recent subscribers only. Long-standing readers — the ones
// with the strongest Brief habit — would never receive it. This is that
// one-off, and it deliberately uses DIFFERENT copy: the provenance angle
// ("the Brief hands you the conclusion; the Dashboard is the working"),
// because telling a two-year subscriber they are being welcomed is false.
//
// SEND SAFETY (founder rule): this module renders and enumerates only. The
// sender requires an explicit confirm flag; without it every call is a dry
// run that reports the audience and sends nothing. One-off idempotency is
// enforced through the same lifecycle_sends table under a reserved step id,
// so a second run can never double-send, and anyone who already received the
// day-3 onboarding email is excluded by construction.
//
// No new intelligence: the "Right now" line is the canonical Cycle Dashboard
// verdict, quoted verbatim (the same helper the onboarding email uses), and
// omitted entirely when it cannot render.

import { liveVerdictLine } from "./lifecycleEmails";
import { SITE_URL, SITE_HOST } from "./site";
import { type EmailTracking, NO_EMAIL_TRACKING, forHtmlAttr } from "./emailTracking";

/** Reserved lifecycle step id — the broadcast's idempotency key. Recorded in
 *  lifecycle_sends exactly like a drip step, so re-running is a no-op. */
export const BROADCAST_STEP_ID = "cycle_dashboard_broadcast";
/** The drip step whose recipients must be EXCLUDED (they already got it). */
export const ONBOARDING_STEP_ID = "cycle_dashboard";
export const BROADCAST_SUBJECT = "Where your Daily Brief comes from";
export const BROADCAST_CTA_LABEL = "cdoe_broadcast_dashboard_cta";

const C = {
  bg: "#0a0c10",
  cardHi: "#171b24",
  goldBorder: "#4a3f23",
  ink: "#f4f1ea",
  sub: "#c2c6cf",
  dim: "#8c919c",
  faint: "#6b7079",
  gold: "#d9b96a",
  hair: "#1d212a",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function dashboardBroadcastHtml(unsubUrl: string, tracking: EmailTracking = NO_EMAIL_TRACKING): string {
  const verdict = liveVerdictLine();
  const card = verdict
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.goldBorder};border-radius:12px;margin-top:18px;">
        <tr><td style="padding:16px 18px;">
          <div style="font:700 10px/1.3 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.gold};">Right now</div>
          <div style="font:500 17px/1.45 ${SERIF};color:${C.ink};margin-top:7px;">${esc(verdict)}</div>
        </td></tr>
      </table>`
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(BROADCAST_SUBJECT)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">The whole picture behind this morning's verdict.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:30px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.bg};">
      <tr><td style="padding:8px 36px 24px;">
        <table role="presentation" width="100%"><tr>
          <td style="font:700 15px/1 ${SANS};letter-spacing:.26em;text-transform:uppercase;color:${C.ink};">
            <span style="color:${C.gold};">◆</span>&nbsp; HalvingLens Research
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:6px 36px 8px;">
        <div style="font:700 11px/1.4 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.gold};">The whole picture</div>
        <div style="font:600 32px/1.16 ${SERIF};color:${C.ink};margin-top:12px;letter-spacing:-0.5px;">The working behind the answer.</div>
        <div style="font:400 16px/1.6 ${SANS};color:${C.sub};margin-top:14px;">
          Each morning, before your Brief is written, HalvingLens checks fifteen readings against their own history —
          valuation, sentiment, on-chain activity, ETF demand — to work out whether anything genuinely deserves your attention.
        </div>
      </td></tr>
      <tr><td style="padding:14px 36px 6px;">
        <div style="font:400 15px/1.65 ${SANS};color:${C.sub};">
          The Brief hands you the conclusion. The <span style="color:${C.ink};font-weight:600;">Cycle Dashboard</span> is the working:
          the whole checked market, the state of each signal and how long it has held, the ETF picture explained, and where
          this cycle sits against Bitcoin&rsquo;s own history.
        </div>
        ${card}
        <div style="font:400 15px/1.65 ${SANS};color:${C.sub};margin-top:18px;">
          It&rsquo;s open at any hour, not just at 8am — for the mornings when the Brief makes you curious, and the evenings
          when you want to look for yourself.
        </div>
      </td></tr>
      <tr><td style="padding:22px 36px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:10px;background:${C.gold};">
            <a href="${tracking.link(`${SITE_URL}/cycle-dashboard`, BROADCAST_CTA_LABEL)}" style="display:inline-block;padding:14px 30px;font:600 15px/1 ${SANS};color:#15120a;text-decoration:none;border-radius:10px;white-space:nowrap;">Open the Cycle Dashboard&nbsp;→</a>
          </td>
        </tr></table>
        <div style="font:400 12.5px/1.6 ${SANS};color:${C.faint};margin-top:12px;">Free, no login. Your Daily Brief continues exactly as it is.</div>
      </td></tr>
      <tr><td style="padding:24px 36px 30px;border-top:1px solid ${C.hair};">
        <div style="font:500 13px/1.5 ${SERIF};color:${C.sub};">The clearest view of the Bitcoin cycle.</div>
        <div style="font:400 11px/1.7 ${SANS};color:${C.faint};margin-top:12px;">
          Historical context, not a prediction. Educational analysis — not financial advice, no price targets.<br>
          You're receiving this one-off note because you subscribe to the ${esc(SITE_HOST)} daily brief.
          <a href="${forHtmlAttr(unsubUrl)}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
${tracking.openPixel}
</body></html>`;
}

export function dashboardBroadcastText(): string {
  const verdict = liveVerdictLine();
  return [
    "THE WORKING BEHIND THE ANSWER",
    "",
    "Each morning, before your Brief is written, HalvingLens checks fifteen readings against their own history — valuation, sentiment, on-chain activity, ETF demand — to work out whether anything genuinely deserves your attention.",
    "",
    "The Brief hands you the conclusion. The Cycle Dashboard is the working: the whole checked market, the state of each signal and how long it has held, the ETF picture explained, and where this cycle sits against Bitcoin's own history.",
    ...(verdict ? ["", `Right now: ${verdict}`] : []),
    "",
    "It's open at any hour, not just at 8am.",
    "",
    `Open the Cycle Dashboard: ${SITE_URL}/cycle-dashboard`,
    "Free, no login. Your Daily Brief continues exactly as it is.",
    "",
    "Historical context, not a prediction. Educational analysis, not financial advice.",
  ].join("\n");
}
