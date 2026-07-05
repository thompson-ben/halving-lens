// Weekly Round-up email — the Sunday retention note. General sections (market
// this week, most-viewed content, what's new, latest video) are the same for
// everyone; the personal block (reading streak, referral progress, leaderboard
// position, achievements) appears only for members with an Investor Profile,
// otherwise a gentle nudge to create one. Historical context, not advice.

import { SITE_URL, SITE_HOST } from "./site";
import { type EmailTracking, NO_EMAIL_TRACKING } from "./emailTracking";
import { editionContent } from "./emailBrief";
import { sentimentRead, SENTIMENT_AVAILABLE } from "./sentiment";
import { sbSelect } from "./supabase";
import { ROUNDUP_FEATURES } from "./roundupConfig";
import { YOUTUBE_URL, YOUTUBE_LIVE } from "./lifecycleConfig";

const C = {
  bg: "#0a0c10", card: "#13161d", cardHi: "#171b24", border: "#23272f", goldBorder: "#4a3f23",
  ink: "#f4f1ea", sub: "#c2c6cf", dim: "#8c919c", faint: "#6b7079", gold: "#d9b96a", green: "#5fd0a0", hair: "#1d212a",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface RoundupGeneral {
  marketLine: string;
  contextScore: number;
  contextLabel: string;
  fearGreed: string | null;
  mostViewed: { label: string; href: string } | null;
}

export interface RoundupPersonal {
  streak: number;
  longest: number;
  referrals: number;
  leaderboardPosition: number | null;
  achievements: number;
}

// Friendly label for a content path.
function pathLabel(path: string): string {
  const map: Record<string, string> = {
    "/accumulation": "Accumulation Index", "/cycles": "Cycle comparison", "/similar-moments": "Similar Moments",
    "/downside-scenarios": "Downside scenarios", "/brief": "Daily Brief", "/sentiment": "Fear & Greed",
    "/research": "Morning Research", "/research/findings": "Research findings", "/weekly": "Weekly Research", "/halving": "Next halving",
  };
  if (map[path]) return map[path];
  if (path.startsWith("/metrics/")) return path.slice(9).toUpperCase().replace(/-/g, " ");
  return path.replace(/^\//, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "the dashboard";
}

// Shared sections, computed once per send.
export async function roundupGeneral(): Promise<RoundupGeneral> {
  const e = editionContent();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const band = e.metrics.accumulationBand.replace("Historically ", "");
  const marketLine = `Bitcoin is scoring ${e.contextScore.score}/100 on the Context Score; the Accumulation Index reads ${band}${sr ? `, and sentiment is in ${sr.band.label.toLowerCase()}` : ""}.`;

  // Most-viewed content this week (approx: recent page_views, top content path).
  let mostViewed: { label: string; href: string } | null = null;
  const rows = await sbSelect<{ path: string | null }[]>("events?name=eq.page_view&select=path&order=created_at.desc&limit=20000");
  if (rows) {
    const tally = new Map<string, number>();
    for (const r of rows) {
      const p = r.path || "";
      if (!p || p === "/" || p === "/dashboard" || /^\/(admin|api|profile|founders)/.test(p)) continue;
      tally.set(p, (tally.get(p) ?? 0) + 1);
    }
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) mostViewed = { label: pathLabel(top[0]), href: top[0] };
  }

  return {
    marketLine,
    contextScore: e.contextScore.score,
    contextLabel: e.contextScore.label,
    fearGreed: sr ? `${sr.value} · ${sr.band.label}` : null,
    mostViewed,
  };
}

function eyebrow(t: string) {
  return `<div style="font:700 10.5px/1.4 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.gold};margin-bottom:10px;">${esc(t)}</div>`;
}

export function roundupEmailSubject(): string {
  return "Your HalvingLens week in review";
}

export function roundupEmailHtml(
  unsubUrl: string,
  general: RoundupGeneral,
  personal: RoundupPersonal | null,
  tracking: EmailTracking = NO_EMAIL_TRACKING,
): string {
  const t = tracking;
  const link = (path: string, label: string) => t.link(path.startsWith("http") ? path : `${SITE_URL}${path}`, label);

  const marketBlock = `
    <tr><td style="padding:8px 36px;">
      ${eyebrow("The market this week")}
      <div style="font:500 19px/1.5 ${SERIF};color:${C.ink};">${esc(general.marketLine)}</div>
      <div style="margin-top:12px;"><a href="${link("/accumulation", "ru_market")}" style="font:600 12.5px/1 ${SANS};color:${C.gold};text-decoration:none;">See where today sits →</a></div>
    </td></tr>`;

  const stat = (label: string, value: string, sub = "") =>
    `<td style="padding:14px 10px;text-align:center;"><div style="font:700 26px/1 ${SERIF};color:${C.ink};">${esc(value)}${sub ? `<span style="font:400 13px/1 ${SANS};color:${C.faint};"> ${esc(sub)}</span>` : ""}</div><div style="font:600 9.5px/1.4 ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${C.faint};margin-top:6px;">${esc(label)}</div></td>`;

  const personalBlock = personal
    ? `
    <tr><td style="padding:20px 36px 8px;">
      ${eyebrow("Your week")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.border};border-radius:14px;">
        <tr>
          ${stat("Reading streak", String(personal.streak), personal.streak === 1 ? "day" : "days")}
          ${stat("Longest", String(personal.longest), "days")}
          ${stat("Referrals", String(personal.referrals))}
          ${stat("Achievements", String(personal.achievements))}
        </tr>
      </table>
      <div style="font:400 14px/1.6 ${SANS};color:${C.sub};margin-top:14px;">
        ${personal.leaderboardPosition != null ? `You're <span style="color:${C.ink};">#${personal.leaderboardPosition}</span> on the referral leaderboard. ` : ""}Keep your streak alive — read tomorrow's brief.
      </div>
      <div style="margin-top:10px;"><a href="${link("/profile", "ru_profile")}" style="font:600 12.5px/1 ${SANS};color:${C.gold};text-decoration:none;">Open your Investor Profile →</a></div>
    </td></tr>`
    : `
    <tr><td style="padding:20px 36px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.goldBorder};border-radius:14px;">
        <tr><td style="padding:20px 22px;">
          <div style="font:600 15px/1.4 ${SANS};color:${C.ink};">Track your reading streak</div>
          <div style="font:400 13.5px/1.6 ${SANS};color:${C.sub};margin-top:6px;">Create your free Investor Profile to build a streak, earn achievements and unlock referral rewards.</div>
          <div style="margin-top:12px;"><a href="${link("/profile", "ru_create_profile")}" style="font:600 12.5px/1 ${SANS};color:${C.gold};text-decoration:none;">Create your profile →</a></div>
        </td></tr>
      </table>
    </td></tr>`;

  const mostViewedBlock = general.mostViewed
    ? `<tr><td style="padding:20px 36px 8px;">${eyebrow("Most read this week")}
        <a href="${link(general.mostViewed.href, "ru_mostviewed")}" style="display:block;text-decoration:none;border:1px solid ${C.border};border-radius:12px;padding:16px 18px;">
          <div style="font:600 17px/1.35 ${SERIF};color:${C.ink};">${esc(general.mostViewed.label)}</div>
          <div style="font:600 12px/1 ${SANS};color:${C.gold};margin-top:8px;">Read it →</div>
        </a></td></tr>`
    : "";

  const featuresBlock = `
    <tr><td style="padding:20px 36px 8px;">
      ${eyebrow("What's new")}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${ROUNDUP_FEATURES.map(
          (f) => `<tr><td style="padding:7px 0;">
            <a href="${link(f.href, "ru_feature")}" style="text-decoration:none;font:600 14.5px/1.4 ${SANS};color:${C.gold};">${esc(f.title)} →</a>
            <span style="font:400 13px/1.4 ${SANS};color:${C.faint};"> &nbsp;${esc(f.desc)}</span>
          </td></tr>`,
        ).join("")}
      </table>
    </td></tr>`;

  const youtubeBlock = YOUTUBE_LIVE
    ? `<tr><td style="padding:20px 36px 8px;">${eyebrow("Latest on YouTube")}
        <div style="font:400 14px/1.6 ${SANS};color:${C.sub};">Deeper context on the cycle, in video.</div>
        <div style="margin-top:10px;"><a href="${link(YOUTUBE_URL, "ru_youtube")}" style="font:600 12.5px/1 ${SANS};color:${C.gold};text-decoration:none;">Watch on YouTube →</a></div></td></tr>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(roundupEmailSubject())}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your week in review — the market, what's new, and your streak.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:30px 12px;"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.bg};">
    <tr><td style="padding:8px 36px 20px;">
      <table role="presentation" width="100%"><tr>
        <td style="font:700 15px/1 ${SANS};letter-spacing:.26em;text-transform:uppercase;color:${C.ink};"><span style="color:${C.gold};">◆</span>&nbsp; HalvingLens Research</td>
        <td style="text-align:right;font:400 12px/1 ${SANS};color:${C.dim};">Weekly Round-up</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:2px 36px 6px;">
      <div style="font:600 30px/1.15 ${SERIF};color:${C.ink};letter-spacing:-0.5px;">Your week in review</div>
    </td></tr>
    ${marketBlock}
    ${personalBlock}
    ${mostViewedBlock}
    ${featuresBlock}
    ${youtubeBlock}
    <tr><td style="padding:24px 36px 30px;border-top:1px solid ${C.hair};">
      <div style="font:500 13px/1.5 ${SERIF};color:${C.sub};">The clearest view of the Bitcoin cycle.</div>
      <div style="font:400 11px/1.7 ${SANS};color:${C.faint};margin-top:12px;">
        Historical context, not a prediction. Educational analysis — not financial advice, no price targets.<br>
        You're receiving this weekly round-up because you subscribed at ${SITE_HOST}.
        <a href="${esc(unsubUrl.replace(/&/g, "&amp;"))}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>.
      </div>
    </td></tr>
  </table>
</td></tr></table>
${tracking.openPixel}
</body></html>`;
}
