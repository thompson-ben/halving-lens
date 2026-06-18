// The Daily Bitcoin Cycle Brief, as a clean, mobile-first HTML email. Generated
// from the SAME source of truth as the web brief and content pack — nothing
// here is fabricated or email-only. Table-based, inline styles, light theme for
// inbox readability and deliverability (Morning Brew / Economist register, not
// crypto-influencer). Historical context throughout — no advice, no predictions.

import { buildBrief, emailNewsletter } from "./brief";
import { cycleSummary, cycleScorecard, HEAT_LABEL } from "./cycleSummary";
import { accumulationRead } from "./accumulation";
import { etfStats, ETF } from "./etf";
import { sentimentRead, SENTIMENT_AVAILABLE } from "./sentiment";
import { SITE_URL, SITE_HOST } from "./site";
import { fmtUsd, fmtPct } from "./format";

const CONF: Record<string, string> = { low: "Low", medium: "Medium", high: "High" };

// Colours tuned for a light email background (the site's dark-theme tokens are
// too light to read on white).
const C = {
  bg: "#f4f5f7",
  card: "#ffffff",
  ink: "#1a2230",
  dim: "#6b7480",
  faint: "#9aa3af",
  accent: "#0f766e",
  hair: "#e6e8ec",
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function dailyEmailSubject(): string {
  const s = cycleSummary();
  const b = buildBrief();
  const acc = accumulationRead().band.label.replace("Historically ", "");
  return `Bitcoin Cycle Brief — ${b.date}: ${HEAT_LABEL[s.heat]} risk, Accumulation ${acc}`;
}

// Plain-text part — reuse the existing newsletter body (already includes the
// Accumulation line). Good for clients that prefer text and for deliverability.
export function dailyEmailText(): string {
  return emailNewsletter().body;
}

// Today's four headline signals for the "What changed today" block.
function signalRows(): { label: string; value: string }[] {
  const s = cycleSummary();
  const sc = cycleScorecard();
  const price = `${fmtUsd(s.price)}${s.change24h != null ? ` · ${fmtPct(s.change24h, 1)} 24h` : ""}`;
  const etf = (() => {
    if (!ETF.connected) return "Not connected";
    const wk = etfStats().trailingWeek;
    return `${wk >= 0 ? "+" : "−"}${fmtUsd(Math.abs(wk), { compact: true })} / wk`;
  })();
  const sentiment = (() => {
    if (!SENTIMENT_AVAILABLE) return "—";
    const sr = sentimentRead();
    return sr ? `${sr.band.label} (${sr.value})` : "—";
  })();
  return [
    { label: "Price", value: price },
    { label: "ETF flows", value: etf },
    { label: "Sentiment", value: sentiment },
    { label: "Cycle score", value: `${sc.overall}/100 · ${sc.overallLabel}` },
  ];
}

export function dailyEmailHtml(unsubUrl: string): string {
  const b = buildBrief();
  const s = cycleSummary();
  const acc = accumulationRead();
  const pct = acc.historicalPercentile;
  const cheaper = 100 - pct;

  const read = [
    { label: "Phase", value: s.phaseLabel },
    { label: "Risk", value: HEAT_LABEL[s.heat] },
    { label: "Confidence", value: CONF[s.confidence] ?? s.confidence },
  ];

  const elevated = s.watchSignals.filter((w) => w.level !== "calm");
  const watch = (elevated.length ? elevated : s.watchSignals).slice(0, 3);

  const cell = (label: string, value: string) => `
    <td style="padding:0 6px;vertical-align:top;width:33.33%;">
      <div style="font:600 10px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${C.faint};">${esc(label)}</div>
      <div style="font:600 16px/1.3 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.ink};margin-top:4px;">${esc(value)}</div>
    </td>`;

  const signalRow = (label: string, value: string) => `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${C.hair};font:400 14px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.dim};">${esc(label)}</td>
      <td style="padding:11px 0;border-bottom:1px solid ${C.hair};font:600 14px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.ink};text-align:right;">${esc(value)}</td>
    </tr>`;

  const watchRow = (signal: string, status: string) => `
    <tr>
      <td style="padding:10px 0;vertical-align:top;width:10px;">
        <div style="width:7px;height:7px;border-radius:4px;background:${C.accent};margin-top:6px;"></div>
      </td>
      <td style="padding:10px 0 10px 10px;">
        <div style="font:600 14px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.ink};">${esc(signal)}</div>
        <div style="font:400 13px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.dim};margin-top:2px;">${esc(status)}</div>
      </td>
    </tr>`;

  const sectionTitle = (t: string) =>
    `<div style="font:600 11px/1.4 -apple-system,Segoe UI,Roboto,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:${C.accent};margin:0 0 12px;">${esc(t)}</div>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(dailyEmailSubject())}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(s.summary)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">

      <!-- Masthead -->
      <tr><td style="padding:4px 8px 16px;">
        <table role="presentation" width="100%"><tr>
          <td style="font:700 17px/1 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.ink};">
            <span style="color:${C.accent};">●</span> halvinglens.com
          </td>
          <td style="text-align:right;font:400 13px/1 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.dim};">${esc(b.date)}</td>
        </tr></table>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:${C.card};border:1px solid ${C.hair};border-radius:14px;padding:28px 26px;">

        <h1 style="font:700 22px/1.25 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.ink};margin:0 0 22px;">${esc(b.headline)}</h1>

        <!-- 1. Today's cycle read -->
        ${sectionTitle("Today's cycle read")}
        <table role="presentation" width="100%" style="margin:0 -6px 8px;"><tr>${read.map((r) => cell(r.label, r.value)).join("")}</tr></table>

        <div style="height:1px;background:${C.hair};margin:24px 0;"></div>

        <!-- 2. What changed today -->
        ${sectionTitle("What changed today")}
        <table role="presentation" width="100%">${signalRows().map((r) => signalRow(r.label, r.value)).join("")}</table>

        <div style="height:1px;background:${C.hair};margin:24px 0;"></div>

        <!-- 3. Accumulation Index -->
        ${sectionTitle("Accumulation Index")}
        <table role="presentation" width="100%"><tr>
          <td style="vertical-align:middle;width:96px;">
            <div style="font:700 46px/1 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.accent};">${acc.score}<span style="font-size:18px;color:${C.faint};">/100</span></div>
          </td>
          <td style="vertical-align:middle;padding-left:12px;">
            <div style="font:600 16px/1.3 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.ink};"><span style="color:${acc.band.color};">●</span> ${esc(acc.band.label)}</div>
            <div style="font:400 13px/1.45 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.dim};margin-top:4px;">${pct}th percentile of Bitcoin history — only ${cheaper}% of weeks have been cheaper.</div>
          </td>
        </tr></table>
        <div style="font:400 13px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.dim};margin-top:12px;">Historically, conditions like this have preceded stronger long-term outcomes than average — historical context, not a prediction.</div>

        <div style="height:1px;background:${C.hair};margin:24px 0;"></div>

        <!-- 4. What to watch next -->
        ${sectionTitle("What to watch next")}
        <table role="presentation" width="100%">${watch.map((w) => watchRow(w.signal, w.status)).join("")}</table>

        <!-- 5. CTA -->
        <table role="presentation" width="100%" style="margin-top:26px;"><tr><td align="center">
          <a href="${SITE_URL}/brief" style="display:inline-block;background:${C.accent};color:#ffffff;font:600 14px/1 -apple-system,Segoe UI,Roboto,Arial,sans-serif;text-decoration:none;padding:13px 26px;border-radius:10px;">Read the full analysis on ${SITE_HOST} →</a>
        </td></tr></table>

      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:20px 12px 8px;">
        <div style="font:400 11px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:${C.faint};">
          Historical cycle behaviour is not a forecast. This is educational analysis, not financial advice.<br>
          You're receiving this because you joined the ${SITE_HOST} daily brief.
          <a href="${unsubUrl}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}
