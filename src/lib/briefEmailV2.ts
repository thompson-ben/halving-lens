// DBV2-B — the Daily Brief V2 email renderer.
//
// PRESENTATION ONLY. Every sentence, number, state word, since-date and
// subject arrives on the DBV2-A payload (briefIntel), which quotes the
// canonical V2.1 authorities — this file decides fonts, spacing and order,
// never content. The founder-approved hierarchy is fixed:
//
//   MASTHEAD → VERDICT → PRIMARY STORY → max ONE secondary insight
//   → STATE OF THE CYCLE → dominant CYCLE DASHBOARD CTA
//   → subordinate reply/feedback invitation (footer).
//
// No extra modules are added because visual space exists. The dark+gold
// design system carries over from the house email style (palette values
// duplicated here deliberately: the legacy content file retires at DBV2-C,
// and the renderer must never import it). Mobile-first single-column table
// at max 600px — the layout is identical on desktop and iPhone, only wider.
//
// Sending is untouched in this phase: nothing imports this module from the
// send pipeline until the DBV2-C cutover.

import { briefIntel, type BriefIntel, type BriefStory } from "./briefIntel";
import { SITE_URL, SITE_HOST } from "./site";
import { type EmailTracking, NO_EMAIL_TRACKING, forHtmlAttr } from "./emailTracking";

// ── Palette (dark + gold — the house email system) ──────────────────────────
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
  hair: "#1d212a",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

function eyebrow(t: string): string {
  return `<div style="font:600 11px/1.4 ${SANS};letter-spacing:.24em;text-transform:uppercase;color:${C.gold};margin:0 0 14px;">${esc(t)}</div>`;
}
function section(inner: string, pad = "26px 36px"): string {
  return `<tr><td style="padding:${pad};">${inner}</td></tr>`;
}

// ── Story blocks — one renderer per payload shape ───────────────────────────

function storyBlock(s: BriefStory, link: (path: string, label: string) => string): string {
  const more = (label: string, href: string) =>
    `<div style="margin-top:16px;"><a href="${link(href, "v2_story")}" style="font:600 13px/1.35 ${SANS};color:${C.gold};text-decoration:none;">${esc(label)} →</a></div>`;

  if (s.kind === "mover") {
    const band = s.bandWord
      ? `<span style="font:600 13px/1 ${SANS};letter-spacing:.2em;text-transform:uppercase;color:${C.gold};margin-left:14px;vertical-align:middle;">${esc(s.bandWord)}</span>`
      : "";
    return `
      ${eyebrow(s.bandWord ? "Something changed" : "The one that moved")}
      <div style="font:500 20px/1.3 ${SANS};color:${C.sub};">${esc(s.label)}</div>
      <div style="margin-top:6px;">
        <span style="font:700 46px/1.05 ${SERIF};color:${C.ink};letter-spacing:-.5px;">${esc(s.movement)}</span>${band}
      </div>
      <div style="font:600 12px/1.4 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.dim};margin-top:6px;">${esc(s.periodLabel)}</div>
      <div style="font:400 16px/1.6 ${SANS};color:${C.sub};margin-top:14px;">${esc(s.meaning)}${s.evidence ? ` <span style="color:${C.dim};">${esc(s.evidence)}.</span>` : ""}</div>
      <div style="font:400 15px/1.5 ${SANS};color:${C.dim};margin-top:10px;">Now ${esc(s.valueLabel)}${s.stateWord ? ` · ${esc(s.stateWord)}` : ""}${s.thirtyDay ? ` · ${esc(s.thirtyDay)}` : ""}</div>
      ${more(`Explore ${s.label}`, s.href)}`;
  }
  if (s.kind === "state_change") {
    return `
      ${eyebrow("A state changed")}
      <div style="font:500 26px/1.35 ${SERIF};color:${C.ink};">${esc(s.headline)}</div>
      <div style="font:400 15px/1.5 ${SANS};color:${C.dim};margin-top:10px;">Current reading: ${esc(s.currentLabel)}</div>
      ${more(`Explore ${s.label}`, s.href)}`;
  }
  if (s.kind === "etf") {
    return `
      ${eyebrow("The story is demand")}
      <div style="font:500 24px/1.35 ${SERIF};color:${C.ink};">Net ${esc(s.nowLine)}${s.changeLine ? `, against the ${esc(s.changeLine)}` : ""}.</div>
      ${s.contextLine ? `<div style="font:400 16px/1.6 ${SANS};color:${C.sub};margin-top:12px;">${esc(s.contextLine)}</div>` : ""}
      ${s.concentrationLine ? `<div style="font:400 15px/1.55 ${SANS};color:${C.dim};margin-top:8px;">${esc(s.concentrationLine)}</div>` : ""}
      ${s.asOf ? `<div style="font:400 12.5px/1.5 ${SANS};color:${C.faint};margin-top:8px;">Trading-day series · as of ${esc(prettyDate(s.asOf))}</div>` : ""}
      ${more("Explore ETF flows", s.href)}`;
  }
  if (s.kind === "quiet_duration") {
    return `
      ${eyebrow("The quiet finding")}
      <div style="font:500 24px/1.4 ${SERIF};color:${C.ink};">${esc(s.line)}</div>
      ${s.alsoLine ? `<div style="font:400 15px/1.55 ${SANS};color:${C.dim};margin-top:10px;">${esc(s.alsoLine)}</div>` : ""}
      ${more(`Explore ${s.label}`, s.href)}`;
  }
  if (s.kind === "quiet_lens") {
    return `
      ${eyebrow("The quiet finding · same point, past cycles")}
      <div style="font:500 24px/1.4 ${SERIF};color:${C.ink};">${esc(s.sentence)}</div>
      ${more("See the cycle comparison", s.href)}`;
  }
  return `
    ${eyebrow("The quiet finding")}
    <div style="font:500 22px/1.45 ${SERIF};color:${C.ink};">${esc(s.line)}</div>`;
}

