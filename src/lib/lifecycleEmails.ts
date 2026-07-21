// Onboarding sequence email templates. Each step is a small, self-contained
// builder that returns { html, text } for a given recipient context. Adding a
// new onboarding email is just a new entry in LIFECYCLE_STEPS — the engine
// (lifecycle.ts) and sender (lifecycleSend.ts) need no changes.
//
// Same dark + gold theme as the Daily Brief. Calm, premium, no gamification.
// Historical context, not advice.

import { SITE_URL, SITE_HOST } from "./site";
import { unsubToken } from "./emailToken";
import { type EmailTracking, NO_EMAIL_TRACKING } from "./emailTracking";
import { YOUTUBE_URL, YOUTUBE_LIVE } from "./lifecycleConfig";

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

// Recipient context passed to every step builder.
export interface LifecycleCtx {
  email: string;
  unsubUrl: string;
  tracking: EmailTracking;
  referralLink: string; // the subscriber's personal referral URL
}

// A single onboarding email.
export interface LifecycleStep {
  id: string; // stable key, stored in lifecycle_sends — never rename
  dayOffset: number; // days after enrolment this is due
  subject: string;
  build: (ctx: LifecycleCtx) => { html: string; text: string };
  enabled?: boolean; // default true
}

// ── Shared layout ─────────────────────────────────────────────────────────────
function shell(opts: {
  eyebrow: string;
  tag: string;
  title: string;
  intro: string;
  body: string;
  cta?: { label: string; url: string };
  ctx: LifecycleCtx;
  preheader: string;
}): string {
  const { eyebrow, tag, title, intro, body, cta, ctx, preheader } = opts;
  const t = ctx.tracking;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:30px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.bg};">
      <tr><td style="padding:8px 36px 24px;">
        <table role="presentation" width="100%"><tr>
          <td style="font:700 15px/1 ${SANS};letter-spacing:.26em;text-transform:uppercase;color:${C.ink};">
            <span style="color:${C.gold};">◆</span>&nbsp; HalvingLens Research
          </td>
          <td style="text-align:right;font:400 12px/1 ${SANS};color:${C.dim};">${esc(tag)}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:6px 36px 8px;">
        <div style="font:700 11px/1.4 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.gold};">${esc(eyebrow)}</div>
        <div style="font:600 32px/1.16 ${SERIF};color:${C.ink};margin-top:12px;letter-spacing:-0.5px;">${esc(title)}</div>
        <div style="font:400 16px/1.6 ${SANS};color:${C.sub};margin-top:14px;">${intro}</div>
      </td></tr>
      <tr><td style="padding:14px 36px 6px;">${body}</td></tr>
      ${
        cta
          ? `<tr><td style="padding:22px 36px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:10px;background:${C.gold};">
            <a href="${t.link(cta.url, "lc_cta")}" style="display:inline-block;padding:13px 26px;font:600 14px/1 ${SANS};color:#15120a;text-decoration:none;border-radius:10px;">${esc(cta.label)} →</a>
          </td>
        </tr></table>
      </td></tr>`
          : ""
      }
      <tr><td style="padding:24px 36px 30px;border-top:1px solid ${C.hair};">
        <div style="font:500 13px/1.5 ${SERIF};color:${C.sub};">The clearest view of the Bitcoin cycle.</div>
        <div style="font:400 11px/1.7 ${SANS};color:${C.faint};margin-top:12px;">
          Historical context, not a prediction. Educational analysis — not financial advice, no price targets.<br>
          You're receiving this as part of your welcome to ${SITE_HOST}. Your Daily Brief continues as normal.
          <a href="${ctx.tracking.link(ctx.unsubUrl, "lc_unsub")}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
