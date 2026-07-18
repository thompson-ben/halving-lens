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
import { editorialFeature, editionNumber, featureHeroNarrative } from "./editorial";
import { latestFindings } from "./findings";
import { briefDate } from "./briefArchive";
import { dailyChange } from "./dailyChange";
import {
  dateSeed,
  freshnessVs,
  pickFreshest,
  recentSubjects,
  recentTakes,
  recentOneThings,
  SEED_OFFSET,
} from "./editorialVariety";
import type { Edition } from "./research";
import { SITE_URL, SITE_HOST, absoluteUrl, emailImageBase } from "./site";
import { type EmailTracking, NO_EMAIL_TRACKING, forHtmlAttr } from "./emailTracking";
import { fmtUsd, fmtPct } from "./format";
import { format } from "date-fns";

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
// Each branch offers 2-3 truthful re-wordings of the SAME fact (no new facts),
// and we serve whichever reads freshest versus the last ~10 openings. Selection
// is deterministic (dateSeed) so the sent email and the persisted edition agree.
function todaysTake(): string {
  const { s, cheap, fear, greed, etfNeg, sr } = reads();
  const heat = HEAT_LABEL[s.heat].toLowerCase();
  const mood = sr ? sr.band.label.toLowerCase() : "";
  let variants: string[];
  if (cheap && fear)
    variants = [
      `Bitcoin remains historically cheap while sentiment sits in ${mood}.`,
      `By the historical record, Bitcoin still reads cheap even as sentiment holds in ${mood}.`,
      `Valuation stays in the low band of Bitcoin's history while ${mood} grips sentiment.`,
    ];
  else if (cheap && etfNeg)
    variants = [
      `Bitcoin stays in one of its cheapest historical valuation regions even as ETF flows turn negative.`,
      `Even with ETF flows negative this week, Bitcoin remains in one of its cheapest historical regions.`,
      `ETF flows are negative, yet by history Bitcoin still trades cheap.`,
    ];
  else if (cheap)
    variants = [
      `Bitcoin continues trading inside one of its cheapest historical valuation regions.`,
      `By the historical record, Bitcoin still sits in one of its cheapest regions.`,
      `Valuation remains in the low band of Bitcoin's history.`,
    ];
  else if (s.heat === "cool")
    variants = [
      `Bitcoin is still trading in one of the coolest historical risk environments.`,
      `By history, Bitcoin remains in one of its coolest risk environments.`,
      `The cycle's risk backdrop stays among the coolest in Bitcoin's history.`,
    ];
  else if (fear)
    variants = [
      `Extreme fear persists while Bitcoin holds an important historical cycle window.`,
      `Sentiment stays in extreme fear as Bitcoin sits in a notable historical cycle window.`,
      `Fear remains extreme, set against a historically notable cycle position.`,
    ];
  else if (greed)
    variants = [
      `Sentiment runs hot while Bitcoin sits in the richer end of its historical range.`,
      `With sentiment hot, Bitcoin sits toward the richer end of its historical range.`,
      `Bitcoin trades in the richer part of its historical range as sentiment runs hot.`,
    ];
  else if (etfNeg)
    variants = [
      `ETF flows stay negative against a ${heat} historical backdrop.`,
      `Against a ${heat} backdrop, ETF flows remain negative this week.`,
      `ETF flows read negative, set against a ${heat} historical backdrop.`,
    ];
  else
    variants = [
      `Bitcoin is sitting in the ${heat} part of its historical range.`,
      `By history, Bitcoin sits in the ${heat} part of its range.`,
      `Bitcoin's position reads ${heat} against its own history.`,
    ];
  return pickFreshest(variants, recentTakes(10), dateSeed() + SEED_OFFSET.take).value;
}

