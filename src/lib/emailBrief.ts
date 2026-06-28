// HalvingLens Research — the daily Bitcoin analyst note, by email (V3).
//
// Standard: a £50/month institutional research product we intentionally
// undercharge for. Benchmarks are Bloomberg / FT / Glassnode / Apple / Linear,
// not crypto newsletters. Every edition revolves around ONE unforgettable
// narrative; every section is supporting evidence. Answer first, evidence
// second. Dark + gold, large type, generous whitespace, mobile-first.
//
// Built from the SAME source of truth as the site — nothing fabricated. The one
// exception by design is the Analyst Observation, which is authored, email-only
// research that never appears on the public site. Historical context only — no
// advice, predictions or price targets.

import { buildBrief } from "./brief";
import { cycleSummary, cycleScorecard, HEAT_LABEL } from "./cycleSummary";
import { accumulationRead } from "./accumulation";
import { etfStats, ETF } from "./etf";
import { sentimentRead, SENTIMENT_AVAILABLE } from "./sentiment";
import { similarMoments } from "./similarity";
import { SITE_URL, SITE_HOST, absoluteUrl } from "./site";
import { fmtUsd, fmtPct } from "./format";

export type EmailTier = "free" | "pro";

// ── Palette (dark + gold) ────────────────────────────────────────────────────
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
  red: "#e8786f",
  amber: "#e0a64f",
  hair: "#1d212a",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function esc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SENT_HEX: Record<string, string> = { red: C.red, amber: C.amber, muted: C.dim, green: C.green, teal: "#56c7c7" };

// ── Live reads ───────────────────────────────────────────────────────────────
function reads() {
  const s = cycleSummary();
  const sc = cycleScorecard();
  const acc = accumulationRead();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const etfWk = ETF.connected ? etfStats().trailingWeek : null;
  const top = similarMoments(1)[0] ?? null;
  const cheap = acc.band.key === "deep_value" || acc.band.key === "attractive";
  const rich = acc.band.key === "elevated" || acc.band.key === "overheated";
  const fear = sr != null && sr.value <= 25;
  const greed = sr != null && sr.value >= 75;
  const etfNeg = etfWk != null && etfWk < 0;
  const etfPos = etfWk != null && etfWk > 0;
  const cheaper = 100 - acc.historicalPercentile;
  return { s, sc, acc, sr, etfWk, top, cheap, rich, fear, greed, etfNeg, etfPos, cheaper };
}

// ── Today's Take — one sentence (kept deliberately short) ────────────────────
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

// ── If You Only Read One Thing — the single insight ──────────────────────────
function oneThing(): string {
  const { acc, cheaper, cheap, greed, fear, sr } = reads();
  if (cheap)
    return (
      `Bitcoin is trading within the cheapest ${cheaper}% of historical weeks` +
      (fear ? `, while sentiment remains in ${sr!.band.label.toLowerCase()}` : "") +
      `. We have only seen conditions like this a handful of times before.`
    );
  if (greed)
    return `Sentiment sits in ${sr!.band.label.toLowerCase()} and Bitcoin trades in the upper ${acc.historicalPercentile}% of its historical range — an environment that has historically rewarded patience over conviction.`;
  return `Bitcoin sits at the ${acc.historicalPercentile}th percentile of its historical valuation range — a middle-of-the-road environment by historical standards, neither cheap nor stretched.`;
}

