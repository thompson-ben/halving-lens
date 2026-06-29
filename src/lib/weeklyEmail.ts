// HalvingLens Weekly Research — the Sunday email. A premium, concise teaser to
// the full /weekly report, in the same dark/gold register as the daily brief.
// Built from the frozen weekly report so the email matches what's published.

import type { WeeklyReport } from "./weekly";
import { SITE_URL, SITE_HOST, absoluteUrl } from "./site";

const C = {
  bg: "#0a0c10",
  card: "#14171e",
  cardHi: "#171b24",
  border: "#23272f",
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

export function weeklyEmailSubject(w: WeeklyReport): string {
  return `Weekly Research — ${w.biggestStory.title}`;
}

export function weeklyEmailText(w: WeeklyReport): string {
  return [
    `HALVINGLENS WEEKLY RESEARCH — ${w.weekLabel}`,
    "",
    w.biggestStory.title,
    "",
    "The week in 30 seconds:",
    ...w.executiveSummary.map((b) => `• ${b}`),
    "",
    w.biggestStory.body,
    "",
    `Read the full weekly: ${SITE_URL}/weekly/${w.slug}`,
    "",
    "Historical context, not a prediction. Not financial advice.",
  ].join("\n");
}

function eyebrow(t: string): string {
  return `<div style="font:600 11px/1.4 ${SANS};letter-spacing:.22em;text-transform:uppercase;color:${C.gold};margin:0 0 14px;">${esc(t)}</div>`;
}

export function weeklyEmailHtml(w: WeeklyReport, unsubUrl: string): string {
  const chartUrl = absoluteUrl(`/email/chart?d=${encodeURIComponent(w.generatedAt)}`);
  const bullets = w.executiveSummary
    .map((b) => `<tr><td style="padding:5px 0;font:400 15px/1.55 ${SANS};color:${C.sub};"><span style="color:${C.gold};">—</span>&nbsp; ${esc(b)}</td></tr>`)
    .join("");
  const watch = w.weekAhead
    .slice(0, 3)
    .map((x, i) => `<tr><td width="34" style="vertical-align:top;padding:8px 0;font:600 15px/1 ${SERIF};color:${C.gold};">0${i + 1}</td><td style="padding:8px 0;font:400 14px/1.5 ${SANS};color:${C.sub};">${esc(x)}</td></tr>`)
    .join("");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><title>${esc(weeklyEmailSubject(w))}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(w.biggestStory.title)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:30px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.bg};">

      <tr><td style="padding:8px 36px 22px;">
        <table role="presentation" width="100%"><tr>
          <td style="font:700 15px/1 ${SANS};letter-spacing:.24em;text-transform:uppercase;color:${C.ink};"><span style="color:${C.gold};">◆</span>&nbsp; HalvingLens Weekly</td>
          <td style="text-align:right;font:400 12px/1 ${SANS};color:${C.dim};">Weekly #${w.edition}</td>
        </tr></table>
        <div style="font:400 13px/1.4 ${SERIF};color:${C.faint};margin-top:8px;">${esc(w.weekLabel)}</div>
      </td></tr>

      <tr><td style="padding:6px 36px 18px;">
        <div style="font:500 30px/1.25 ${SERIF};color:${C.ink};letter-spacing:-.3px;">${esc(w.biggestStory.title)}</div>
      </td></tr>

      <tr><td style="padding:6px 36px 22px;">
        ${eyebrow("The week in 30 seconds")}
        <table role="presentation" width="100%">${bullets}</table>
      </td></tr>

      <tr><td style="padding:6px 36px 22px;">
        ${eyebrow("Chart of the week")}
        <img src="${chartUrl}" width="528" alt="HalvingLens — chart of the week" style="width:100%;height:auto;border-radius:14px;display:block;border:1px solid ${C.border};" />
      </td></tr>

      <tr><td style="padding:6px 36px 22px;">
        ${eyebrow("Research Desk")}
        <div style="font:400 16px/1.65 ${SERIF};color:${C.sub};">${esc(w.biggestStory.body)}</div>
      </td></tr>

      <tr><td style="padding:6px 36px 22px;">
        ${eyebrow("The week ahead")}
        <table role="presentation" width="100%">${watch}</table>
      </td></tr>

      <tr><td style="padding:14px 36px 30px;" align="center">
        <a href="${SITE_URL}/weekly/${w.slug}" style="display:inline-block;background:${C.gold};color:#15120a;font:600 15px/1 ${SANS};text-decoration:none;padding:16px 36px;border-radius:12px;">Read the full weekly →</a>
      </td></tr>

      <tr><td style="padding:22px 36px 30px;border-top:1px solid ${C.hair};">
        <div style="font:500 13px/1.5 ${SERIF};color:${C.sub};">The clearest view of the Bitcoin cycle.</div>
        <div style="font:400 11px/1.7 ${SANS};color:${C.faint};margin-top:12px;">
          Historical context, not a prediction. Educational analysis — not financial advice, no price targets.<br>
          You're receiving this because you joined the ${SITE_HOST} research list.
          <a href="${unsubUrl}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}
