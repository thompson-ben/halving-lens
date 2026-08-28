// Daily Brief v2 — the edition email renderer (PR1).
//
// PRESENTATION ONLY over the briefEdition payload. The approved hierarchy
// is fixed:
//
//   MASTHEAD (+ honest BTC price & true snapshot-to-snapshot 24h move)
//   → SYNTHESIS / VERDICT
//   → HERO development (whole card clickable)
//   → up to THREE supporting developments (TWO on a major transition;
//     whole cards clickable; none rendered on quiet days)
//   → STATE OF THE CYCLE (whole table clickable)
//   → ONE visually dominant CTA
//   → subordinate feedback + compliance footer.
//
// FIRST-PARTY ATTRIBUTION CONTRACT (authoritative, §5): email links ride
// the existing signed click tracker with EXACTLY these CTA labels —
// primary-cta · hero-card · supporting-{signal} · state-table — mirroring
// the approved utm_content vocabulary. No UTMs in email. No secondary
// "Explore X →" links: nothing competes with the single primary CTA.
// Plain-English interpretation leads; technical evidence supports it. The
// information gap that earns the click is deeper context on the Dashboard,
// never a withheld commodity fact.

import { briefEdition, type BriefEdition } from "./briefEdition";
import type { Development } from "./briefSignificance";
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
const fmtUsd = (n: number): string => `$${Math.round(n).toLocaleString("en-US")}`;
const fmtPct = (n: number): string => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;

function section(inner: string, pad = "26px 36px"): string {
  return `<tr><td style="padding:${pad};">${inner}</td></tr>`;
}
function eyebrow(t: string): string {
  return `<div style="font:600 11px/1.4 ${SANS};letter-spacing:.24em;text-transform:uppercase;color:${C.gold};margin:0 0 12px;">${esc(t)}</div>`;
}

const RANK_EYEBROW: Record<Development["kind"], string> = {
  state_transition: "A state changed",
  historical_extreme: "A top-5% move for its own record",
  streak_record: "A streak extended",
  divergence: "A tension formed",
};

// ── Development cards (whole card = one tracked link, no inner links) ──────

function developmentCard(d: Development, link: (path: string, label: string) => string, opts: { hero: boolean; major: boolean }): string {
  const label = opts.hero ? "hero-card" : `supporting-${d.metricId}`;
  const headSize = opts.hero ? (opts.major ? 30 : 26) : 18;
  const evidence = d.evidence
    .map(
      (e) =>
        `<div style="font:400 ${opts.hero ? 15 : 13.5}px/1.55 ${SANS};color:${opts.hero ? C.sub : C.dim};margin-top:${opts.hero ? 10 : 6}px;">${esc(e)}</div>`,
    )
    .join("");
  return `
  <a href="${link(d.href, label)}" style="text-decoration:none;display:block;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${opts.hero ? C.cardHi : C.card};border:1px solid ${opts.hero && opts.major ? C.goldBorder : C.border};border-radius:16px;">
      <tr><td style="padding:${opts.hero ? "24px 28px 22px" : "16px 20px 14px"};">
        ${opts.hero ? eyebrow(RANK_EYEBROW[d.kind]) : ""}
        <div style="font:500 ${headSize}px/1.3 ${SERIF};color:${C.ink};">${esc(d.headline)}${/[.!?]$/.test(d.headline) ? "" : "."}</div>
        ${evidence}
        <div style="font:400 12px/1.5 ${SANS};color:${C.faint};margin-top:${opts.hero ? 10 : 6}px;">Window: ${esc(d.windowLabel)} · as of ${esc(prettyDate(d.asOf))}</div>
      </td></tr>
    </table>
  </a>`;
}

// ── The email (pure over a payload — day-type fixtures render directly) ────

