// Executive email render for the Founder Weekly Intelligence Report. Clean,
// light, scannable — an internal dashboard, not the subscriber brand template.

import type { FounderReport, ReportRow, ReportTrend } from "./founderReport";
import type { CompanyRecord, YoYRow } from "./companyHistory";
import { JOURNAL_PROMPTS } from "./companyHistory";
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

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function niceDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
// Since-launch totals: label → big number.
function totalsRows(rows: { label: string; value: number }[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows
    .map((r) => `<tr><td style="padding:7px 0;font:400 14px/1.4 ${SANS};color:${C.sub};">${esc(r.label)}</td><td style="padding:7px 0;font:700 15px/1.4 ${SANS};color:${C.ink};text-align:right;">${r.value.toLocaleString()}</td></tr>`)
    .join("")}</table>`;
}
// All-time records: metric · value · date achieved.
function recordsTable(records: CompanyRecord[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${records
    .map((r) => `<tr>
      <td style="padding:8px 0;font:400 14px/1.4 ${SANS};color:${C.sub};">${esc(r.label)}${r.detail ? `<br><span style="font:400 12px/1.4 ${SANS};color:${C.dim};">${esc(r.detail)}</span>` : ""}</td>
      <td style="padding:8px 0;font:700 14px/1.4 ${SANS};color:${C.ink};text-align:right;white-space:nowrap;vertical-align:top;">${r.value.toLocaleString()}${esc(r.unit)}</td>
      <td style="padding:8px 0 8px 14px;font:400 12px/1.4 ${SANS};color:${C.dim};text-align:right;white-space:nowrap;vertical-align:top;">${esc(niceDate(r.achievedOn))}</td>
    </tr>`)
    .join("")}</table>`;
}
// Year-over-year: this month vs the same month last year, with growth.
function yoyTable(rows: YoYRow[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows
    .map((r) => {
      const g = r.growthPct == null ? "—" : `${r.growthPct >= 0 ? "+" : ""}${r.growthPct.toLocaleString()}%`;
      const col = r.growthPct == null ? C.dim : r.growthPct >= 0 ? C.green : C.red;
      return `<tr>
        <td style="padding:8px 0;font:400 14px/1.4 ${SANS};color:${C.sub};">${esc(r.label)}</td>
        <td style="padding:8px 0;font:600 14px/1.4 ${SANS};color:${C.ink};text-align:right;white-space:nowrap;">${r.now.toLocaleString()}<span style="font-weight:400;color:${C.dim};"> vs ${r.then.toLocaleString()}</span></td>
        <td style="padding:8px 0 8px 14px;font:700 13px/1.4 ${SANS};color:${col};text-align:right;white-space:nowrap;">${esc(g)}</td>
      </tr>`;
    })
    .join("")}</table>`;
}
// Founder reflection: the latest hand-written entry, or a prompt to write one.
function journalBlock(journal: FounderReport["journal"]): string {
  if (journal && Object.values(journal.entry).some((v) => v && String(v).trim())) {
    const items = JOURNAL_PROMPTS.filter((p) => journal.entry[p.key] && String(journal.entry[p.key]).trim())
      .map((p) => `<div style="margin-bottom:12px;"><div style="font:600 12.5px/1.4 ${SANS};color:${C.dim};">${esc(p.prompt)}</div><div style="font:400 14.5px/1.6 ${SANS};color:${C.ink};margin-top:3px;">${esc(String(journal.entry[p.key]))}</div></div>`)
      .join("");
    return `<div style="font:400 12px/1.4 ${SANS};color:${C.dim};margin-bottom:12px;">Entry for ${esc(journal.month)}</div>${items}`;
  }
  return `<div style="font:400 13.5px/1.6 ${SANS};color:${C.sub};">No entry yet this month. Take a moment to record the story behind the numbers:</div><ul style="margin:10px 0 0;padding-left:18px;">${JOURNAL_PROMPTS.map((p) => `<li style="font:400 13.5px/1.7 ${SANS};color:${C.dim};">${esc(p.prompt)}</li>`).join("")}</ul>`;
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

        ${h("Since launch")}
        <div style="font:400 13px/1.5 ${SANS};color:${C.dim};margin-bottom:8px;">Day ${r.sinceLaunch.days.toLocaleString()} of the HalvingLens journey — how far we've come.</div>
        ${totalsRows(r.sinceLaunch.rows)}

        ${r.lastYear ? `${h("This time last year")}
        <div style="font:400 13px/1.5 ${SANS};color:${C.dim};margin-bottom:8px;">${esc(r.lastYear.monthLabel)} vs ${esc(r.lastYear.lastYearLabel)}.</div>
        ${yoyTable(r.lastYear.rows)}` : ""}

        ${r.yoyStory && r.yoyStory.length ? `${h("Year-over-year story")}
        ${list(r.yoyStory)}` : ""}

        ${h("All-time records")}
        ${r.records.length ? recordsTable(r.records) : `<div style="font:400 13.5px/1.6 ${SANS};color:${C.dim};">Records begin accumulating from launch — the first highs appear here as they're set.</div>`}

        ${h("Founder reflection")}
        ${journalBlock(r.journal)}

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
