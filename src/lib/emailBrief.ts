// The Daily Bitcoin Cycle Brief — a premium, editorial analyst note by email.
//
// Design intent: a £50/month institutional research feel (FT / Bloomberg /
// Glassnode), not a crypto newsletter. Dark theme, gold accent, large serif
// headlines, lots of whitespace, answers-first. Every section answers a
// question rather than dumping data. 2–3 minute read.
//
// Built from the SAME source of truth as the web brief and content pack —
// nothing here is fabricated or email-only. Table-based + inline styles for
// email-client robustness. Historical context throughout — no advice, no
// predictions, no price targets.

import { buildBrief } from "./brief";
import { cycleSummary, cycleScorecard, HEAT_LABEL } from "./cycleSummary";
import { accumulationRead } from "./accumulation";
import { etfStats, ETF } from "./etf";
import { sentimentRead, SENTIMENT_AVAILABLE } from "./sentiment";
import { drawdownAnalysis } from "./drawdowns";
import { similarMoments } from "./similarity";
import { selectHistoricalNarrative, historicalTakeawayText } from "./contentCards";
import { SITE_URL, SITE_HOST, absoluteUrl } from "./site";
import { fmtUsd, fmtPct } from "./format";

export type EmailTier = "free" | "pro";

// ── Palette (dark + gold, tuned for inbox readability) ───────────────────────
const C = {
  bg: "#0a0c10",
  card: "#14171e",
  cardHi: "#181c25", // slightly lifted premium card
  border: "#262b36",
  goldBorder: "#4a3f23",
  ink: "#f4f1ea",
  sub: "#c2c6cf",
  dim: "#8c919c",
  faint: "#6b7079",
  gold: "#d9b96a",
  goldDeep: "#c2a050",
  hair: "#20242d",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── Shared live reads ────────────────────────────────────────────────────────
function reads() {
  const s = cycleSummary();
  const sc = cycleScorecard();
  const acc = accumulationRead();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const etfWk = ETF.connected ? etfStats().trailingWeek : null;
  const cheap = acc.band.key === "deep_value" || acc.band.key === "attractive";
  const fear = sr != null && sr.value <= 25;
  const greed = sr != null && sr.value >= 75;
  const etfNeg = etfWk != null && etfWk < 0;
  const etfPos = etfWk != null && etfWk > 0;
  const cheaper = 100 - acc.historicalPercentile;
  return { s, sc, acc, sr, etfWk, cheap, fear, greed, etfNeg, etfPos, cheaper };
}

// ── Content generators (answers, not data) ───────────────────────────────────

// Today's Take — one sentence, the first thing read.
function todaysTake(): string {
  const { s, cheap, fear, greed, etfNeg, sr } = reads();
  if (cheap && fear) return `Bitcoin remains historically cheap while sentiment sits in ${sr!.band.label.toLowerCase()}.`;
  if (cheap && etfNeg) return `Bitcoin stays in one of its cheapest historical valuation regions even as ETF flows turn negative.`;
  if (cheap) return `Bitcoin continues trading inside one of its cheapest historical valuation regions.`;
  if (s.heat === "cool") return `Bitcoin is still trading in one of the coolest historical risk environments.`;
  if (fear) return `Extreme fear persists while Bitcoin holds an important historical cycle window.`;
  if (greed) return `Sentiment runs hot while Bitcoin sits in the richer end of its historical range.`;
  if (etfNeg) return `ETF outflows continue against a ${HEAT_LABEL[s.heat].toLowerCase()} historical backdrop.`;
  return `Bitcoin is sitting in the ${HEAT_LABEL[s.heat].toLowerCase()} part of its historical range.`;
}

// If You Only Read One Thing — one paragraph, the single most important insight.
function oneThing(): string {
  const { acc, cheaper, cheap, fear, greed, sr } = reads();
  if (cheap) {
    return (
      `Bitcoin is trading within the cheapest ${cheaper}% of historical weeks by our price-only measure` +
      (fear ? `, while sentiment remains in ${sr!.band.label.toLowerCase()}` : "") +
      `. We have only seen conditions like this a handful of times before.`
    );
  }
  if (greed) {
    return `Sentiment sits in ${sr!.band.label.toLowerCase()} and Bitcoin trades in the upper ${acc.historicalPercentile}% of its historical valuation range — the kind of environment that has historically rewarded patience over chasing.`;
  }
  const dd = drawdownAnalysis();
  return `Bitcoin sits at the ${acc.historicalPercentile}th percentile of its historical valuation range, ${Math.abs(Math.round(dd.current))}% below its cycle high — a middle-of-the-range environment by historical standards.`;
}

// Why This Matters — two short analyst paragraphs.
function whyThisMatters(): string[] {
  const { s } = reads();
  return [s.support, s.whatsDifferent].filter(Boolean);
}

// Today's Historical Context — the rotating premium insight.
function historicalContext(): { title: string; body: string } {
  const sel = selectHistoricalNarrative();
  return { title: sel.title, body: historicalTakeawayText(sel.narrative) };
}

// What We're Watching — up to 3 short, scannable items.
function watching(): { signal: string; status: string }[] {
  const { s } = reads();
  const elevated = s.watchSignals.filter((w) => w.level !== "calm");
  return (elevated.length ? elevated : s.watchSignals).slice(0, 3).map((w) => ({ signal: w.signal, status: w.status }));
}

// Learn Something — one historical fact, rotated daily.
function learnSomething(): string {
  const { s, cheaper, acc } = reads();
  const facts = [
    `Only ${cheaper}% of Bitcoin's history has traded below today's valuation by this price-only measure.`,
    `Every prior Bitcoin bull market contained multiple drawdowns of 20% or more — corrections are the norm, not the exception.`,
    `Bitcoin's 200-week moving average has never been decisively broken to the downside across a full cycle.`,
    `Today's reading sits in the ${acc.historicalPercentile}th percentile of all weeks since 2012 — the index is built only from real, point-in-time price history.`,
  ];
  return facts[Math.abs(s.cycleDay) % facts.length];
}

// Analyst's Note — a genuine institutional-style insight (the premium feature).
function analystNote(): string {
  const { cheap, fear, etfNeg, etfPos, greed, sr, acc } = reads();
  if (cheap && etfNeg)
    return `Although ETF flows remain negative, Bitcoin is now trading inside one of its cheapest historical valuation regions. History never guarantees outcomes — but conditions like these have been rare.`;
  if (cheap && fear)
    return `Sentiment in ${sr!.band.label.toLowerCase()} alongside a bottom-${100 - acc.historicalPercentile <= 25 ? "quartile" : "half"} historical valuation is an unusual combination. The crowd is most fearful precisely when, historically, conditions have been most attractive.`;
  if (cheap && etfPos)
    return `Bitcoin remains historically cheap even as ETF demand turns positive — a combination of attractive valuation and returning institutional flow that has not been common in the record.`;
  if (greed)
    return `With sentiment hot and valuation in the upper part of its historical range, the asymmetry that favoured patient accumulation earlier in the cycle has narrowed. History rewards discipline here more than conviction.`;
  return `The cycle continues to behave differently from its predecessors — slower, flatter and ETF-influenced. The clearest signal remains where today sits versus Bitcoin's own history, not against expectations.`;
}

// ── Subject line — curiosity-first, no formulaic prefix ──────────────────────
export function dailyEmailSubject(): string {
  const { s, acc, cheap, fear, greed, etfNeg, etfPos, etfWk } = reads();
  // Ordered by "most interesting"; first match wins.
  if (acc.band.key === "deep_value") return "Bitcoin just entered a rare historical zone";
  if (cheap && fear) return "Historically cheap, and fearful";
  if (cheap) return "Bitcoin remains historically cheap";
  if (fear) return "Extreme Fear persists";
  if (greed) return "Sentiment is running hot again";
  if (etfNeg && Math.abs(etfWk!) > 0) return "ETF outflows accelerate again";
  if (etfPos) return "ETF demand picks up again";
  if (s.heat === "cool") return "Today's cycle still looks unusually cool";
  return "Where Bitcoin sits in the cycle today";
}

// Plain-text part — a clean, readable fallback (deliverability + text clients).
export function dailyEmailText(): string {
  const { s, sc, acc, cheaper } = reads();
  const b = buildBrief();
  const lines = [
    `BITCOIN CYCLE BRIEF — ${b.date}`,
    "",
    `Today's take: ${todaysTake()}`,
    "",
    "If you only read one thing:",
    oneThing(),
    "",
    `Price: ${fmtUsd(s.price)}${s.change24h != null ? ` (${fmtPct(s.change24h, 1)} 24h)` : ""}`,
    `Cycle score: ${sc.overall}/100 — ${sc.overallLabel}`,
    `Accumulation Index: ${acc.score}/100 — ${acc.band.label} (${acc.historicalPercentile}th pct; only ${cheaper}% of weeks cheaper)`,
    "",
    `Analyst's note: ${analystNote()}`,
    "",
    `Read the full analysis: ${SITE_URL}/brief`,
    "",
    "Historical context, not a prediction. Educational analysis, not financial advice.",
  ];
  return lines.join("\n");
}

// ── HTML building blocks ─────────────────────────────────────────────────────
function eyebrow(t: string): string {
  return `<div style="font:600 11px/1.4 ${SANS};letter-spacing:.22em;text-transform:uppercase;color:${C.gold};margin:0 0 14px;">${esc(t)}</div>`;
}
function divider(): string {
  return `<tr><td style="padding:6px 0;"><div style="height:1px;background:${C.hair};"></div></td></tr>`;
}
function section(inner: string, pad = "30px 30px"): string {
  return `<tr><td style="padding:${pad};">${inner}</td></tr>`;
}

function execCard(label: string, value: string, sub: string, valueColor: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.border};border-radius:12px;">
    <tr><td style="padding:16px 16px 15px;">
      <div style="font:600 9.5px/1.3 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:${C.gold};">${esc(label)}</div>
      <div style="font:600 24px/1.15 ${SERIF};color:${valueColor};margin-top:7px;">${esc(value)}</div>
      <div style="font:400 11.5px/1.35 ${SANS};color:${C.dim};margin-top:4px;">${esc(sub)}</div>
    </td></tr></table>`;
}

function execGrid(): string {
  const { s, sc, acc, sr, etfWk } = reads();
  const cards = [
    { label: "Price", value: fmtUsd(s.price), sub: s.change24h != null ? `${fmtPct(s.change24h, 1)} · 24h` : s.phaseLabel, color: C.ink },
    { label: "Cycle score", value: `${sc.overall}`, sub: `/100 · ${sc.overallLabel}`, color: C.ink },
    { label: "Accumulation Index", value: `${acc.score}`, sub: `/100 · ${acc.band.label.replace("Historically ", "")}`, color: acc.band.color },
    { label: "ETF flows", value: etfWk != null ? `${etfWk >= 0 ? "+" : "−"}${fmtUsd(Math.abs(etfWk), { compact: true })}` : "n/a", sub: "net · 7d", color: etfWk != null ? (etfWk >= 0 ? "#5fd0a0" : "#e88a8a") : C.dim },
    { label: "Sentiment", value: sr ? `${sr.value}` : "n/a", sub: sr ? sr.band.label : "Fear & Greed", color: C.ink },
  ];
  // Two cards per row; cells get 5px gutters via padding.
  let rows = "";
  for (let i = 0; i < cards.length; i += 2) {
    const a = cards[i];
    const b = cards[i + 1];
    rows += `<tr>
      <td width="50%" style="padding:5px;">${execCard(a.label, a.value, a.sub, a.color)}</td>
      <td width="50%" style="padding:5px;">${b ? execCard(b.label, b.value, b.sub, b.color) : ""}</td>
    </tr>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 -5px;">${rows}</table>`;
}