// ── If You Only Read One Thing — the single insight ──────────────────────────
// Same rotation discipline as todaysTake: several truthful re-wordings of the
// one insight, freshest-versus-recent wins. A different seed offset keeps it
// from moving in lockstep with the opening.
function oneThing(): string {
  const { acc, cheaper, cheap, greed, fear, sr } = reads();
  const pct = acc.historicalPercentile;
  let variants: string[];
  if (cheap) {
    const mood = sr ? sr.band.label.toLowerCase() : "";
    const fearClause = fear ? `, while sentiment remains in ${mood}` : "";
    const fearClause2 = fear ? ` with sentiment in ${mood}` : "";
    variants = [
      `Bitcoin is trading cheaper than ${cheaper}% of all weeks in its history${fearClause}. We have only seen conditions like this a handful of times before.`,
      `By the historical record, Bitcoin is cheaper than ${cheaper}% of all weeks it has ever traded${fearClause} — a combination the record shows only a handful of times.`,
      `Only about ${pct}% of all weeks in Bitcoin's history were cheaper than today${fearClause2}. Conditions like this have been rare.`,
    ];
  } else if (greed) {
    const mood = sr ? sr.band.label.toLowerCase() : "";
    variants = [
      `Sentiment sits in ${mood} and Bitcoin trades in the upper ${pct}% of its historical range — an environment that has historically rewarded patience over conviction.`,
      `Bitcoin sits in the upper ${pct}% of its historical range with sentiment in ${mood} — historically an environment that rewarded patience over conviction.`,
      `With sentiment in ${mood}, Bitcoin trades in the upper ${pct}% of its historical range — a setup that has, in the past, favoured patience over conviction.`,
    ];
  } else {
    variants = [
      `Bitcoin sits at the ${pct}th percentile of its historical valuation range — a middle-of-the-road environment by historical standards, neither cheap nor stretched.`,
      `At the ${pct}th percentile of its historical valuation range, Bitcoin reads middle-of-the-road — neither cheap nor stretched by historical standards.`,
      `By historical valuation, Bitcoin sits mid-range at the ${pct}th percentile — neither cheap nor stretched.`,
    ];
  }
  return pickFreshest(variants, recentOneThings(10), dateSeed() + SEED_OFFSET.oneThing).value;
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
  const unanimous = aligned.length > 0 && diverging.length === 0;
  // "Confidence" here = how much today's core signals agree with EACH OTHER, not
  // how closely today resembles history (that's the closest-match section). The
  // blurb must stay consistent with whether a signal actually diverges, so a HIGH
  // reading never claims full alignment while the detail names a divergence.
  const blurb =
    level === "HIGH"
      ? unanimous
        ? "Today's core signals are in full agreement."
        : "Most of today's core signals point the same way."
      : level === "MEDIUM"
        ? "Today's signals are split — some agree, some diverge."
        : "Today's signals are pulling in different directions.";
  const detail =
    aligned.length && diverging.length
      ? `${cap(aligned.join(", "))} point the same way; ${diverging.join(", ")} diverge.`
      : aligned.length
        ? `${cap(aligned.join(", "))} all point the same way.`
        : "No single signal dominates today.";
  const color = level === "HIGH" ? C.green : level === "MEDIUM" ? C.gold : C.dim;
  return { level, color, blurb, detail };
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Market Health — narrative readings, each with the concrete number behind it.
// strength 1–3 is retained for older stored editions; new editions also carry a
// `metric` (e.g. "15/100", "−$2.1B/wk") so the reading is a figure, not a meter.
function marketHealth(): { label: string; value: string; color: string; strength: number; metric: string }[] {
  const { s, acc, sr, etfWk } = reads();
  const valueTone = acc.band.key === "deep_value" || acc.band.key === "attractive" ? C.green : acc.band.key === "neutral" ? C.dim : C.red;
  const valueStr = acc.band.key === "deep_value" || acc.band.key === "overheated" ? 3 : acc.band.key === "neutral" ? 1 : 2;
  const posWord =
    s.heat === "cool" ? "Cooling" : s.heat === "neutral" ? "Neutral" : s.heat === "heating" ? "Warming" : s.heat === "elevated" ? "Elevated" : "Hot";
  const posTone = s.heat === "cool" ? C.green : s.heat === "neutral" || s.heat === "heating" ? C.dim : C.red;
  const posStr = s.heat === "euphoria" || s.heat === "elevated" || s.heat === "cool" ? 3 : s.heat === "heating" ? 2 : 1;
  const etfWord = etfWk == null ? "—" : etfWk > 0 ? "Improving" : etfWk < 0 ? "Weak" : "Neutral";
  const etfTone = etfWk == null ? C.dim : etfWk > 0 ? C.green : etfWk < 0 ? C.red : C.dim;
  const etfStr = etfWk == null ? 1 : etfWk === 0 ? 1 : 2;
  const mom = s.change24h;
  const momWord = mom == null ? "Neutral" : mom > 1.5 ? "Positive" : mom < -1.5 ? "Negative" : "Neutral";
  const momTone = mom == null ? C.dim : mom > 1.5 ? C.green : mom < -1.5 ? C.red : C.dim;
  const momStr = mom == null ? 1 : Math.abs(mom) > 4 ? 3 : Math.abs(mom) > 1.5 ? 2 : 1;
  const sentStr = sr ? (sr.value <= 25 || sr.value >= 75 ? 3 : sr.value < 45 || sr.value >= 55 ? 2 : 1) : 1;

  // Concrete reading behind each row, in its natural unit.
  const minus = (n: number) => (n < 0 ? "−" : "+") + fmtUsd(Math.abs(n), { compact: true });
  const valueMetric = `${acc.score}/100`;
  const sentMetric = sr ? `${Math.round(sr.value)}/100` : "n/a";
  const posMetric = s.heatPercentile != null ? `${s.heatPercentile}/100` : "—";
  const etfMetric = etfWk == null ? "—" : `${minus(etfWk)}/wk`;
  const momMetric = mom == null ? "—" : `${mom >= 0 ? "+" : ""}${mom.toFixed(1)}%`;

  return [
    { label: "Historical value", value: acc.band.label.replace("Historically ", ""), color: valueTone, strength: valueStr, metric: valueMetric },
    { label: "Sentiment", value: sr ? sr.band.label : "n/a", color: sr ? SENT_HEX[sr.band.tone] ?? C.dim : C.dim, strength: sentStr, metric: sentMetric },
    { label: "Cycle position", value: posWord, color: posTone, strength: posStr, metric: posMetric },
    { label: "ETF demand", value: etfWord, color: etfTone, strength: etfStr, metric: etfMetric },
    { label: "Momentum", value: momWord, color: momTone, strength: momStr, metric: momMetric },
  ];
}

// ── A delightful one-liner — a true, calm piece of Bitcoin history ────────────
function bitcoinMemory(): string {
  const { s } = reads();
  const facts = [
    "Bitcoin has fallen 30% or more from a high more than a dozen times — and gone on to a new cycle high every time so far.",
    "Its 200-week moving average has never closed a full cycle below where that cycle began.",
    "There will only ever be 21 million bitcoin, and more than 19.5 million already exist.",
    "The word “HODL” began life as a typo in a 2013 Bitcoin forum post.",
    "Bitcoin has spent more of its life below a prior high than at new ones — yet its long-term trend has only risen.",
    "Every roughly four years, by a rule written in code, the new supply of bitcoin is cut in half.",
  ];
  return facts[Math.abs(s.cycleDay) % facts.length];
}

// ── Context Score — the HalvingLens signature ────────────────────────────────
// A proprietary 0–100 read on how strongly today resonates with a clear
// historical context: how unusual today's valuation is (rarity) and how cleanly
// it maps to a real prior moment (analogue). High = an unusually legible market.
function contextScore(): { score: number; label: string } {
  const { acc, top } = reads();
  const rarity = Math.min(100, Math.round(Math.abs(acc.historicalPercentile - 50) * 2));
  const analogue = top?.similarity ?? 0;
  const score = Math.round(0.55 * analogue + 0.45 * rarity);
  const label = score >= 80 ? "Strong historical context" : score >= 60 ? "Clear historical context" : score >= 40 ? "Moderate context" : "Limited context";
  return { score, label };
}

// ── Why This Matters Today — a one-sentence bridge from history to now ────────
function whyThisMattersToday(): string {
  const { cheap, greed } = reads();
  if (cheap)
    return "If history rhymes, today deserves attention — not because it predicts tomorrow, but because environments this cheap have historically been uncommon.";
  if (greed)
    return "Environments like today's have, historically, rewarded patience over conviction — context worth holding lightly rather than acting on.";
  return "History doesn't predict, but it does provide context — and today's environment is one worth understanding rather than reacting to.";
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

// ── Analyst Observation — authored, quotable, email-only research ─────────────
// Written in the voice of a head of digital-assets research: a memorable pull-
// quote, then one supporting paragraph. Flavoured by the day's editorial feature
// so each edition reads differently. This never appears on the public site.
function analystObservation(): { quote: string; body: string } {
  const { cheap, fear, etfNeg, greed, cheaper, acc } = reads();
  const feature = editorialFeature().key;

  // Weekday-led features get their own voice.
  if (feature === "etf")
    return {
      quote: "ETF demand has altered Bitcoin's rhythm, but not investor psychology.",
      body: `Flows tend to follow price more than they lead it, which is why reading them as a verdict so often misleads. The plumbing has changed; the behaviour running through it hasn't. ${cheap ? `Today that leaves Bitcoin cheaper than ${cheaper}% of its history regardless of the tape.` : "The cycle's mechanics are new; its emotions are familiar."}`,
    };
  if (feature === "weekly_close")
    return {
      quote: "A week's close is a data point. A cycle's position is the story.",
      body: "It's tempting to let Friday's candle set the mood for the weekend. But a single close rarely changes where we sit in the larger arc — and that position, not the print, is what history actually speaks to.",
    };
  if (feature === "long_view")
    return {
      quote: "History rarely repeats exactly. It rhymes most loudly where sentiment is most extreme.",
      body: `Step back far enough and the daily noise resolves into a pattern. The numbers tell you where you are; history tells you how people have behaved once they got there. ${cheap ? "Today sits at the cheaper end of that arc — and the patient stretches, not the loud ones, are where it has mattered most." : "Today sits mid-arc — a time to watch the extremes, not chase the middle."}`,
    };
  if (feature === "weekahead")
    return {
      quote: "The week ahead matters less than the environment we enter it from.",
      body: `Forecasts age badly; environments don't. The useful question on a Sunday isn't what happens next, but what kind of market we're standing in — and today that's a ${acc.band.label.toLowerCase().replace("historically ", "")} one by historical standards. Position is context; the calendar is noise.`,
    };
  if (feature === "market_reset")
    return {
      quote: "Monday rewards a clear head more than a strong opinion.",
      body: `The weekend's moves feel decisive in the moment and forgettable by Wednesday. Bitcoin's position in the cycle didn't change overnight — and ${cheap ? `it remains cheaper than ${cheaper}% of its history.` : "it remains exactly where the data left it on Friday."} Reset the noise; keep the context.`,
    };

  // Condition-led (Mon/Tue/Wed features).
  if (cheap && fear)
    return {
      quote: "The crowd usually notices value only after fear has disappeared.",
      body: `Today fear and opportunity occupy the same room: Bitcoin sits cheaper than ${cheaper}% of its history while sentiment is at its most fearful. History doesn't repeat — but it rarely leaves these conditions on the table for long.`,
    };
  if (cheap && etfNeg)
    return {
      quote: "It's tempting to read negative flows as a verdict. They're usually just an echo.",
      body: `Flows follow price more than they lead it. Bitcoin is trading cheaper than ${cheaper}% of its history regardless — and the gap between a cheap setup and a fearful tape is usually where the interesting decisions get made.`,
    };
  if (cheap)
    return {
      quote: "Cheap and boring is an underrated combination.",
      body: `Bitcoin sits cheaper than ${cheaper}% of its history with little drama attached. History suggests the quiet stretches, not the loud ones, are where positioning is quietly decided.`,
    };
  if (greed)
    return {
      quote: "Conviction feels safest precisely when it has become most expensive.",
      body: `With sentiment hot and valuation in the upper ${acc.historicalPercentile}% of its range, the asymmetry that rewarded patience earlier has narrowed. Discipline, not conviction, tends to be the edge from here.`,
    };
  return {
    quote: "Every cycle insists it's different. The discipline that survives all of them is the same.",
    body: "This cycle genuinely is slower and ETF-shaped — but the habit that travels across every one of them is to judge today against Bitcoin's own history, not against your expectations.",
  };
}

// ── What We're Watching — up to 3 short items ────────────────────────────────
function watching(): { signal: string; status: string }[] {
  const { s } = reads();
  const elevated = s.watchSignals.filter((w) => w.level !== "calm");
  return (elevated.length ? elevated : s.watchSignals).slice(0, 3).map((w) => ({ signal: w.signal, status: w.status }));
}

// ── Edition content — the single serializable source of truth ────────────────
// Drives the email AND the permanent research page/record, so they never drift.
export function editionContent(): Edition {
  const { s, acc, sr } = reads();
  const cs = contextScore();
  const obs = analystObservation();
  const ctx = historicalContext();
  const mh = marketHealth();
  const conf = confidence();
  const watch = watching();
  const feature = editorialFeature();
  const stars = Math.max(1, Math.min(5, Math.round(cs.score / 20)));

  const subject = dailyEmailSubject();
  const take = todaysTake();
  const one = oneThing();
  const why = whyThisMattersToday();
  const mem = bitcoinMemory();

  // Internal freshness diagnostic — how distinct each rotated field is versus the
  // previous ~10 editions. Persisted for internal inspection; never shown.
  const fSubject = freshnessVs(subject, recentSubjects(10));
  const fTake = freshnessVs(take, recentTakes(10));
  const fOneThing = freshnessVs(one, recentOneThings(10));
  const freshness = {
    subject: fSubject,
    take: fTake,
    oneThing: fOneThing,
    overall: Math.round((fSubject + fTake + fOneThing) / 3),
  };
  const words = `${take} ${one} ${conf.blurb} ${conf.detail} ${ctx?.body ?? ""} ${why} ${obs.quote} ${obs.body} ${watch.map((w) => w.signal + " " + w.status).join(" ")} ${mem}`.split(/\s+/).length;
  const readMin = Math.max(2, Math.round(words / 200));

  const search = [
    take, one, obs.quote, obs.body, ctx?.body ?? "", why, mem, feature.title, cs.label,
    sr ? sr.band.label : "", acc.band.label, ...watch.map((w) => `${w.signal} ${w.status}`),
  ]
    .join(" ")
    .toLowerCase();

  return {
    edition: editionNumber(),
    slug: format(briefDate(), "yyyy-MM-dd"),
    dateLabel: format(briefDate(), "EEEE d MMMM yyyy"),
    feature: { key: feature.key, day: feature.day, title: feature.title },
    subject,
    take,
    contextScore: { score: cs.score, label: cs.label, stars },
    oneThing: one,
    confidence: { level: conf.level, blurb: conf.blurb, detail: conf.detail },
    marketHealth: mh,
    historicalContext: ctx,
    whyToday: why,
    analyst: obs,
    watching: watch,
    memory: mem,
    heroNarrative: featureHeroNarrative(),
    readMin,
    metrics: {
      price: s.price,
      fearGreed: sr ? sr.value : null,
      accumulationScore: acc.score,
      accumulationBand: acc.band.label,
      accumulationPercentile: acc.historicalPercentile,
      cycleDay: s.cycleDay,
      etf: mh.find((r) => r.label === "ETF demand")?.value ?? "—",
      sentiment: sr ? sr.band.label : "n/a",
    },
    search,
    freshness,
  };
}

// ── Subject — curiosity-first, no formulaic prefix ───────────────────────────
// Builds a POOL of truthful, applicable subjects spanning MULTIPLE angles for
// today's data (value, sentiment, ETF, cycle position, similar moment, "what
// changed"), lightly biased toward the weekday feature, then serves the one that
// reads freshest versus the last ~10 subjects. Because the pool is far larger
// than a single branch's 3-4 variants, a persistent market state no longer
// repeats every few days. Every candidate is gated on the data that makes it
// TRUE — no ETF claim without ETF data, no "cheap" claim unless cheap, etc.
export function dailyEmailSubject(): string {
  const { s, acc, sr, top, cheap, rich, fear, greed, etfNeg, etfPos, etfWk, cheaper } = reads();
  const pool: string[] = [];

  // ── Value angle ────────────────────────────────────────────────────────────
  if (cheap && fear) {
    pool.push(
      "The crowd is fearful. History wasn't.",
      "Extreme fear meets historically cheap Bitcoin",
      `Cheaper than ${cheaper}% of history — while fear runs high`,
      "When fear and value overlap",
    );
  }
  if (cheap && etfNeg) {
    pool.push("Historically cheap, despite the outflows", "Cheap by history, even as ETFs bleed", "Low valuation meets ETF outflows");
  }
  if (acc.band.key === "deep_value") {
    pool.push("Bitcoin just entered a rare historical zone", "A historically deep-value reading today", "Deep value, by the historical record");
  }
  if (cheap) {
    pool.push(
      "Bitcoin remains historically cheap",
      `Still cheaper than ${cheaper}% of history`,
      "A low reading on the historical range",
      "By the historical record, Bitcoin still reads cheap",
    );
  }
  if (rich) {
    pool.push("Valuation sits in the richer end of history", `Only ${cheaper}% of history was cheaper than today`);
  }

  // ── Sentiment angle (only when sentiment data exists) ────────────────────────
  if (greed) {
    pool.push("The expensive comfort of conviction", "Greed runs warm in the historical range");
    if (rich) pool.push("Sentiment hot, valuation stretched");
  }
  if (fear) {
    pool.push("Extreme fear persists", "Fear holds, by the numbers", "The mood stays fearful");
  }

  // ── ETF angle (only when ETF data is connected) ─────────────────────────────
  if (etfWk != null) {
    if (etfNeg) {
      pool.push("A week of net ETF outflows", "ETF flows turned negative this week", "ETF demand reads weak this week");
    } else if (etfPos) {
      pool.push("Net ETF inflows this week", "Fresh ETF demand this week", "ETF flows turned positive this week");
    } else {
      pool.push("ETF flows are roughly flat this week");
    }
  }

  // ── Cycle-position angle ─────────────────────────────────────────────────────
  if (s.heat === "cool") {
    pool.push("A cool spot in the cycle", "Still one of the cooler cycle readings", "Bitcoin's rhythm continues to diverge");
  }
  if (s.heatPercentile != null) {
    pool.push(`Bitcoin sits around the ${s.heatPercentile}th percentile of its historical range`);
  }
  pool.push("Where Bitcoin sits in the cycle today", "Today's cycle read, in context", "The cycle, clearly");

  // ── Similar-moment angle (only when a match exists) ──────────────────────────
  if (top) {
    if (top.similarity >= 75) {
      pool.push(`Today's market rhymes with ${top.dateLabel}`, `A familiar setup — echoes of ${top.dateLabel}`, `${top.similarity}% similar to ${top.dateLabel}`);
    } else {
      pool.push(`Today's closest match in the record: ${top.dateLabel}`);
    }
  }

  // ── "What changed today" angle (only on a genuine, meaningful mover) ─────────
  const dc = dailyChange();
  if (dc.available && dc.changed.length > 0 && dc.biggestStory) {
    if (dc.biggestStory.key !== "price") pool.push("Today's biggest change isn't the price");
    if (!dc.cycleReadChanged) pool.push("One metric moved — the cycle didn't");
    pool.push(`What changed today: ${dc.biggestStory.label.toLowerCase()}`);
  }

  // ── Weekday theme bias — add themed candidates so the freshest pick leans
  //    toward the day's feature, without forcing it. Each is still data-gated.
  const feature = editorialFeature().key;
  if ((feature === "similar" || feature === "historical") && top) {
    pool.push(`In historical terms, today echoes ${top.dateLabel}`);
  }
  if (feature === "etf" && etfWk != null) {
    pool.push(etfNeg ? "ETF Watch: outflows this week" : etfPos ? "ETF Watch: inflows this week" : "ETF Watch: flows roughly flat");
  }
  if ((feature === "market_reset" || feature === "weekahead") && dc.available && dc.biggestStory) {
    pool.push(dc.changed.length > 0 ? `What actually changed: ${dc.biggestStory.label.toLowerCase()}` : "What actually changed — and what didn't");
  }
  if (feature === "long_view") {
    pool.push("The long view: where this cycle stands");
  }
  if (feature === "weekly_close") {
    pool.push(cheap ? `The week's takeaway: cheaper than ${cheaper}% of history` : "The week's takeaway, in context");
  }

  return pickFreshest(pool, recentSubjects(10), dateSeed() + SEED_OFFSET.subject).value;
}

// ── Primary CTA — deterministic, contextual rotation ─────────────────────────
// The one static "Continue inside HalvingLens →" button repeated every day. Now
// it rotates deterministically among flagship destinations (keyed on dateSeed so
// consecutive days differ), with the pool ordered so the day's lead sits first —
// making the button contextual without being clickbait. Copy stays honest.
type PrimaryCta = { label: string; path: string; track: string };
const CTA_POOL: PrimaryCta[] = [
  { label: "Read today's State of Bitcoin", path: "/state-of-bitcoin", track: "daily_cta_state" },
  { label: "See today's Accumulation Index", path: "/accumulation", track: "daily_cta_accumulation" },
  { label: "View similar moments", path: "/similar-moments", track: "daily_cta_similar" },
  { label: "Explore Historical Price Paths", path: "/historical-price-paths", track: "daily_cta_paths" },
  { label: "Read this week's research finding", path: "/research/findings", track: "daily_cta_research" },
];
function primaryCta(): PrimaryCta {
  const { cheap, rich, top } = reads();
  const feature = editorialFeature().key;
  // The lead the button should lean toward, by path.
  const leadPath =
    cheap || rich
      ? "/accumulation"
      : top && top.similarity >= 75
        ? "/similar-moments"
        : feature === "similar" || feature === "historical"
          ? "/similar-moments"
          : feature === "long_view"
            ? "/historical-price-paths"
            : "/state-of-bitcoin";
  const leadIdx = Math.max(0, CTA_POOL.findIndex((c) => c.path === leadPath));
  // Order the pool with the lead first, then rotate by dateSeed. On any run of
  // days sharing the same lead the ordering is stable, so seed+1 lands on a
  // different entry each morning — no two consecutive days repeat.
  const ordered = [...CTA_POOL.slice(leadIdx), ...CTA_POOL.slice(0, leadIdx)];
  const idx = ((dateSeed() + SEED_OFFSET.cta) % ordered.length + ordered.length) % ordered.length;
  return ordered[idx];
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
    `Price: ${fmtUsd(s.price)}${s.change24h != null ? ` (${fmtPct(s.change24h, 1)} 24h)` : ""} · Accumulation: ${acc.score}/100 (cheaper than ${cheaper}% of weeks)`,
    "",
    `Analyst observation: "${analystObservation().quote}" ${analystObservation().body}`,
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
export function dailyEmailHtml(unsubUrl: string, tier: EmailTier = "pro", tracking: EmailTracking = NO_EMAIL_TRACKING): string {
  const b = buildBrief();
  const { acc, cheaper } = reads();
  const pro = tier === "pro";
  // Image (not a link) → must sit on the canonical, non-redirecting host so mail
  // proxies (which don't follow redirects) render it. See resolveEmailImageBase.
  const chartUrl = `${emailImageBase()}/email/chart/${new Date().toISOString().slice(0, 10)}`;
  const conf = confidence();
  const ctx = historicalContext();
  const watch = watching();
  const feature = editorialFeature();
  const cs = contextScore();
  const obs = analystObservation();
  const stars = Math.max(1, Math.min(5, Math.round(cs.score / 20)));
  const starStr = `<span style="color:${C.gold};">${"★".repeat(stars)}</span><span style="color:${C.hair};">${"★".repeat(5 - stars)}</span>`;
  const csRank =
    cs.score >= 80
      ? "Today ranks among the strongest historical contexts seen across past Bitcoin cycles."
      : cs.score >= 60
        ? "Today shows a clearer-than-usual parallel to Bitcoin's history."
        : "Today's historical parallel is modest — context worth noting, not leaning on.";

  // Every analytical section gets one subtle "see more" deep link, so a reader
  // who likes what they see reaches the full analysis on the site in one click.
  // Wrapped in tracking.link so click-through feeds the email-CTR analytics.
  const moreLink = (label: string, path: string, trackLabel: string) =>
    `<div style="margin-top:16px;"><a href="${tracking.link(`${SITE_URL}${path}`, trackLabel)}" style="font:600 12.5px/1.35 ${SANS};letter-spacing:.02em;color:${C.gold};text-decoration:none;">${esc(label)} →</a></div>`;

  // The Signature Read chart rotates by narrative — deep-link it to the matching page.
  const heroPage =
    ({ similar: "/similar-moments", drawdown: "/downside-scenarios", fear_greed: "/sentiment" } as Record<string, string>)[
      featureHeroNarrative()
    ] ?? "/accumulation";

  const take = `
    ${eyebrow("Today's Take")}
    <div style="font:500 30px/1.32 ${SERIF};color:${C.ink};letter-spacing:-.3px;">${esc(todaysTake())}</div>
    ${moreLink("See the full picture", "/", "daily_take")}`;

  const hero = `
    ${eyebrow(`Signature Read · ${feature.title}`)}
    <a href="${tracking.link(`${SITE_URL}${heroPage}`, "daily_hero_image")}" style="text-decoration:none;display:block;">
      <img src="${chartUrl}" width="528" alt="HalvingLens Research — today's signature read. Tap to explore." style="width:100%;height:auto;border-radius:16px;display:block;border:1px solid ${C.border};" />
    </a>
    ${moreLink("Explore the full analysis", heroPage, "daily_hero")}`;

  const contextScoreBlock = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.border};border-radius:16px;">
      <tr><td style="padding:28px 28px 24px;">
        <div style="font:600 10.5px/1.4 ${SANS};letter-spacing:.22em;text-transform:uppercase;color:${C.gold};">HalvingLens Context Score</div>
        <div style="margin-top:14px;">
          <span style="font:700 52px/1 ${SERIF};color:${C.ink};">${cs.score}</span><span style="font:400 22px/1 ${SERIF};color:${C.dim};"> /100</span>
        </div>
        <div style="font-size:20px;letter-spacing:3px;margin-top:12px;">${starStr}</div>
        <div style="font:600 16px/1.4 ${SANS};color:${C.gold};margin-top:10px;">${esc(cs.label)}</div>
        <div style="font:400 14px/1.6 ${SANS};color:${C.sub};margin-top:14px;">Higher scores mean today's market closely resembles historically significant environments. ${esc(csRank)}</div>
        ${moreLink("How attractive is today?", "/accumulation", "daily_context_score")}
      </td></tr>
    </table>`;

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
        <td style="padding:15px 0;border-bottom:1px solid ${C.hair};font:400 15px/1.4 ${SANS};color:${C.dim};">${esc(r.label)}</td>
        <td style="padding:15px 0;border-bottom:1px solid ${C.hair};text-align:right;white-space:nowrap;">
          <span style="font:600 16px/1.4 ${SANS};color:${r.color};vertical-align:middle;">${esc(r.value)}</span>
          <span style="font:600 14px/1.4 ${SANS};color:${C.faint};vertical-align:middle;margin-left:10px;">${esc(r.metric)}</span>
        </td>
      </tr>`,
    )
    .join("");
  const marketHealthBlock = `
    ${eyebrow("Market Health")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${healthRows}</table>
    ${moreLink("See every metric in full", "/metrics", "daily_market_health")}`;

  const contextBlock = ctx
    ? `
    ${eyebrow("Today's Historical Context")}
    <div style="font:500 21px/1.35 ${SERIF};color:${C.ink};">Closest match: ${esc(ctx.match)} <span style="color:${C.gold};">· ${ctx.similarity}% similar</span></div>
    <div style="font:400 16px/1.65 ${SANS};color:${C.sub};margin-top:12px;">${esc(ctx.body)}</div>
    <div style="font:500 16px/1.55 ${SERIF};color:${C.ink};margin-top:18px;border-left:2px solid ${C.gold};padding-left:14px;">${esc(whyThisMattersToday())}</div>
    ${moreLink("Explore similar moments", "/similar-moments", "daily_context")}`
    : "";

  const analystBlock = `
    ${eyebrow("The Research Desk")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cardHi};border:1px solid ${C.border};border-radius:16px;">
      <tr><td style="padding:30px 30px 26px;">
        <div style="font:600 9.5px/1.4 ${SANS};letter-spacing:.18em;text-transform:uppercase;color:${C.gold};margin-bottom:18px;">Subscriber edition · written for you this morning</div>
        <div style="font:400 24px/1.4 ${SERIF};color:${C.ink};font-style:italic;">&ldquo;${esc(obs.quote)}&rdquo;</div>
        <div style="font:400 16px/1.65 ${SANS};color:${C.sub};margin-top:16px;">${esc(obs.body)}</div>
        <div style="font:600 11px/1.4 ${SANS};letter-spacing:.1em;color:${C.gold};margin-top:18px;">— HalvingLens Research</div>
        ${moreLink("Read the latest research", "/research", "daily_analyst")}
      </td></tr>
    </table>`;

  const delightBlock = `
    <div style="font:600 10px/1.4 ${SANS};letter-spacing:.2em;text-transform:uppercase;color:${C.faint};margin-bottom:8px;">Did you know?</div>
    <div style="font:400 16px/1.6 ${SERIF};color:${C.sub};">${esc(bitcoinMemory())}</div>`;

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
        .join("")}</table>
    ${moreLink("Track these on your dashboard", "/", "daily_watch")}`
    : "";

  const primary = primaryCta();
  const cta = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${tracking.link(`${SITE_URL}${primary.path}`, primary.track)}" style="display:inline-block;background:${C.gold};color:#15120a;font:600 15px/1 ${SANS};letter-spacing:.2px;text-decoration:none;padding:17px 38px;border-radius:12px;">${esc(primary.label)} →</a>
    </td></tr></table>`;

  const archive = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font:400 12px/1.5 ${SANS};color:${C.faint};">
        <a href="${tracking.link(`${SITE_URL}/brief/archive`, "daily_yesterday")}" style="color:${C.dim};text-decoration:none;">← Yesterday's edition</a>
      </td>
      <td style="text-align:right;font:400 12px/1.5 ${SANS};">
        <a href="${tracking.link(`${SITE_URL}/brief/archive`, "daily_archive")}" style="color:${C.gold};text-decoration:none;">Research archive →</a>
      </td>
    </tr></table>`;

  // Featured research finding — grows awareness of the citable Research Library.
  const featured = latestFindings(1)[0];
  const researchBlock = featured
    ? `
    ${eyebrow("From the research library")}
    <a href="${tracking.link(`${SITE_URL}/research/findings/${featured.slug}`, "daily_research")}" style="display:block;text-decoration:none;border:1px solid ${C.border};border-radius:14px;padding:18px 20px;">
      <div style="font:700 11px/1.3 ${SANS};letter-spacing:.14em;color:${C.gold};">${esc(featured.id)}</div>
      <div style="font:500 17px/1.35 ${SERIF};color:${C.ink};margin-top:6px;">${esc(featured.title)}</div>
      <div style="font:400 13.5px/1.55 ${SANS};color:${C.dim};margin-top:8px;">${esc(featured.summary)}</div>
      <div style="font:600 12.5px/1.3 ${SANS};color:${C.gold};margin-top:12px;">Read the research →</div>
    </a>`
    : "";

  // Section order with tier gating.
  // Free: Take, Hero, Market Health, CTA. Pro adds the rest.
  const rows: string[] = [];
  rows.push(section(take, "30px 36px 12px"));
  rows.push(section(hero, "24px 36px 16px"));
  rows.push(section(contextScoreBlock, "16px 36px 24px"));
  if (pro) rows.push(section(oneThingCard, "24px 36px"));
  if (pro) rows.push(section(confidenceBlock, "24px 36px"));
  rows.push(section(marketHealthBlock, "24px 36px"));
  if (pro && ctx) rows.push(section(contextBlock, "24px 36px"));
  if (pro) rows.push(section(analystBlock, "24px 36px"));
  if (pro && watchBlock) rows.push(section(watchBlock, "24px 36px"));
  if (pro && researchBlock) rows.push(section(researchBlock, "20px 36px"));
  if (pro) rows.push(section(delightBlock, "8px 36px 4px"));
  rows.push(section(cta, "30px 36px 18px"));
  rows.push(section(archive, "6px 36px 30px"));

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
          <td style="text-align:right;font:400 12px/1 ${SANS};color:${C.dim};">Edition #${editionNumber()} · ${esc(b.date)}</td>
        </tr></table>
        <div style="margin-top:10px;font:400 13px/1.4 ${SERIF};color:${C.faint};">
          <span style="color:${C.gold};font-weight:600;">${esc(feature.day)}</span>
          <span style="font-style:italic;"> · Today's feature: ${esc(feature.title)}</span>
        </div>
      </td></tr>

      ${rows.join("")}

      <!-- Footer -->
      <tr><td style="padding:26px 36px 30px;border-top:1px solid ${C.hair};">
        <div style="font:500 13px/1.5 ${SERIF};color:${C.sub};">The clearest view of the Bitcoin cycle.</div>
        <div style="font:400 11px/1.7 ${SANS};color:${C.faint};margin-top:12px;">
          Historical context, not a prediction. Educational analysis — not financial advice, no price targets.<br>
          You're receiving this because you joined the ${SITE_HOST} daily brief.
          <a href="${forHtmlAttr(unsubUrl)}" style="color:${C.dim};text-decoration:underline;">Unsubscribe</a>.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
${tracking.openPixel}
</body></html>`;
}