// ── The email ───────────────────────────────────────────────────────────────

export function briefEmailV2Subject(anchor?: string): string {
  return briefIntel(anchor).subject;
}

export function briefEmailV2Html(unsubUrl: string, tracking: EmailTracking = NO_EMAIL_TRACKING, anchor?: string): string {
  const b: BriefIntel = briefIntel(anchor);
  const link = (path: string, label: string) => tracking.link(`${SITE_URL}${path}`, label);

  const masthead = `
    <table role="presentation" width="100%"><tr>
      <td style="font:700 15px/1 ${SANS};letter-spacing:.26em;text-transform:uppercase;color:${C.ink};">
        <span style="color:${C.gold};">◆</span>&nbsp; HalvingLens
      </td>
      <td style="text-align:right;font:400 12px/1 ${SANS};color:${C.dim};">Daily Brief · ${esc(prettyDate(b.asOf))}</td>
    </tr></table>`;

  const verdict = `
    ${eyebrow("The verdict")}
    <a href="${link(b.verdict.href, "v2_verdict")}" style="text-decoration:none;">
      <div style="font:500 30px/1.25 ${SERIF};color:${C.ink};letter-spacing:-.3px;">${esc(b.verdict.activityLabel)}.</div>
    </a>
    <div style="font:400 15px/1.55 ${SANS};color:${C.sub};margin-top:8px;">${esc(b.verdict.countsLine)}</div>`;

  const story = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${b.story.kind === "mover" && b.story.bandWord ? C.goldBorder : C.border};border-radius:16px;">
      <tr><td style="padding:26px 28px 24px;">${storyBlock(b.story, link)}</td></tr>
    </table>`;

  // Max ONE secondary (the payload enforces it; the renderer trusts the contract).
  const secondary = b.alsoToday[0]
    ? `
    ${eyebrow("Also today")}
    <div style="font:400 16px/1.6 ${SANS};color:${C.sub};">${esc(b.alsoToday[0].text)}
      <a href="${link(b.alsoToday[0].href, "v2_secondary")}" style="font:600 13px/1.35 ${SANS};color:${C.gold};text-decoration:none;white-space:nowrap;">&nbsp;More →</a>
    </div>`
    : "";

  // Founder polish (DBV2-B review): the right cell renders as TWO predictable
  // lines — state word, then detail — instead of one long ragged wrap; the
  // date fragments are nbsp-joined so "since 4 Jul 2026" can never break
  // mid-phrase. The ETF row (a latest-only read) always prints its own as-of
  // date so temporal provenance stays unambiguous — presentation only, the
  // date is the payload's own per-series asOf.
  const noBreak = (s: string) => esc(s).replace(/ /g, "&nbsp;");
  const stateRows = b.states
    .filter((r) => r.available && r.stateLabel)
    .map((r) => {
      const tail = [
        r.detail ? esc(r.detail) : "",
        r.sinceDate && !r.sinceIsSeriesStart ? `since&nbsp;${noBreak(prettyDate(r.sinceDate))}` : "",
        r.id === "etf" && r.asOf ? `as&nbsp;of&nbsp;${noBreak(prettyDate(r.asOf))}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return `<tr>
        <td style="padding:11px 0;border-bottom:1px solid ${C.hair};font:400 14px/1.4 ${SANS};color:${C.dim};white-space:nowrap;vertical-align:top;">${esc(r.label)}</td>
        <td style="padding:11px 0 11px 16px;border-bottom:1px solid ${C.hair};text-align:right;">
          <a href="${link(r.href, `v2_state_${r.id}`)}" style="text-decoration:none;">
            <div style="font:600 15px/1.35 ${SANS};color:${C.ink};">${esc(r.stateLabel ?? "")}</div>
            <div style="font:400 12.5px/1.5 ${SANS};color:${C.faint};margin-top:2px;">${tail}</div>
          </a>
        </td>
      </tr>`;
    })
    .join("");
  const states = `
    ${eyebrow("State of the cycle")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stateRows}</table>`;

  // The dominant, permanent product CTA — every edition, every verdict.
  const cta = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <div style="font:400 14px/1.5 ${SANS};color:${C.dim};margin-bottom:14px;">${esc(b.cta.label)}</div>
      <a href="${link(b.cta.href, "v2_dashboard_cta")}" style="display:inline-block;background:${C.gold};color:#15120a;font:600 15px/1 ${SANS};letter-spacing:.2px;text-decoration:none;padding:17px 30px;border-radius:12px;white-space:nowrap;">${esc(b.cta.sub)}&nbsp;→</a>
    </td></tr></table>`;

  // Footer: the subordinate reply/feedback door, then disclaimer + unsubscribe.
  const footer = `
    <div style="font:400 13px/1.6 ${SANS};color:${C.dim};">${esc(b.feedback.line)}</div>
    <div style="font:400 11px/1.7 ${SANS};color:${C.faint};margin-top:14px;">
      Historical context, not a prediction. Educational analysis — not financial advice, no price targets.<br>
      You're receiving this because you joined the ${esc(SITE_HOST)} daily brief.
      <a href="${forHtmlAttr(unsubUrl)}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>.
    </div>`;

  const rows: string[] = [];
  rows.push(section(verdict, "28px 36px 10px"));
  rows.push(section(story, "18px 36px 8px"));
  if (secondary) rows.push(section(secondary, "18px 36px 6px"));
  rows.push(section(states, "20px 36px 10px"));
  rows.push(section(cta, "26px 36px 22px"));

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(b.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(b.verdict.activityLabel)}. ${esc(b.verdict.countsLine)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.bg};">
      <tr><td style="padding:8px 36px 20px;">${masthead}</td></tr>
      ${rows.join("")}
      <tr><td style="padding:22px 36px 30px;border-top:1px solid ${C.hair};">${footer}</td></tr>
    </table>
  </td></tr>
</table>
${tracking.openPixel}
</body></html>`;
}