${ctx.tracking.openPixel}
</body></html>`;
}

// A titled feature row with a deep link (used in the tour + advanced emails).
function featureRow(t: EmailTracking, kicker: string, name: string, desc: string, path: string, label: string): string {
  return `
    <a href="${t.link(`${SITE_URL}${path}`, label)}" style="display:block;text-decoration:none;border:1px solid ${C.border};border-radius:12px;padding:16px 18px;margin-bottom:10px;">
      <div style="font:700 10px/1.3 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.gold};">${esc(kicker)}</div>
      <div style="font:600 17px/1.35 ${SERIF};color:${C.ink};margin-top:5px;">${esc(name)}</div>
      <div style="font:400 13.5px/1.55 ${SANS};color:${C.dim};margin-top:5px;">${esc(desc)}</div>
    </a>`;
}

function bullet(text: string): string {
  return `<tr><td style="padding:6px 0;font:400 15px/1.55 ${SANS};color:${C.sub};"><span style="color:${C.green};font-weight:700;">✓</span>&nbsp;&nbsp;${text}</td></tr>`;
}

// ── The sequence ──────────────────────────────────────────────────────────────
export const LIFECYCLE_STEPS: LifecycleStep[] = [
  // Day 1 — the tour (this supersedes the old standalone "showcase" email).
  {
    id: "tour",
    dayOffset: 1,
    subject: "Start here: the 5-minute tour",
    build: (ctx) => {
      const t = ctx.tracking;
      const body =
        featureRow(t, "Cycle comparison", "Cycle Summary", "All four halving cycles on one axis — see how today's is tracking against 2012, 2016 and 2020.", "/cycles", "tour_cycles") +
        featureRow(t, "Context Score", "Risk Gauge", "One number for how today's market compares to historically significant moments.", "/accumulation", "tour_risk") +
        featureRow(t, "Similar moments", "Similar Moments", "The historical moments today most resembles, ranked by similarity.", "/similar-moments", "tour_similar") +
        featureRow(t, "Accumulation index", "Accumulation Index", "How attractive today is versus Bitcoin's entire history.", "/accumulation", "tour_accumulation") +
        featureRow(t, "Daily brief", "The Daily Brief", "The one thing that matters each morning, in a 30-second read.", "/brief", "tour_brief");
      return {
        html: shell({
          eyebrow: "A place to begin",
          tag: "Getting started · 1 of 5",
          title: "There's more here than a newsletter.",
          intro: "HalvingLens is a research platform. Here are the five things most readers return to — each is one tap away.",
          body,
          cta: { label: "Open your dashboard", url: `${SITE_URL}/dashboard` },
          ctx,
          preheader: "The five analyses HalvingLens readers return to most.",
        }),
        text: tourText(ctx),
      };
    },
  },

  // Day 2 — why we're different.
  {
    id: "different",
    dayOffset: 2,
    subject: "Why HalvingLens is different",
    build: (ctx) => {
      const rows = [
        "<span style=\"color:" + C.ink + "\">No hype.</span> We never tell you Bitcoin is going to the moon.",
        "<span style=\"color:" + C.ink + "\">No price targets.</span> Nobody knows the price. We don't pretend to.",
        "<span style=\"color:" + C.ink + "\">Evidence before opinions.</span> Every figure traces to real market and on-chain data.",
        "<span style=\"color:" + C.ink + "\">Historical context.</span> We show you what past cycles did, not what this one “will” do.",
        "<span style=\"color:" + C.ink + "\">Honest uncertainty.</span> When the data is unclear, we say so.",
      ].map(bullet).join("");
      const body = `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        <div style="font:400 15px/1.65 ${SERIF};color:${C.sub};margin-top:18px;border-left:2px solid ${C.gold};padding-left:14px;font-style:italic;">
          Everything here answers one question: where are we in the Bitcoin cycle?
        </div>`;
      return {
        html: shell({
          eyebrow: "Our approach",
          tag: "Getting started · 2 of 5",
          title: "Calm evidence, not noise.",
          intro: "Most crypto content is built to make you feel something. HalvingLens is built to help you think clearly.",
          body,
          cta: { label: "Read the research", url: `${SITE_URL}/research/findings` },
          ctx,
          preheader: "No hype, no price targets — evidence and historical context.",
        }),
        text: simpleText(
          "Why HalvingLens is different",
          [
            "No hype. We never tell you Bitcoin is going to the moon.",
            "No price targets. Nobody knows the price; we don't pretend to.",
            "Evidence before opinions — every figure traces to real data.",
            "Historical context, not forecasts.",
            "Honest uncertainty — when the data is unclear, we say so.",
            "",
            "Everything answers one question: where are we in the Bitcoin cycle?",
            `Read the research: ${SITE_URL}/research/findings`,
          ],
          ctx,
        ),
      };
    },
  },

  // Day 4 — YouTube (adapts if the channel isn't live yet).
  {
    id: "youtube",
    dayOffset: 4,
    subject: "Prefer watching instead?",
    enabled: true,
    build: (ctx) => {
      const body = YOUTUBE_LIVE
        ? `<div style="font:400 15px/1.65 ${SANS};color:${C.sub};">
             The YouTube channel goes deeper than the brief can — full walk-throughs of the cycle, the indicators and the history behind them. Same calm, evidence-first approach.
           </div>`
        : `<div style="font:400 15px/1.65 ${SANS};color:${C.sub};">
             We're building a HalvingLens YouTube channel — deeper walk-throughs of the cycle and the indicators, in the same calm, evidence-first style. It isn't live just yet; in the meantime the full analysis is always on the site.
           </div>`;
      return {
        html: shell({
          eyebrow: "Another way in",
          tag: "Getting started · 3 of 5",
          title: YOUTUBE_LIVE ? "Prefer watching?" : "Coming soon: watch the cycle.",
          intro: YOUTUBE_LIVE
            ? "Some ideas land better on screen. Our channel covers the cycle in more depth than a morning email can."
            : "Some ideas land better on screen — and that's coming.",
          body,
          cta: YOUTUBE_LIVE
            ? { label: "Watch on YouTube", url: YOUTUBE_URL }
            : { label: "Explore today's analysis", url: `${SITE_URL}/accumulation` },
          ctx,
          preheader: YOUTUBE_LIVE ? "Deeper context on the HalvingLens YouTube channel." : "The full analysis is always on the site.",
        }),
        text: simpleText(
          YOUTUBE_LIVE ? "Prefer watching instead?" : "Coming soon: watch the cycle",
          YOUTUBE_LIVE
            ? ["The HalvingLens YouTube channel goes deeper than the brief.", `Watch: ${YOUTUBE_URL}`]
            : ["A HalvingLens YouTube channel is on the way. In the meantime, the full analysis is on the site.", `Explore: ${SITE_URL}/accumulation`],
          ctx,
        ),
      };
    },
  },

  // Day 6 — referrals.
  {
    id: "referral",
    dayOffset: 6,
    subject: "Unlock more with referrals",
    build: (ctx) => {
      const body = `
        <div style="font:400 15px/1.65 ${SANS};color:${C.sub};">
          If HalvingLens helps you think clearly, it'll help the people you invest alongside. As friends join, you unlock exclusive research and recognition.
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.goldBorder};border-radius:12px;margin-top:16px;">
          <tr><td style="padding:16px 18px;">
            <div style="font:700 10px/1.3 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.gold};">The easiest way to share</div>
            <div style="font:400 14.5px/1.6 ${SANS};color:${C.sub};margin-top:7px;">
              Tap <span style="color:${C.ink};font-weight:600;">Share</span> on any page — your referral link and a scannable
              QR code are built in automatically. Copy it, post it, or hand someone your phone to scan in person. Every join
              is credited to you.
            </div>
          </td></tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.border};border-radius:12px;margin-top:12px;">
          <tr><td style="padding:16px 18px;">
            <div style="font:700 10px/1.3 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.gold};">Or share your personal link</div>
            <div style="font:600 14px/1.5 ${SANS};color:${C.ink};margin-top:6px;word-break:break-all;">${esc(ctx.referralLink)}</div>
          </td></tr>
        </table>
        <div style="font:400 13px/1.7 ${SANS};color:${C.dim};margin-top:14px;">
          A few of the milestones: <span style="color:${C.sub};">3 → Founder&rsquo;s Collection · 10 → Early Access · 25 → Ambassador · 100 → Hall of Fame</span>.
        </div>`;
      return {
        html: shell({
          eyebrow: "Grow the community",
          tag: "Getting started · 4 of 5",
          title: "Bring someone with you.",
          intro: "Referrals are how HalvingLens grows without hype — one recommendation at a time.",
          body,
          cta: { label: "See your referral dashboard", url: `${SITE_URL}/dashboard/referrals` },
          ctx,
          preheader: "Your personal referral link — unlock exclusive research as friends join.",
        }),
        text: simpleText(
          "Unlock more with referrals",
          [
            "The easiest way: tap Share on any page — your referral link and a scannable QR are built in. Copy it, post it, or hand someone your phone to scan. Every join is credited to you.",
            `Or share your personal link: ${ctx.referralLink}`,
            "Milestones: 3 → Founder's Collection, 10 → Early Access, 25 → Ambassador, 100 → Hall of Fame.",
            `Dashboard: ${SITE_URL}/dashboard/referrals`,
          ],
          ctx,
        ),
      };
    },
  },

  // Day 10 — advanced features + investor profile.
  {
    id: "advanced",
    dayOffset: 10,
    subject: "Get even more from HalvingLens",
    build: (ctx) => {
      const t = ctx.tracking;
      const body =
        `<div style="font:400 15px/1.65 ${SANS};color:${C.sub};margin-bottom:14px;">Your Investor Profile turns HalvingLens into a place you return to — not just an email you read.</div>` +
        featureRow(t, "Your profile", "Investor Profile", "Your reading streak, achievements and referral progress in one premium view.", "/profile", "adv_profile") +
        featureRow(t, "Habit", "Reading Streak", "A quiet daily streak that rewards consistency — the investor's real edge.", "/profile", "adv_streak") +
        featureRow(t, "Recognition", "Achievements", "Understated milestones as you read, explore and refer.", "/profile", "adv_achievements");
      return {
        html: shell({
          eyebrow: "The full platform",
          tag: "Getting started · 5 of 5",
          title: "Make it a habit.",
          intro: "The investors who do best are the consistent ones. HalvingLens is built to reward showing up.",
          body,
          cta: { label: "Open your Investor Profile", url: `${SITE_URL}/profile` },
          ctx,
          preheader: "Your Investor Profile: reading streak, achievements and more.",
        }),
        text: simpleText(
          "Get even more from HalvingLens",
          [
            "Your Investor Profile brings your reading streak, achievements and referral progress into one view.",
            `Open it: ${SITE_URL}/profile`,
          ],
          ctx,
        ),
      };
    },
  },
  // Day 14 — feedback / testimonial request (P6.2). Warm, low-pressure; the link
  // carries a signed token so a reply can be attributed (as a hash) without
  // asking for the email again. Nothing published without admin approval.
  {
    id: "day14_feedback",
    dayOffset: 14,
    subject: "How's the daily brief working for you?",
    build: (ctx) => {
      const url = `${SITE_URL}/testimonial?e=${encodeURIComponent(ctx.email)}&t=${unsubToken(ctx.email)}`;
      const body =
        `<div style="font:400 15px/1.65 ${SANS};color:${C.sub};margin-bottom:12px;">If it's earning a place in your morning, I'd love to hear how — a sentence or two is perfect:</div>` +
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">` +
        bullet("Does it save you research time?") +
        bullet("Does the historical context help you keep perspective?") +
        bullet("Has it made the cycle easier to follow, with less noise?") +
        `</table>` +
        `<div style="font:400 13px/1.6 ${SANS};color:${C.dim};margin-top:12px;">Nothing formal needed — and please skip specific returns or price calls, just how it helps. If we ever feature it, only the display name you choose is shown.</div>`;
      return {
        html: shell({
          eyebrow: "Two weeks in",
          tag: "Day 14",
          title: "How's it working for you?",
          intro: "You've had the Daily Brief for a couple of weeks now.",
          body,
          cta: { label: "Share your experience", url },
          ctx,
          preheader: "A quick question after your first two weeks.",
        }),
        text: simpleText(
          "How's the daily brief working for you?",
          [
            "You've had the Daily Brief for two weeks. If it helps, I'd love to hear how — a sentence is perfect.",
            "Please skip specific returns or price calls — just how it helps.",
            `Share your experience: ${url}`,
          ],
          ctx,
        ),
      };
    },
  },
];

