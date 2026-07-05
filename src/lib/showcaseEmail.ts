// Second onboarding email — sent a day or two after signup, once. Where the
// welcome email confirms the subscription, this one shows a new reader where to
// START: a short, hand-picked tour of the analyses readers return to most. Same
// dark + gold theme as the Daily Brief. Deliberately static for now (three fixed
// destinations); the picks can later be driven by real "most-viewed" data.
//
// Historical context, not advice. No predictions, no price targets.

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

// The three featured analyses. Edit this list to change what the tour points to
// (later this can be generated from real engagement data — same shape).
export interface ShowcasePick {
  kicker: string;
  title: string;
  body: string;
  path: string;
  label: string; // tracking label for the click
  cta: string;
}

export const SHOWCASE_PICKS: ShowcasePick[] = [
  {
    kicker: "Cycle comparison",
    title: "Every halving cycle, lined up from day zero",
    body:
      "All four cycles drawn on one axis, aligned to halving day — so you can see exactly how today's cycle is tracking against 2012, 2016 and 2020.",
    path: "/cycles",
    label: "showcase_cycles",
    cta: "See the cycles side by side",
  },
  {
    kicker: "Dynamic DCA",
    title: "What leaning into cheap conditions actually did",
    body:
      "A like-for-like historical comparison: plain dollar-cost averaging versus leaning harder when conditions were historically cheap — and what each rule did over a full cycle.",
    path: "/accumulation",
    label: "showcase_dca",
    cta: "Compare the strategies",
  },
  {
    kicker: "Downside scenarios",
    title: "Where prior cycles would imply support",
    body:
      "Every previous cycle's drawdowns mapped onto today — the downside in plain historical context. Context for the hard days, never a prediction.",
    path: "/downside-scenarios",
    label: "showcase_downside",
    cta: "View the historical drawdowns",
  },
];

export function showcaseEmailSubject(): string {
  return "Start here — 3 of our most-returned-to analyses";
}

export function showcaseEmailText(): string {
  return [
    "Where to start with HalvingLens.",
    "",
    "Now your subscription's live, here are three of the analyses our readers keep coming back to. Each is historical context — no predictions, no price targets.",
    "",
    ...SHOWCASE_PICKS.flatMap((p) => [`${p.title}`, p.body, `${SITE_URL}${p.path}`, ""]),
    "More lands in your inbox each morning with the Daily Cycle Brief.",
    "",
    "Historical context, not a prediction. Educational analysis — not financial advice.",
  ].join("\n");
}

export function showcaseEmailHtml(unsubUrl: string, tracking: EmailTracking = NO_EMAIL_TRACKING): string {
  const cards = SHOWCASE_PICKS.map(
    (p) => `
      <tr><td style="padding:8px 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.border};border-radius:14px;">
          <tr><td style="padding:22px 24px;">
            <div style="font:700 10.5px/1.4 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:${C.gold};">${esc(p.kicker)}</div>
            <div style="font:600 20px/1.25 ${SERIF};color:${C.ink};margin-top:9px;letter-spacing:-0.2px;">${esc(p.title)}</div>
            <div style="font:400 14.5px/1.6 ${SANS};color:${C.sub};margin-top:9px;">${esc(p.body)}</div>
            <div style="margin-top:15px;">
              <a href="${tracking.link(`${SITE_URL}${p.path}`, p.label)}" style="display:inline-block;font:600 13.5px/1 ${SANS};color:${C.gold};text-decoration:none;">${esc(p.cta)} &rarr;</a>
            </div>
          </td></tr>
        </table>
      </td></tr>`,
  ).join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(showcaseEmailSubject())}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Three of the analyses HalvingLens readers return to most — a place to start.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:30px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.bg};">

      <!-- Masthead -->
      <tr><td style="padding:8px 36px 24px;">
        <table role="presentation" width="100%"><tr>
          <td style="font:700 15px/1 ${SANS};letter-spacing:.26em;text-transform:uppercase;color:${C.ink};">
            <span style="color:${C.gold};">◆</span>&nbsp; HalvingLens Research
          </td>
          <td style="text-align:right;font:400 12px/1 ${SANS};color:${C.dim};">Where to start</td>
        </tr></table>
      </td></tr>

      <!-- Hero -->
      <tr><td style="padding:6px 36px 8px;">
        <div style="font:700 11px/1.4 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.gold};">A place to begin</div>
        <div style="font:600 32px/1.15 ${SERIF};color:${C.ink};margin-top:12px;letter-spacing:-0.5px;">Three analyses to start with.</div>
        <div style="font:400 16px/1.6 ${SANS};color:${C.sub};margin-top:14px;">
          Now you're subscribed, here are three of the analyses our readers keep coming back to. Each one is
          historical context — no hype, no predictions, no price targets.
        </div>
      </td></tr>

      <!-- Featured picks -->
      <tr><td style="height:14px;"></td></tr>
      ${cards}

      <!-- Closing note -->
      <tr><td style="padding:20px 36px 6px;">
        <div style="font:400 14.5px/1.6 ${SANS};color:${C.sub};border-left:2px solid ${C.goldBorder};padding-left:14px;">
          More lands in your inbox each morning with the <span style="color:${C.ink};font-weight:600;">Daily Cycle Brief</span> —
          the one thing that matters, in a 30-second read.
        </div>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:22px 36px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:10px;background:${C.gold};">
            <a href="${tracking.link(`${SITE_URL}/`, "showcase_home")}" style="display:inline-block;padding:13px 26px;font:600 14px/1 ${SANS};color:#15120a;text-decoration:none;border-radius:10px;">Explore HalvingLens →</a>
          </td>
        </tr></table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:24px 36px 30px;border-top:1px solid ${C.hair};">
        <div style="font:500 13px/1.5 ${SERIF};color:${C.sub};">The clearest view of the Bitcoin cycle.</div>
        <div style="font:400 11px/1.7 ${SANS};color:${C.faint};margin-top:12px;">
          Historical context, not a prediction. Educational analysis — not financial advice, no price targets.<br>
          You're receiving this because you subscribed at ${SITE_HOST}.
          <a href="${forHtmlAttr(unsubUrl)}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
${tracking.openPixel}
</body></html>`;
}
