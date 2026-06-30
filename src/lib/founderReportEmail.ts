// Executive email render for the Founder Weekly Intelligence Report. Clean,
// light, scannable — an internal dashboard, not the subscriber brand template.

import type { FounderReport, ReportRow, ReportTrend } from "./founderReport";
import { SITE_URL } from "./site";

const C = { bg: "#f4f5f7", card: "#ffffff", ink: "#16181d", sub: "#454a53", dim: "#787e88", hair: "#e7e9ed", accent: "#1f6feb", green: "#1a8f5e", red: "#c0392b" };
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function founderReportSubject(r: FounderReport): string {
  const flag = r.health.overall === "red" ? "🔴 " : r.health.overall === "amber" ? "🟡 " : "";
  return `${flag}HalvingLens Intelligence — ${r.weekLabel.split(" (")[0]}`;
}

function h(t: string): string {
  return `<div style="font:700 12px/1.4 ${SANS};letter-spacing:.12em;text-transform:uppercase;color:${C.dim};margin:28px 0 12px;border-bottom:1px solid ${C.hair};padding-bottom:8px;">${esc(t)}</div>`;
}
function rows(items: ReportRow[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${items
    .map(
      (r) => `<tr>
      <td style="padding:7px 0;font:400 14px/1.4 ${SANS};color:${C.sub};">${esc(r.label)}</td>
      <td style="padding:7px 0;font:600 14px/1.4 ${SANS};color:${C.ink};text-align:right;white-space:nowrap;">${esc(r.value)}${r.sub ? `<span style="font-weight:400;color:${C.dim};"> · ${esc(r.sub)}</span>` : ""}</td>
    </tr>`,
    )
    .join("")}</table>`;
}
function list(items: string[], ordered = false): string {
  const tag = ordered ? "ol" : "ul";
  return `<${tag} style="margin:0;padding-left:18px;">${items.map((x) => `<li style="font:400 14.5px/1.6 ${SANS};color:${C.sub};margin-bottom:7px;">${esc(x)}</li>`).join("")}</${tag}>`;
}
function trendRow(t: ReportTrend): string {
  const a = t.dir === "up" ? "↑" : t.dir === "down" ? "↓" : "→";
  const col = t.dir === "up" ? C.green : t.dir === "down" ? C.red : C.dim;
  return `<td style="padding:10px 6px;text-align:center;font:400 13px/1.3 ${SANS};color:${C.sub};border:1px solid ${C.hair};">${esc(t.label)}<br><span style="font-size:22px;font-weight:700;color:${col};">${a}</span></td>`;
}

export function founderReportHtml(r: FounderReport): string {
  const ragColor = r.health.overall === "red" ? C.red : r.health.overall === "amber" ? "#b8860b" : C.green;
  const ragDot = r.health.overall === "red" ? "🔴" : r.health.overall === "amber" ? "🟡" : "🟢";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(founderReportSubject(r))}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:26px 12px;">
  <tr><td align="center">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;background:${C.card};border:1px solid ${C.hair};border-radius:14px;">
      <tr><td style="padding:30px 34px;">

        <div style="font:700 13px/1.3 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.ink};">HalvingLens · Weekly Intelligence</div>
        <div style="font:400 13px/1.4 ${SANS};color:${C.dim};margin-top:6px;">${esc(r.weekLabel)} · founder only</div>

        ${h("Executive summary")}
        ${list(r.executive)}

        ${h("Growth")}
        ${rows(r.growth)}

        ${h("Marketing")}
        ${rows(r.marketing)}

        ${h("Content")}
        ${rows(r.content)}

        ${h("Behaviour")}
        ${rows(r.behaviour)}

        ${h("Research engine")}
        ${rows(r.research)}

        ${h("Marketing health")}
        <div style="font:600 16px/1.3 ${SANS};color:${ragColor};">${ragDot} ${esc(r.health.overallLabel)} · ${r.health.score}/10</div>
        ${r.health.failing.length ? `<div style="font:400 13px/1.6 ${SANS};color:${C.sub};margin-top:8px;">Needs attention: ${r.health.failing.map((f) => `${esc(f.system)} — ${esc(f.detail)}`).join("; ")}.</div>` : `<div style="font:400 13px/1.5 ${SANS};color:${C.dim};margin-top:8px;">All systems healthy.</div>`}

        ${h("AI insights")}
        ${list(r.insights)}

        ${h("Recommendations")}
        ${list(r.recommendations, true)}

        ${h("Long-term trends")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>${r.trends.map(trendRow).join("")}</tr></table>

        <div style="margin-top:30px;border-top:1px solid ${C.hair};padding-top:16px;font:400 12px/1.6 ${SANS};color:${C.dim};">
          Generated automatically from first-party analytics. <a href="${SITE_URL}/admin/growth" style="color:${C.accent};text-decoration:none;">Open the live dashboard →</a><br>
          Internal report — historical context, not advice. Not for distribution.
        </div>

      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}