// ── Plain-text fallbacks ──────────────────────────────────────────────────────
function simpleText(title: string, lines: string[], ctx: LifecycleCtx): string {
  return [title, "", ...lines, "", "Historical context, not a prediction. Not financial advice.", `Unsubscribe: ${ctx.unsubUrl}`].join("\n");
}

function tourText(ctx: LifecycleCtx): string {
  return simpleText(
    "Start here: the 5-minute tour",
    [
      "Five things most readers return to:",
      `• Cycle Summary — ${SITE_URL}/cycles`,
      `• Risk Gauge (Context Score) — ${SITE_URL}/accumulation`,
      `• Similar Moments — ${SITE_URL}/similar-moments`,
      `• Accumulation Index — ${SITE_URL}/accumulation`,
      `• The Daily Brief — ${SITE_URL}/brief`,
      "",
      `Open your dashboard: ${SITE_URL}/dashboard`,
    ],
    ctx,
  );
}

// Convenience for admin previews (no tracking).
export function previewLifecycleStep(id: string): { subject: string; html: string } | null {
  const step = LIFECYCLE_STEPS.find((s) => s.id === id);
  if (!step) return null;
  const ctx: LifecycleCtx = {
    email: "preview@example.com",
    unsubUrl: `${SITE_URL}/api/unsubscribe?e=preview%40example.com&t=preview`,
    tracking: NO_EMAIL_TRACKING,
    referralLink: `${SITE_URL}/?ref=preview`,
  };
  return { subject: step.subject, html: step.build(ctx).html };
}