export function briefEditionEmailHtmlFor(b: BriefEdition, unsubUrl: string, tracking: EmailTracking = NO_EMAIL_TRACKING): string {
  const link = (path: string, label: string) => tracking.link(`${SITE_URL}${path}`, label);
  const major = b.dayType === "major_transition";

  const priceLine = b.price
    ? `BTC ${fmtUsd(b.price.value)}${
        b.price.changePct != null ? ` · ${fmtPct(b.price.changePct)} ${b.price.windowLabel ?? ""}` : ""
      }`
    : null;

  const masthead = `
    <table role="presentation" width="100%"><tr>
      <td style="font:700 15px/1 ${SANS};letter-spacing:.26em;text-transform:uppercase;color:${C.ink};">
        <span style="color:${C.gold};">◆</span>&nbsp; HalvingLens
      </td>
      <td style="text-align:right;font:400 12px/1 ${SANS};color:${C.dim};">Daily Brief · ${esc(prettyDate(b.asOf))}</td>
    </tr></table>
    ${priceLine ? `<div style="font:500 13px/1.5 ${SANS};color:${C.sub};margin-top:10px;">${esc(priceLine)}</div>` : ""}`;

  const verdict = `
    ${eyebrow("The verdict")}
    <div style="font:500 ${major ? 30 : 27}px/1.3 ${SERIF};color:${C.ink};letter-spacing:-.3px;">${esc(b.verdictLine)}</div>
    <div style="font:400 14px/1.55 ${SANS};color:${C.dim};margin-top:8px;">${esc(b.countsLine)}</div>`;

  const rows: string[] = [];
  rows.push(section(verdict, "26px 36px 8px"));

  if (b.hero) {
    rows.push(section(developmentCard(b.hero, link, { hero: true, major }), "16px 36px 6px"));
    if (b.supporting.length > 0) {
      const cards = b.supporting.map((d) => developmentCard(d, link, { hero: false, major })).join(`<div style="height:10px;line-height:10px;">&nbsp;</div>`);
      rows.push(section(`${eyebrow("Also today")}${cards}`, "16px 36px 6px"));
    }
  } else if (b.quiet) {
    rows.push(
      section(
        `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.border};border-radius:16px;">
        <tr><td style="padding:20px 24px 18px;">
          <div style="font:500 20px/1.45 ${SERIF};color:${C.ink};">${esc(b.quiet.line)}</div>
          <div style="font:400 14.5px/1.6 ${SANS};color:${C.dim};margin-top:10px;">${esc(b.quiet.whyItMatters)}</div>
        </td></tr>
      </table>`,
        "14px 36px 6px",
      ),
    );
  }

  // State of the Cycle — the whole table is ONE tracked link (state-table).
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
        <td style="padding:10px 0;border-bottom:1px solid ${C.hair};font:400 14px/1.4 ${SANS};color:${C.dim};white-space:nowrap;vertical-align:top;">${esc(r.label)}</td>
        <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${C.hair};text-align:right;">
          <div style="font:600 15px/1.35 ${SANS};color:${C.ink};">${esc(r.stateLabel ?? "")}</div>
          <div style="font:400 12.5px/1.5 ${SANS};color:${C.faint};margin-top:2px;">${tail}</div>
        </td>
      </tr>`;
    })
    .join("");
  rows.push(
    section(
      `${eyebrow("State of the cycle")}
      <a href="${link("/cycle-dashboard#dashboard-state-strip", "state-table")}" style="text-decoration:none;display:block;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${stateRows}</table>
      </a>`,
      "18px 36px 8px",
    ),
  );

  // The ONE dominant, day-contextual CTA.
  rows.push(
    section(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
        <a href="${link(b.cta.href, "primary-cta")}" style="display:inline-block;background:${C.gold};color:#15120a;font:600 15px/1 ${SANS};letter-spacing:.2px;text-decoration:none;padding:17px 30px;border-radius:12px;white-space:nowrap;">${esc(b.cta.label)}&nbsp;→</a>
      </td></tr></table>`,
      "22px 36px 20px",
    ),
  );

  const footer = `
    <div style="font:400 13px/1.6 ${SANS};color:${C.dim};">${esc(b.feedback.line)}</div>
    <div style="font:400 11px/1.7 ${SANS};color:${C.faint};margin-top:14px;">
      Historical context, not a prediction. Educational analysis — not financial advice, no price targets.<br>
      You're receiving this because you joined the ${esc(SITE_HOST)} daily brief.
      <a href="${forHtmlAttr(unsubUrl)}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>.
    </div>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(b.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(b.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:28px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.bg};">
      <tr><td style="padding:8px 36px 18px;">${masthead}</td></tr>
      ${rows.join("")}
      <tr><td style="padding:20px 36px 30px;border-top:1px solid ${C.hair};">${footer}</td></tr>
    </table>
  </td></tr>
</table>
${tracking.openPixel}
</body></html>`;
}

// ── Plain-text part — the same hierarchy, no styling ────────────────────────

export function briefEditionTextFor(b: BriefEdition): string {
  const L: string[] = [];
  L.push(`HALVINGLENS DAILY BRIEF — ${prettyDate(b.asOf)}`);
  if (b.price) {
    L.push(
      `BTC ${fmtUsd(b.price.value)}${b.price.changePct != null ? ` · ${fmtPct(b.price.changePct)} ${b.price.windowLabel ?? ""}` : ""}`,
    );
  }
  L.push("");
  L.push(`THE VERDICT: ${b.verdictLine}`);
  L.push(b.countsLine);
  L.push("");
  if (b.hero) {
    L.push(`${RANK_EYEBROW[b.hero.kind].toUpperCase()}: ${b.hero.headline}.`);
    for (const e of b.hero.evidence) L.push(e);
    L.push(`Window: ${b.hero.windowLabel} · as of ${prettyDate(b.hero.asOf)}`);
    for (const d of b.supporting) {
      L.push("");
      L.push(`ALSO TODAY: ${d.headline}. (${d.windowLabel} · as of ${prettyDate(d.asOf)})`);
    }
  } else if (b.quiet) {
    L.push(`A QUIET DAY: ${b.quiet.line}`);
    L.push(b.quiet.whyItMatters);
  }
  L.push("");
  L.push("STATE OF THE CYCLE");
  for (const r of b.states) {
    if (!r.available || !r.stateLabel) continue;
    L.push(
      `· ${r.label}: ${r.stateLabel}${r.detail ? ` · ${r.detail}` : ""}${r.sinceDate && !r.sinceIsSeriesStart ? ` · since ${prettyDate(r.sinceDate)}` : ""}${r.id === "etf" && r.asOf ? ` · as of ${prettyDate(r.asOf)}` : ""}`,
    );
  }
  L.push("");
  L.push(`${b.cta.label} → ${SITE_URL}${b.cta.href}`);
  L.push("");
  L.push(b.feedback.line);
  L.push("Historical context, not a prediction. Educational analysis, not financial advice.");
  return L.join("\n");
}

// ── Live wrappers (the send/persist surface) ────────────────────────────────

export function briefEditionSubject(anchor?: string): string {
  return briefEdition(anchor).subject;
}
export function briefEditionEmailHtml(unsubUrl: string, tracking: EmailTracking = NO_EMAIL_TRACKING, anchor?: string): string {
  return briefEditionEmailHtmlFor(briefEdition(anchor), unsubUrl, tracking);
}
export function briefEditionText(anchor?: string): string {
  return briefEditionTextFor(briefEdition(anchor));
}