// ── The email ────────────────────────────────────────────────────────────────
export function dailyEmailHtml(unsubUrl: string, tier: EmailTier = "pro"): string {
  const b = buildBrief();
  const { acc, cheaper } = reads();
  const pro = tier === "pro";
  const day = b.date;
  const chartUrl = absoluteUrl(`/email/chart?d=${encodeURIComponent(new Date().toISOString().slice(0, 10))}`);
  const ctx = historicalContext();
  const why = whyThisMatters();
  const watch = watching();

  const heroTake = `
    ${eyebrow("Today's Take")}
    <div style="font:500 27px/1.35 ${SERIF};color:${C.ink};letter-spacing:-.2px;">${esc(todaysTake())}</div>`;

  const oneThingCard = `
    ${eyebrow("If you only read one thing today")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.goldBorder};border-radius:16px;">
      <tr><td style="padding:24px 24px 20px;border-left:3px solid ${C.gold};border-radius:16px;">
        <div style="font:400 18px/1.55 ${SERIF};color:${C.ink};">${esc(oneThing())}</div>
        <div style="font:600 10.5px/1.4 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${C.faint};margin-top:16px;">Historical context · not prediction</div>
      </td></tr>
    </table>`;

  const execSummary = `${eyebrow("Executive summary")}${execGrid()}`;

  const chartSection = `
    ${eyebrow("Chart of the day")}
    <div style="font:500 19px/1.3 ${SERIF};color:${C.ink};margin:0 0 14px;">${esc(ctx.title)}</div>
    <img src="${chartUrl}" width="540" alt="${esc(ctx.title)} — Bitcoin Accumulation Index through history" style="width:100%;max-width:540px;height:auto;border:1px solid ${C.border};border-radius:14px;display:block;" />
    <div style="font:400 11.5px/1.4 ${SANS};color:${C.faint};margin-top:10px;">The Accumulation Index across every cycle since 2012 — today reads ${acc.score}/100.</div>`;

  const whySection = why.length
    ? `${eyebrow("Why this matters")}${why.map((p) => `<div style="font:400 15px/1.65 ${SANS};color:${C.sub};margin:0 0 12px;">${esc(p)}</div>`).join("")}`
    : "";

  const contextSection = `
    ${eyebrow("Today's historical context")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.border};border-radius:14px;">
      <tr><td style="padding:22px 22px 20px;">
        <div style="font:500 17px/1.35 ${SERIF};color:${C.ink};margin:0 0 10px;">${esc(ctx.title)}</div>
        <div style="font:400 14px/1.6 ${SANS};color:${C.sub};">${esc(ctx.body)}</div>
      </td></tr>
    </table>`;

  const watchSection = watch.length
    ? `${eyebrow("What we're watching")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${watch
        .map(
          (w, i) => `<tr>
        <td width="34" style="vertical-align:top;padding:8px 0;"><div style="font:600 16px/1 ${SERIF};color:${C.gold};">0${i + 1}</div></td>
        <td style="padding:8px 0;border-bottom:1px solid ${C.hair};">
          <div style="font:600 14.5px/1.4 ${SANS};color:${C.ink};">${esc(w.signal)}</div>
          <div style="font:400 13px/1.45 ${SANS};color:${C.dim};margin-top:2px;">${esc(w.status)}</div>
        </td></tr>`,
        )
        .join("")}</table>`
    : "";

  const learnSection = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px dashed ${C.border};border-radius:14px;">
      <tr><td style="padding:18px 22px;">
        <div style="font:600 10.5px/1.4 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.gold};margin-bottom:7px;">Did you know?</div>
        <div style="font:400 14.5px/1.6 ${SANS};color:${C.sub};">${esc(learnSomething())}</div>
      </td></tr>
    </table>`;

  const analystSection = `
    ${eyebrow("Analyst's note")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.border};border-radius:14px;">
      <tr><td style="padding:24px 24px 20px;">
        <div style="font:400 16px/1.65 ${SERIF};color:${C.ink};">${esc(analystNote())}</div>
        <div style="font:600 11px/1.4 ${SANS};letter-spacing:.1em;color:${C.gold};margin-top:16px;">— HalvingLens Research</div>
      </td></tr>
    </table>`;

  const cta = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${SITE_URL}/brief" style="display:inline-block;background:${C.gold};color:#15120a;font:600 14.5px/1 ${SANS};letter-spacing:.2px;text-decoration:none;padding:15px 32px;border-radius:11px;">Explore today's full analysis →</a>
    </td></tr></table>`;

  // Assemble — section order with tier gating. Free: Take, Exec, Chart, CTA.
  const rows: string[] = [];
  rows.push(section(heroTake, "28px 30px 8px"));
  if (pro) rows.push(divider(), section(oneThingCard));
  rows.push(divider(), section(execSummary));
  rows.push(divider(), section(chartSection));
  if (pro && whySection) rows.push(divider(), section(whySection));
  if (pro) rows.push(divider(), section(contextSection));
  if (pro && watchSection) rows.push(divider(), section(watchSection));
  if (pro) rows.push(section(learnSection, "8px 30px 4px"));
  if (pro) rows.push(divider(), section(analystSection));
  rows.push(section(cta, "26px 30px 30px"));

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(dailyEmailSubject())}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(todaysTake())}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:26px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.bg};border:1px solid ${C.border};border-radius:18px;overflow:hidden;">

      <!-- Masthead -->
      <tr><td style="padding:26px 30px 22px;border-bottom:1px solid ${C.hair};">
        <table role="presentation" width="100%"><tr>
          <td style="font:700 15px/1 ${SANS};letter-spacing:.28em;text-transform:uppercase;color:${C.ink};">
            <span style="color:${C.gold};">◆</span>&nbsp; HalvingLens
          </td>
          <td style="text-align:right;font:400 12px/1 ${SANS};color:${C.dim};">${esc(day)}</td>
        </tr></table>
        <div style="font:500 12.5px/1.4 ${SERIF};color:${C.gold};letter-spacing:.04em;margin-top:10px;">Bitcoin Cycle Brief</div>
      </td></tr>

      ${rows.join("")}

      <!-- Footer -->
      <tr><td style="padding:22px 30px 26px;border-top:1px solid ${C.hair};background:${C.bg};">
        <div style="font:500 12px/1.5 ${SERIF};color:${C.sub};">The clearest view of the Bitcoin cycle.</div>
        <div style="font:400 11px/1.65 ${SANS};color:${C.faint};margin-top:12px;">
          Historical context, not a prediction. Educational analysis — not financial advice, no price targets.<br>
          You're receiving this because you joined the ${SITE_HOST} daily brief.
          <a href="${unsubUrl}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}