// ── Plain-text part — the same hierarchy, no styling ────────────────────────
export function briefEmailV2Text(anchor?: string): string {
  const b = briefIntel(anchor);
  const L: string[] = [];
  L.push(`HALVINGLENS DAILY BRIEF — ${prettyDate(b.asOf)}`);
  L.push("");
  L.push(`THE VERDICT: ${b.verdict.activityLabel}. ${b.verdict.countsLine}`);
  L.push("");
  const s = b.story;
  if (s.kind === "mover") {
    L.push(`${s.bandWord ? "SOMETHING CHANGED" : "THE ONE THAT MOVED"}: ${s.label} — ${s.movement} ${s.periodLabel}${s.bandWord ? ` · ${s.bandWord}` : ""}.`);
    L.push(`${s.meaning}${s.evidence ? ` ${s.evidence}.` : ""}`);
    L.push(`Now ${s.valueLabel}${s.stateWord ? ` · ${s.stateWord}` : ""}${s.thirtyDay ? ` · ${s.thirtyDay}` : ""}.`);
  } else if (s.kind === "state_change") {
    L.push(`A STATE CHANGED: ${s.headline} Current reading: ${s.currentLabel}.`);
  } else if (s.kind === "etf") {
    L.push(`THE STORY IS DEMAND: net ${s.nowLine}${s.changeLine ? `, against the ${s.changeLine}` : ""}.`);
    if (s.contextLine) L.push(s.contextLine);
    if (s.concentrationLine) L.push(s.concentrationLine);
    if (s.asOf) L.push(`Trading-day series · as of ${prettyDate(s.asOf)}`);
  } else if (s.kind === "quiet_duration") {
    L.push(`THE QUIET FINDING: ${s.line}${s.alsoLine ? ` ${s.alsoLine}` : ""}`);
  } else if (s.kind === "quiet_lens") {
    L.push(`THE QUIET FINDING — same point, past cycles: ${s.sentence}`);
  } else {
    L.push(`THE QUIET FINDING: ${s.line}`);
  }
  if (b.alsoToday[0]) {
    L.push("");
    L.push(`ALSO TODAY: ${b.alsoToday[0].text}`);
  }
  L.push("");
  L.push("STATE OF THE CYCLE");
  for (const r of b.states) {
    if (!r.available || !r.stateLabel) continue;
    L.push(`· ${r.label}: ${r.stateLabel} · ${r.detail}${r.sinceDate && !r.sinceIsSeriesStart ? ` · since ${prettyDate(r.sinceDate)}` : ""}${r.id === "etf" && r.asOf ? ` · as of ${prettyDate(r.asOf)}` : ""}`);
  }
  L.push("");
  L.push(`${b.cta.label}: ${b.cta.sub} → ${SITE_URL}${b.cta.href}`);
  L.push("");
  L.push(b.feedback.line);
  L.push("Historical context, not a prediction. Educational analysis, not financial advice.");
  return L.join("\n");
}