// ── Today's Confidence — agreement across the core signals ───────────────────
function confidence(): { level: "HIGH" | "MEDIUM" | "LOW"; color: string; blurb: string; detail: string } {
  const { acc, sr, s, etfWk, top, cheap, rich, fear, greed } = reads();
  const votes: { name: string; v: number }[] = [];
  votes.push({ name: "valuation", v: cheap ? 1 : rich ? -1 : 0 });
  if (sr) votes.push({ name: "sentiment", v: fear ? 1 : greed ? -1 : 0 });
  votes.push({ name: "cycle timing", v: s.heat === "cool" ? 1 : s.heat === "elevated" || s.heat === "euphoria" ? -1 : 0 });
  if (etfWk != null) votes.push({ name: "ETF flows", v: etfWk > 0 ? 1 : etfWk < 0 ? -1 : 0 });

  const active = votes.filter((x) => x.v !== 0);
  const pos = active.filter((x) => x.v > 0).length;
  const neg = active.filter((x) => x.v < 0).length;
  const agree = active.length ? Math.max(pos, neg) / active.length : 0.5;
  const simStrong = (top?.similarity ?? 0) >= 75;

  let level: "HIGH" | "MEDIUM" | "LOW" = agree >= 0.75 ? "HIGH" : agree >= 0.5 ? "MEDIUM" : "LOW";
  if (level === "MEDIUM" && simStrong && agree >= 0.6) level = "HIGH";

  const majoritySign = pos >= neg ? 1 : -1;
  const aligned = active.filter((x) => x.v === majoritySign).map((x) => x.name);
  const diverging = active.filter((x) => x.v === -majoritySign).map((x) => x.name);
  const blurb =
    level === "HIGH"
      ? "Today's data strongly aligns with historical behaviour."
      : level === "MEDIUM"
        ? "Some indicators agree, others diverge."
        : "Historical signals are mixed.";
  const detail =
    aligned.length && diverging.length
      ? `${cap(aligned.join(", "))} point the same way; ${diverging.join(", ")} diverge.`
      : aligned.length
        ? `${cap(aligned.join(", "))} are pointing the same way.`
        : "No single signal dominates today.";
  const color = level === "HIGH" ? C.green : level === "MEDIUM" ? C.gold : C.dim;
  return { level, color, blurb, detail };
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Market Health — narrative readings, not isolated numbers ──────────────────
function marketHealth(): { label: string; value: string; color: string }[] {
  const { s, acc, sr, etfWk } = reads();
  const valueTone = acc.band.key === "deep_value" || acc.band.key === "attractive" ? C.green : acc.band.key === "neutral" ? C.dim : C.red;
  const posWord =
    s.heat === "cool" ? "Cooling" : s.heat === "neutral" ? "Neutral" : s.heat === "heating" ? "Warming" : s.heat === "elevated" ? "Elevated" : "Hot";
  const posTone = s.heat === "cool" ? C.green : s.heat === "neutral" || s.heat === "heating" ? C.dim : C.red;
  const etfWord = etfWk == null ? "—" : etfWk > 0 ? "Improving" : etfWk < 0 ? "Weak" : "Neutral";
  const etfTone = etfWk == null ? C.dim : etfWk > 0 ? C.green : etfWk < 0 ? C.red : C.dim;
  const mom = s.change24h;
  const momWord = mom == null ? "Neutral" : mom > 1.5 ? "Positive" : mom < -1.5 ? "Negative" : "Neutral";
  const momTone = mom == null ? C.dim : mom > 1.5 ? C.green : mom < -1.5 ? C.red : C.dim;
  return [
    { label: "Historical value", value: acc.band.label.replace("Historically ", ""), color: valueTone },
    { label: "Sentiment", value: sr ? sr.band.label : "n/a", color: sr ? SENT_HEX[sr.band.tone] ?? C.dim : C.dim },
    { label: "Cycle position", value: posWord, color: posTone },
    { label: "ETF demand", value: etfWord, color: etfTone },
    { label: "Momentum", value: momWord, color: momTone },
  ];
}

// ── Why This Matters — one tight paragraph ───────────────────────────────────
function whyThisMatters(): string {
  return reads().s.support;
}

// ── Today's Historical Context — closest match + why ─────────────────────────
function historicalContext(): { match: string; similarity: number; body: string } | null {
  const { top, acc, fear, sr } = reads();
  if (!top) return null;
  const valuation = acc.band.label.toLowerCase().replace("historically ", "");
  const body =
    `Today most closely resembles ${top.dateLabel}. The resemblance isn't the date — it's the setup: a similar position in the cycle, a comparable drawdown from the high, and a ${valuation} valuation backdrop` +
    (fear ? `, with sentiment in ${sr!.band.label.toLowerCase()}` : "") +
    `. What followed then is context, not a forecast.`;
  return { match: top.dateLabel, similarity: top.similarity, body };
}

// ── Analyst Observation — authored, email-only research ──────────────────────
function analystObservation(): string {
  const { cheap, fear, etfNeg, greed, cheaper, acc, sr } = reads();
  if (cheap && fear)
    return `The biggest mistake investors make in moments like this is assuming fear and opportunity can't coexist. Today they do: Bitcoin sits in the cheapest ${cheaper}% of its history while the crowd is at its most fearful. History doesn't repeat — but it rarely leaves these conditions on the table for long.`;
  if (cheap && etfNeg)
    return `It's tempting to read negative ETF flows as a verdict. They aren't — flows tend to follow price more than they lead it. Bitcoin is trading in the cheapest ${cheaper}% of its history regardless. The setup and the sentiment rarely agree, and that disagreement is usually the whole point.`;
  if (cheap)
    return `Cheap and boring is an underrated combination. Bitcoin sits in the cheapest ${cheaper}% of its history with little drama attached — and history suggests the quiet stretches, not the loud ones, are where positioning is decided.`;
  if (greed)
    return `Late-cycle conviction feels safest precisely when it's most expensive. With sentiment hot and valuation in the upper ${acc.historicalPercentile}% of its range, the asymmetry that rewarded patience earlier has narrowed. Discipline, not conviction, tends to be the edge from here.`;
  return `Every cycle tempts investors to believe this one is different. Sometimes it genuinely is — this one is slower and ETF-shaped — but the discipline that travels across all of them is the same: judge today against Bitcoin's own history, not against your expectations.`;
}

// ── What We're Watching — up to 3 short items ────────────────────────────────
function watching(): { signal: string; status: string }[] {
  const { s } = reads();
  const elevated = s.watchSignals.filter((w) => w.level !== "calm");
  return (elevated.length ? elevated : s.watchSignals).slice(0, 3).map((w) => ({ signal: w.signal, status: w.status }));
}

// ── Subject — curiosity-first, no formulaic prefix ───────────────────────────
export function dailyEmailSubject(): string {
  const { s, acc, cheap, fear, greed, etfNeg, etfPos, etfWk } = reads();
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

// ── Plain-text part ──────────────────────────────────────────────────────────
export function dailyEmailText(): string {
  const { s, sc, acc, cheaper } = reads();
  const b = buildBrief();
  const conf = confidence();
  return [
    `HALVINGLENS RESEARCH — ${b.date}`,
    "",
    `Today's take: ${todaysTake()}`,
    "",
    "If you only read one thing:",
    oneThing(),
    "",
    `Confidence: ${conf.level} — ${conf.blurb}`,
    "",
    `Market health — value: ${acc.band.label.replace("Historically ", "")} · sentiment: ${s.heat} · cycle score: ${sc.overall}/100`,
    `Price: ${fmtUsd(s.price)}${s.change24h != null ? ` (${fmtPct(s.change24h, 1)} 24h)` : ""} · Accumulation: ${acc.score}/100 (only ${cheaper}% of weeks cheaper)`,
    "",
    `Analyst observation: ${analystObservation()}`,
    "",
    `Open the interactive analysis: ${SITE_URL}/brief`,
    "",
    "Historical context, not a prediction. Educational analysis, not financial advice.",
  ].join("\n");
}

// ── HTML building blocks ─────────────────────────────────────────────────────
function eyebrow(t: string): string {
  return `<div style="font:600 11px/1.4 ${SANS};letter-spacing:.24em;text-transform:uppercase;color:${C.gold};margin:0 0 16px;">${esc(t)}</div>`;
}
function section(inner: string, pad = "34px 36px"): string {
  return `<tr><td style="padding:${pad};">${inner}</td></tr>`;
}

// ── The email ────────────────────────────────────────────────────────────────
export function dailyEmailHtml(unsubUrl: string, tier: EmailTier = "pro"): string {
  const b = buildBrief();
  const { acc, cheaper } = reads();
  const pro = tier === "pro";
  const chartUrl = absoluteUrl(`/email/chart?d=${encodeURIComponent(new Date().toISOString().slice(0, 10))}`);
  const conf = confidence();
  const ctx = historicalContext();
  const watch = watching();

  const take = `
    ${eyebrow("Today's Take")}
    <div style="font:500 30px/1.32 ${SERIF};color:${C.ink};letter-spacing:-.3px;">${esc(todaysTake())}</div>`;

  const hero = `
    ${eyebrow("Today's signature read")}
    <img src="${chartUrl}" width="528" alt="HalvingLens Research — today's hero chart" style="width:100%;height:auto;border-radius:16px;display:block;border:1px solid ${C.border};" />
    <div style="font:400 14px/1.55 ${SANS};color:${C.sub};margin-top:14px;">Today reads ${acc.score}/100 on the Accumulation Index — only ${cheaper}% of Bitcoin's history has been cheaper.</div>`;

  const oneThingCard = `
    ${eyebrow("If you only read one thing")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.goldBorder};border-radius:18px;">
      <tr><td style="padding:30px 30px 26px;border-left:3px solid ${C.gold};border-radius:18px;">
        <div style="font:400 23px/1.55 ${SERIF};color:${C.ink};">${esc(oneThing())}</div>
        <div style="font:600 10.5px/1.4 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:${C.faint};margin-top:20px;">Historical context · not prediction</div>
      </td></tr>
    </table>`;

  const confidenceBlock = `
    ${eyebrow("Today's Confidence")}
    <div style="font:700 40px/1 ${SERIF};color:${conf.color};">${conf.level}</div>
    <div style="font:400 16px/1.55 ${SANS};color:${C.sub};margin-top:12px;">${esc(conf.blurb)} <span style="color:${C.dim};">${esc(conf.detail)}</span></div>`;

  const healthRows = marketHealth()
    .map(
      (r) => `<tr>
        <td style="padding:13px 0;border-bottom:1px solid ${C.hair};font:400 15px/1.4 ${SANS};color:${C.dim};">${esc(r.label)}</td>
        <td style="padding:13px 0;border-bottom:1px solid ${C.hair};font:600 17px/1.4 ${SANS};color:${r.color};text-align:right;">${esc(r.value)}</td>
      </tr>`,
    )
    .join("");
  const marketHealthBlock = `
    ${eyebrow("Market Health")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${healthRows}</table>`;

  const whyBlock = `
    ${eyebrow("Why this matters")}
    <div style="font:400 17px/1.65 ${SANS};color:${C.sub};">${esc(whyThisMatters())}</div>`;

  const contextBlock = ctx
    ? `
    ${eyebrow("Today's Historical Context")}
    <div style="font:500 21px/1.35 ${SERIF};color:${C.ink};">Closest match: ${esc(ctx.match)} <span style="color:${C.gold};">· ${ctx.similarity}% similar</span></div>
    <div style="font:400 16px/1.65 ${SANS};color:${C.sub};margin-top:12px;">${esc(ctx.body)}</div>`
    : "";

  const analystBlock = `
    ${eyebrow("Analyst Observation")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.border};border-radius:16px;">
      <tr><td style="padding:28px 28px 24px;">
        <div style="font:600 9.5px/1.4 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.gold};margin-bottom:14px;">Research note · subscriber-only</div>
        <div style="font:400 18px/1.7 ${SERIF};color:${C.ink};">${esc(analystObservation())}</div>
        <div style="font:600 11px/1.4 ${SANS};letter-spacing:.1em;color:${C.gold};margin-top:18px;">— HalvingLens Research</div>
      </td></tr>
    </table>`;

  const watchBlock = watch.length
    ? `
    ${eyebrow("What we're watching")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${watch
        .map(
          (w, i) => `<tr>
        <td width="38" style="vertical-align:top;padding:9px 0;"><div style="font:600 15px/1 ${SERIF};color:${C.gold};">0${i + 1}</div></td>
        <td style="padding:9px 0;">
          <div style="font:600 15px/1.4 ${SANS};color:${C.ink};">${esc(w.signal)}</div>
          <div style="font:400 13.5px/1.5 ${SANS};color:${C.dim};margin-top:2px;">${esc(w.status)}</div>
        </td></tr>`,
        )
        .join("")}</table>`
    : "";

  const cta = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${SITE_URL}/brief" style="display:inline-block;background:${C.gold};color:#15120a;font:600 15px/1 ${SANS};letter-spacing:.2px;text-decoration:none;padding:17px 36px;border-radius:12px;">Open the interactive analysis →</a>
    </td></tr></table>`;

  // Section order with tier gating.
  // Free: Take, Hero, Market Health, CTA. Pro adds the rest.
  const rows: string[] = [];
  rows.push(section(take, "30px 36px 10px"));
  rows.push(section(hero, "22px 36px"));
  if (pro) rows.push(section(oneThingCard, "22px 36px"));
  if (pro) rows.push(section(confidenceBlock, "22px 36px"));
  rows.push(section(marketHealthBlock, "22px 36px"));
  if (pro) rows.push(section(whyBlock, "22px 36px"));
  if (pro && ctx) rows.push(section(contextBlock, "22px 36px"));
  if (pro) rows.push(section(analystBlock, "22px 36px"));
  if (pro && watchBlock) rows.push(section(watchBlock, "22px 36px"));
  rows.push(section(cta, "30px 36px 36px"));

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(dailyEmailSubject())}</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(todaysTake())}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:30px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.bg};">

      <!-- Masthead -->
      <tr><td style="padding:8px 36px 24px;">
        <table role="presentation" width="100%"><tr>
          <td style="font:700 15px/1 ${SANS};letter-spacing:.26em;text-transform:uppercase;color:${C.ink};">
            <span style="color:${C.gold};">◆</span>&nbsp; HalvingLens Research
          </td>
          <td style="text-align:right;font:400 12px/1 ${SANS};color:${C.dim};">${esc(b.date)}</td>
        </tr></table>
        <div style="font:italic 400 13px/1.4 ${SERIF};color:${C.faint};margin-top:8px;">Today's edition · the analyst note behind the dashboard</div>
      </td></tr>

      ${rows.join("")}

      <!-- Footer -->
      <tr><td style="padding:26px 36px 30px;border-top:1px solid ${C.hair};">
        <div style="font:500 13px/1.5 ${SERIF};color:${C.sub};">The clearest view of the Bitcoin cycle.</div>
        <div style="font:400 11px/1.7 ${SANS};color:${C.faint};margin-top:12px;">
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
