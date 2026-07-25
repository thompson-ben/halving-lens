// Daily Reel package generator — the short-form video brief. Unlike the carousel
// packs, this produces a ready-to-shoot script: title, hook, voiceover,
// storyboard, on-screen text, CTA and an Instagram caption, all built from the
// live snapshot. No fabricated numbers — every figure traces to the engine.
//
// Philosophy (per product brief): the reel does NOT re-read the Daily Brief. It
// finds the single most interesting insight today and builds the reel around it,
// answering one question — "what would make a Bitcoin investor stop scrolling?".
// Tone is Bloomberg / Glassnode / The Economist, never crypto-influencer.

import { format } from "date-fns";
import { SITE_HOST } from "./site";
import { SOURCE } from "./btcData";
import { cycleSummary, HEAT_LABEL, type HeatLevel } from "./cycleSummary";
import { cycleDivergence, recentChange } from "./cycleIntel";
import { ETF, etfStats, type EtfStats } from "./etf";
import { SENTIMENT_AVAILABLE, currentSentiment, sentimentChange, bandFor } from "./sentiment";
import { downsideScenarios } from "./downside";
import { similarMoments, type SimilarMoment } from "./similarity";
import { fmtUsd } from "./format";
import { productionCostRead } from "./productionCost";
import { todaySlug, priorBrief } from "./briefArchive";
import { STORED_BRIEFS } from "./data/briefs";

// The concept the reel is built around. Persisted with each day so the selector
// can avoid repeating the same angle on consecutive days (repetition control).
export type ReelAngle =
  | "cycle_divergence"
  | "etf_flows"
  | "sentiment"
  | "risk_level"
  | "downside"
  | "similar_moment"
  | "price_move"
  | "production_cost"
  | "general";

export interface ReelScene {
  n: number;
  durationSec: number;
  action: string; // what to film / screen-record
  source: string; // which screen of the site to capture
  onScreenText: string; // the overlay for this scene
}

export interface ReelPackage {
  date: string;
  angle: ReelAngle;
  angleLabel: string;
  insight: string; // the single most interesting insight today (one sentence)
  title: string; // ≤ 8 words
  hook: string; // 0–3s, large on-screen text, uppercase
  voiceover: string; // 20–30s, ≤ 90 words, HOOK → INSIGHT → EXPLANATION → CTA
  voiceoverWordCount: number;
  estDurationSec: number;
  storyboard: ReelScene[]; // 5 scenes
  onScreenText: string[]; // every overlay, deduped
  cta: string;
  instagram: string; // caption + engagement question + 5 hashtags
}

// ── helpers ─────────────────────────────────────────────────────────────────

const RISK_SHORT: Record<HeatLevel, string> = {
  cool: "Cooler",
  neutral: "Neutral",
  heating: "Warming",
  elevated: "Elevated",
  euphoria: "Euphoric",
};

const HEAT_ORDER: HeatLevel[] = ["cool", "neutral", "heating", "elevated", "euphoria"];

function num(n: number): string {
  return ["zero", "one", "two", "three", "four", "five"][n] ?? String(n);
}

function words(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

// Trim copy to a hard word budget, keeping a clean sentence end. Safety net so
// the voiceover never breaks the ≤90-word rule even as live numbers grow.
function clampWords(s: string, max: number): string {
  const w = s.trim().split(/\s+/);
  if (w.length <= max) return s.trim();
  let out = w.slice(0, max).join(" ").replace(/[,;:\-]+$/, "");
  if (!/[.!?]$/.test(out)) out += ".";
  return out;
}

function truncateWords(s: string, max: number): string {
  const w = s.trim().split(/\s+/);
  return w.length <= max ? s.trim() : w.slice(0, max).join(" ");
}

function dedupe(xs: string[]): string[] {
  return [...new Set(xs.filter((x) => x && x.trim()))];
}

// Two CTAs, rotated naturally by date so the channel doesn't repeat one line.
function pickCta(slug: string): { screen: string; spoken: string } {
  const idx = Number(slug.replace(/-/g, "")) % 2;
  return idx === 0
    ? { screen: "Follow for daily Bitcoin cycle updates.", spoken: "Follow for the daily cycle read." }
    : { screen: `See today's full cycle brief at ${SITE_HOST}`, spoken: "See today's full brief at halving lens dot com." };
}

const ENGAGEMENT_Q: Record<ReelAngle, string> = {
  cycle_divergence: "Is this cycle genuinely different — or just slower? 👇",
  etf_flows: "Are ETFs permanently rewriting Bitcoin's cycles? 👇",
  sentiment: "Right now — are you fearful or greedy? 👇",
  production_cost: "Did you expect mining one Bitcoin to cost this much? 👇",
  risk_level: "Does this risk read match how the market feels to you? 👇",
  downside: "What would you call a 'normal' dip from here? 👇",
  similar_moment: "Does history rhyme — or is this time different? 👇",
  price_move: "Daily noise, or the start of a trend? 👇",
  general: "Where do you think we are in the cycle? 👇",
};

// ── shared live context ──────────────────────────────────────────────────────

interface Ctx {
  s: ReturnType<typeof cycleSummary>;
  div: ReturnType<typeof cycleDivergence>;
  prior: ReturnType<typeof priorBrief>;
  etf: EtfStats | null;
  sentValue: number | null;
  sentDelta: number | null;
  ds: ReturnType<typeof downsideScenarios>;
  sim: SimilarMoment | null;
  rc: ReturnType<typeof recentChange>;
}

function buildCtx(): Ctx {
  const sent = SENTIMENT_AVAILABLE ? currentSentiment() : null;
  const ch = SENTIMENT_AVAILABLE ? sentimentChange(30) : null;
  return {
    s: cycleSummary(),
    div: cycleDivergence(),
    prior: priorBrief(),
    etf: ETF.connected ? etfStats() : null,
    sentValue: sent?.value ?? null,
    sentDelta: ch?.delta ?? null,
    ds: downsideScenarios(),
    sim: similarMoments(1)[0] ?? null,
    rc: recentChange(),
  };
}

// A candidate angle: its priority (1 = strongest), whether it has a genuinely
// interesting story right now, and all the copy for it.
interface AngleContent {
  angle: ReelAngle;
  priority: number;
  available: boolean;
  angleLabel: string;
  insight: string;
  title: string;
  hook: string;
  voHook: string;
  voInsight: string;
  voExplain: string;
  midScenes: Array<Omit<ReelScene, "n" | "durationSec">>; // scenes 2–4
  statOverlays: string[];
}

// ── angle builders ───────────────────────────────────────────────────────────

function cycleDivergenceAngle({ s, div }: Ctx): AngleContent {
  const allPeaked = div.priorsPeakedByNow === div.priorCount && div.priorCount > 0;
  const peaked = allPeaked
    ? `all ${num(div.priorCount)} of Bitcoin's previous cycles had already topped`
    : div.priorsPeakedByNow > 0
      ? `${num(div.priorsPeakedByNow)} of its last ${num(div.priorCount)} cycles had already topped`
      : "previous cycles were behaving very differently";
  return {
    angle: "cycle_divergence",
    priority: 1,
    available: div.later || div.cooler,
    angleLabel: "Cycle divergence",
    insight: `By day ${s.cycleDay}, ${peaked} — this cycle hasn't.`,
    title: allPeaked ? "Every Past Cycle Had Already Peaked" : "Bitcoin Is Breaking The Cycle Pattern",
    hook: allPeaked ? "EVERY PREVIOUS CYCLE HAD ALREADY PEAKED" : "BITCOIN IS BREAKING THE PATTERN",
    voHook: "By this many days after the halving, Bitcoin's past cycles had usually already peaked.",
    voInsight: `We're ${s.progressPct}% through the cycle on day ${s.cycleDay}, and ${peaked}.`,
    voExplain:
      "This one is flatter, slower, and — for the first time — backed by spot ETF demand. A different structure, running to a different clock.",
    midScenes: [
      {
        action: "Open the homepage 'Today vs Prior Cycles' overlay and let every cycle line draw in.",
        source: `${SITE_HOST} — homepage cycle overlay`,
        onScreenText: `Day ${s.cycleDay} · ${s.progressPct}% through`,
      },
      {
        action: "Pan left to where the older cycle lines roll over and peak — clearly before today's marker.",
        source: "/cycles",
        onScreenText: `${div.priorsPeakedByNow}/${div.priorCount} past cycles had peaked by now`,
      },
      {
        action: "Settle on the current-cycle marker sitting lower and flatter than the rest.",
        source: "/cycles — current-cycle marker",
        onScreenText: "Flatter · slower · ETF-supported",
      },
    ],
    statOverlays: [`${s.progressPct}% Through Cycle`, `Risk: ${RISK_SHORT[s.heat]}`],
  };
}

function etfAngle({ s, etf }: Ctx): AngleContent {
  const wk = etf?.trailingWeek ?? 0;
  const inflow = wk >= 0;
  const mag = fmtUsd(Math.abs(wk), { compact: true });
  const cum = etf ? fmtUsd(etf.cumulative, { compact: true }) : "";
  return {
    angle: "etf_flows",
    priority: 2,
    available: !!etf && Math.abs(wk) >= 5e8,
    angleLabel: "ETF flows",
    insight: inflow
      ? `Spot Bitcoin ETFs absorbed about ${mag} of net buying in a week — a buyer prior cycles never had.`
      : `Spot Bitcoin ETFs shed about ${mag} in a week — the first real test of this cycle's new buyer.`,
    title: inflow ? "The Buyer Prior Cycles Never Had" : "ETF Demand Just Cooled",
    hook: inflow ? "ETFS ARE QUIETLY ABSORBING THE MARKET" : "THE ETF BID JUST BLINKED",
    voHook: "Every Bitcoin cycle until this one ran without spot ETFs.",
    voInsight: inflow
      ? `In the past week alone, US spot ETFs took in around ${mag}, lifting cumulative demand to ${cum}.`
      : `In the past week, US spot ETFs saw around ${mag} of net outflows, with cumulative demand at ${cum}.`,
    voExplain:
      "That structural bid is the cleanest explanation for why this cycle has climbed flatter and slower than the ones before it.",
    midScenes: [
      {
        action: "Open the ETF flows page and let the cumulative-flow chart load.",
        source: "/etf",
        onScreenText: `Cumulative ETF demand: ${cum}`,
      },
      {
        action: "Highlight the most recent week of daily flow bars.",
        source: "/etf — daily flows",
        onScreenText: `${inflow ? "+" : "−"}${mag} this week`,
      },
      {
        action: "Cut to the homepage cycle overlay to connect ETF demand with the flatter price path.",
        source: `${SITE_HOST} — cycle overlay`,
        onScreenText: "A new buyer, a new rhythm",
      },
    ],
    statOverlays: ["ETF Era", `Risk: ${RISK_SHORT[s.heat]}`],
  };
}

function sentimentAngle({ s, sentValue, sentDelta }: Ctx): AngleContent {
  const v = sentValue;
  const band = v != null ? bandFor(v) : null;
  const extremeLow = v != null && v <= 25;
  const extremeHigh = v != null && v >= 70;
  const bigShift = sentDelta != null && Math.abs(sentDelta) >= 15;
  const label = band?.label ?? "";
  return {
    angle: "sentiment",
    priority: 3,
    available: SENTIMENT_AVAILABLE && v != null && (extremeLow || extremeHigh || bigShift),
    angleLabel: "Sentiment",
    insight: extremeLow
      ? `The crowd is in ${label.toLowerCase()} (Fear & Greed ${v}/100) — historically near where lows have formed.`
      : extremeHigh
        ? `Greed is back (Fear & Greed ${v}/100) — the zone that's tended to appear late in cycles.`
        : `Sentiment swung ${sentDelta != null && sentDelta >= 0 ? "up" : "down"} ${Math.abs(sentDelta ?? 0)} points in a month to ${v}/100.`,
    title: extremeLow ? "When Everyone Is Afraid" : extremeHigh ? "Greed Is Creeping Back In" : "The Mood Just Shifted Fast",
    hook: extremeLow ? "EXTREME FEAR HAS MARKED PAST LOWS" : extremeHigh ? "GREED IS BUILDING AGAIN" : "SENTIMENT JUST MOVED FAST",
    voHook: "Crowd psychology is loudest exactly when it's least reliable.",
    voInsight: extremeLow
      ? `The Fear and Greed index reads ${v} out of 100 — deep fear. Historically, that's clustered closer to lows than tops.`
      : extremeHigh
        ? `The Fear and Greed index reads ${v} out of 100 — greed. That's the territory that's tended to show up late in past cycles.`
        : `The Fear and Greed index has moved sharply this month, now at ${v} out of 100.`,
    voExplain:
      "It's a contrarian read, not a timing tool — most useful at the extremes, where emotion and price tend to part ways.",
    midScenes: [
      {
        action: "Open the sentiment page; let the Fear & Greed gauge animate to today's reading.",
        source: "/sentiment",
        onScreenText: `Fear & Greed: ${v}/100`,
      },
      {
        action: "Scroll to the sentiment-vs-price overlay to show where past extremes lined up.",
        source: "/sentiment — vs price",
        onScreenText: extremeLow ? "Fear has marked past lows" : "Extremes mark turning points",
      },
      {
        action: "Cut back to the homepage cycle read.",
        source: `${SITE_HOST}`,
        onScreenText: `Risk: ${RISK_SHORT[s.heat]}`,
      },
    ],
    statOverlays: [label, `Fear & Greed ${v}/100`],
  };
}

function riskAngle({ s, prior }: Ctx): AngleContent {
  const priorHeat = (prior?.heat as HeatLevel) ?? null;
  const changed = !!priorHeat && priorHeat !== s.heat;
  const extreme = s.heat === "euphoria" || s.heat === "cool";
  const dir = changed ? (HEAT_ORDER.indexOf(s.heat) > HEAT_ORDER.indexOf(priorHeat) ? "up" : "down") : null;
  const pctlPhrase = s.heatPercentile != null ? `, around the ${s.heatPercentile}th percentile of its range` : "";
  return {
    angle: "risk_level",
    priority: 4,
    available: changed || extreme,
    angleLabel: "Risk level",
    insight: changed
      ? `Bitcoin's risk read just ${dir === "up" ? "rose" : "eased"} to ${HEAT_LABEL[s.heat].toLowerCase()}.`
      : `Bitcoin sits in the ${HEAT_LABEL[s.heat].toLowerCase()} part of its historical range${s.heatPercentile != null ? ` — ${s.heatPercentile}th percentile` : ""}.`,
    title: changed ? "The Risk Read Just Changed" : s.heat === "cool" ? "Cooler Than It Looks Right Now" : "Bitcoin Is Running Hot",
    hook: changed ? "THE RISK LEVEL JUST CHANGED" : s.heat === "cool" ? "COOLER THAN THE HEADLINES SUGGEST" : "THIS IS HISTORICALLY HOT",
    voHook: "One number tracks how stretched Bitcoin is versus its own history.",
    voInsight: changed
      ? `Today the risk read ${dir === "up" ? "climbed" : "eased"} to ${HEAT_LABEL[s.heat].toLowerCase()}${pctlPhrase}.`
      : `Right now it sits ${HEAT_LABEL[s.heat].toLowerCase()}${pctlPhrase}.`,
    voExplain:
      "It measures price against its long-term average — not a buy or sell signal, just an honest read of how hot the moment is.",
    midScenes: [
      {
        action: "Open the homepage and let the risk read / cycle scorecard settle.",
        source: `${SITE_HOST}`,
        onScreenText: `Risk: ${HEAT_LABEL[s.heat]}`,
      },
      {
        action: "Scroll to the cycle scorecard factors.",
        source: "/cycles",
        onScreenText: s.heatPercentile != null ? `${s.heatPercentile}th percentile of range` : "Historical risk read",
      },
      {
        action: "End on the Today vs Prior Cycles overlay for context.",
        source: "/cycles — overlay",
        onScreenText: changed ? `Now: ${RISK_SHORT[s.heat]}` : "Where we sit vs history",
      },
    ],
    statOverlays: [`Risk: ${RISK_SHORT[s.heat]}`, s.heatPercentile != null ? `${s.heatPercentile}th percentile` : "Cycle read"],
  };
}

function downsideAngle({ s, ds }: Ctx): AngleContent {
  const avgPct = ds.averagePct; // negative %
  const levelPrice = avgPct != null ? fmtUsd(ds.currentPrice * (1 + avgPct / 100)) : "";
  const drop = avgPct != null ? Math.round(Math.abs(avgPct)) : null;
  return {
    angle: "downside",
    priority: 5,
    available: ds.available && avgPct != null,
    angleLabel: "Downside scenarios",
    insight: avgPct != null
      ? `A typical past cycle correction from here would put Bitcoin near ${levelPrice}, about ${drop}% lower.`
      : "History maps out where Bitcoin's support has tended to form.",
    title: "How Far Could Bitcoin Fall?",
    hook: "HOW FAR HAS IT FALLEN BEFORE?",
    voHook: "Every Bitcoin cycle has included a double-digit drawdown — usually more than one.",
    voInsight: avgPct != null
      ? `Applying the average historical correction to today's price points toward roughly ${levelPrice}, about ${drop}% below here.`
      : "Mapping past corrections onto today shows where support has historically formed.",
    voExplain:
      "These are historical reference points, not predictions — context for how normal volatility looks inside a Bitcoin cycle.",
    midScenes: [
      {
        action: "Open the Downside Scenarios page; let the ladder of levels load.",
        source: "/downside-scenarios",
        onScreenText: "Downside scenarios",
      },
      {
        action: "Highlight the average-correction level and its distance below current price.",
        source: "/downside-scenarios — ladder",
        onScreenText: avgPct != null ? `Avg correction → ${levelPrice}` : "Where support has formed",
      },
      {
        action: "Cut to the cycle drawdowns view for historical context.",
        source: "/cycles — drawdowns",
        onScreenText: "Volatility is the norm, not the exception",
      },
    ],
    statOverlays: [avgPct != null ? `Avg drawdown: ${drop}%` : "Downside context", "History, not a forecast", `Risk: ${RISK_SHORT[s.heat]}`],
  };
}

function similarAngle({ sim }: Ctx): AngleContent {
  const when = sim?.dateLabel ?? "";
  const d90 = sim?.next.d90 ?? null;
  const nextTxt = d90 != null ? `${d90 >= 0 ? "+" : ""}${d90}% over the next 90 days` : "a notable move next";
  return {
    angle: "similar_moment",
    priority: 6,
    available: !!sim && sim.similarity >= 75,
    angleLabel: "Similar moment",
    insight: sim ? `Today is a ${sim.similarity}% match for ${when} — what followed then was ${nextTxt}.` : "",
    title: sim ? truncateWords(`This Looks A Lot Like ${when}`, 8) : "We've Been Here Before",
    hook: "WE'VE BEEN HERE BEFORE",
    voHook: "The cycle doesn't repeat, but it does rhyme.",
    voInsight: sim
      ? `Today's setup is a ${sim.similarity}% match for ${when}: similar position, similar stretch, similar mood.`
      : "Today's setup closely echoes an earlier moment in Bitcoin's history.",
    voExplain: d90 != null
      ? `Back then, what came next was ${nextTxt} — history, not a promise, but a useful reference point.`
      : "What came next then is useful historical context, not a forecast.",
    midScenes: [
      {
        action: "Open the Similar Moments page; let the closest historical match load.",
        source: "/similar-moments",
        onScreenText: sim ? `${sim.similarity}% match: ${when}` : "Closest historical match",
      },
      {
        action: "Show the 'what happened next' 30/60/90-day panel for that match.",
        source: "/similar-moments — what happened next",
        onScreenText: d90 != null ? `Next 90 days then: ${d90 >= 0 ? "+" : ""}${d90}%` : "What happened next",
      },
      {
        action: "Cut to the homepage cycle overlay to place today in context.",
        source: `${SITE_HOST} — overlay`,
        onScreenText: "History rhymes, it doesn't repeat",
      },
    ],
    statOverlays: [sim ? `${sim.similarity}% Match` : "Historical echo", when || "Past analogue"],
  };
}

function priceAngle({ s, rc }: Ctx): AngleContent {
  const move = s.change24h != null ? s.change24h : rc?.pct ?? null;
  const label = s.change24h != null ? "24 hours" : rc ? `${rc.days} days` : "recently";
  const up = (move ?? 0) >= 0;
  const movePct = move != null ? `${up ? "+" : ""}${move.toFixed(1)}%` : "";
  return {
    angle: "price_move",
    priority: 7,
    available: (s.change24h != null && Math.abs(s.change24h) >= 4) || (!!rc && Math.abs(rc.pct) >= 8),
    angleLabel: "Price move",
    insight: `Bitcoin ${up ? "jumped" : "dropped"} ${movePct} in ${label} — but a single move says little about the cycle.`,
    title: "What This Move Actually Means",
    hook: up ? "ONE GREEN DAY ISN'T A CYCLE" : "ONE RED DAY ISN'T THE TOP",
    voHook: `Bitcoin just moved ${movePct} in ${label}.`,
    voInsight: `It's the kind of move that fills timelines, but on its own it barely registers against where we are: day ${s.cycleDay}, ${s.progressPct}% through the cycle.`,
    voExplain:
      "Zoom out and the picture is steadier — cooler and flatter than past cycles at the same stage. The trend, not the candle, is the story.",
    midScenes: [
      {
        action: "Open the price page; let the recent price action load.",
        source: "/price",
        onScreenText: `BTC ${fmtUsd(s.price)} · ${movePct}`,
      },
      {
        action: "Zoom out to the full cycle to shrink the daily move into context.",
        source: "/price — full cycle",
        onScreenText: `Day ${s.cycleDay} · ${s.progressPct}% through`,
      },
      {
        action: "Cut to the Today vs Prior Cycles overlay.",
        source: "/cycles — overlay",
        onScreenText: "The trend, not the candle",
      },
    ],
    statOverlays: [`BTC ${fmtUsd(s.price)}`, `${movePct} · ${label}`],
  };
}

// Estimated Mining Cost — the evergreen "how much does it cost to mine one
// Bitcoin?" educational angle, strongest when Market Price crosses or nears
// the modelled estimate. MODELLED language is baked into every line; never a
// price floor, never a prediction.
function productionCostAngle(_ctx: Ctx): AngleContent {
  const r = productionCostRead();
  const available = r.available && r.premiumPct != null && r.central != null;
  const premium = r.premiumPct ?? 0;
  const nearOrBelow = available && premium < 33;
  const rel = premium >= 0 ? "above" : "below";
  const cost = available ? fmtUsd(r.central!, { compact: true }) : "";
  const price = r.marketPrice != null ? fmtUsd(r.marketPrice, { compact: true }) : "";
  return {
    angle: "production_cost",
    // Stronger story when margins are compressed or negative; otherwise a
    // low-priority evergreen educational rotation.
    priority: nearOrBelow ? 2 : 6,
    available,
    angleLabel: "Estimated Mining Cost",
    insight: `Bitcoin trades ${Math.abs(premium).toFixed(0)}% ${rel} its estimated mining cost (${cost}, modelled).`,
    title: nearOrBelow ? "Mining Margins Just Compressed" : "How Much Does It Cost to Mine One Bitcoin?",
    hook: nearOrBelow ? "MINING MARGINS ARE COMPRESSED" : "WHAT DOES ONE BITCOIN COST TO MINE?",
    voHook: "How much does it actually cost to mine one Bitcoin?",
    voInsight: `Our modelled estimate — live network hashrate, documented efficiency and electricity assumptions — puts the average electricity cost at about ${cost}. Bitcoin trades at ${price}, ${Math.abs(premium).toFixed(0)} percent ${rel} that estimate.`,
    voExplain:
      "Every miner's real costs differ, and this is not a price floor — difficulty adjusts and hardware varies. It's historical context for how mining economics sit today, not a prediction.",
    midScenes: [
      {
        action: "Open the Estimated Mining Cost page and let the price-vs-cost chart draw in.",
        source: "/metrics/cost-of-production",
        onScreenText: `Estimated cost: ${cost} · Modelled`,
      },
      {
        action: "Hover the current reading — price, estimated cost, and the premium side by side.",
        source: "/metrics/cost-of-production — current reading",
        onScreenText: `Market Price ${Math.abs(premium).toFixed(0)}% ${rel} estimated cost`,
      },
      {
        action: "Show the Reference Prices panel on the State of Bitcoin — the three prices together.",
        source: "/state-of-bitcoin — Reference Prices",
        onScreenText: "Market · Realised · Production",
      },
    ],
    statOverlays: [`Est. cost ${cost}`, `${premium >= 0 ? "+" : "−"}${Math.abs(premium).toFixed(0)}% vs cost`],
  };
}

function generalAngle({ s, div }: Ctx): AngleContent {
  const diverging = div.cooler || div.later;
  return {
    angle: "general",
    priority: 8,
    available: true,
    angleLabel: "Cycle read",
    insight: `Bitcoin is on day ${s.cycleDay} (${s.progressPct}% through) and ${div.cooler ? "running cooler than" : "broadly tracking"} prior cycles.`,
    title: "Where Bitcoin Sits In The Cycle",
    hook: "WHERE ARE WE IN THE BITCOIN CYCLE?",
    voHook: "Forget the daily noise — here's where Bitcoin actually sits in its cycle.",
    voInsight: `We're on day ${s.cycleDay}, ${s.progressPct}% through the four-year rhythm, and the read is ${RISK_SHORT[s.heat].toLowerCase()}.`,
    voExplain: diverging
      ? "Compared with past cycles at this stage, this one is running flatter and later — slower, and structurally supported by ETF demand."
      : "It's broadly tracking the path past cycles took at the same stage after the halving.",
    midScenes: [
      {
        action: "Open the homepage; let the cycle read and risk gauge settle.",
        source: `${SITE_HOST}`,
        onScreenText: `Day ${s.cycleDay} · ${s.progressPct}% through`,
      },
      {
        action: "Scroll through the Today vs Prior Cycles overlay.",
        source: "/cycles — overlay",
        onScreenText: `Risk: ${RISK_SHORT[s.heat]}`,
      },
      {
        action: "End on the cycle position marker.",
        source: "/cycles — marker",
        onScreenText: div.cooler ? "Cooler than prior cycles" : "Tracking prior cycles",
      },
    ],
    statOverlays: [`${s.progressPct}% Through Cycle`, `Risk: ${RISK_SHORT[s.heat]}`],
  };
}

// ── selection (priority + repetition control) ────────────────────────────────

// How many of the most recent reels an angle must sit outside of to count as
// "fresh". Keeps a strong-but-evergreen story (e.g. cycle divergence) from
// appearing in every reel, while still letting it return after a short gap.
const AVOID_RECENT = 2;

// The angles used by the most recent reels (newest first), read from the
// persisted brief archive. Drives "prefer new angles where possible".
export function recentReelAngles(n = 6): ReelAngle[] {
  const t = todaySlug();
  return STORED_BRIEFS.filter((b) => b.slug < t && b.reel?.angle)
    .sort((a, b) => (a.slug < b.slug ? 1 : -1))
    .slice(0, n)
    .map((b) => b.reel!.angle);
}

// Pick the strongest available story (lowest priority number), but skip any
// angle used in the last AVOID_RECENT reels so the channel doesn't repeat a
// narrative day after day. If every available angle was used recently, fall
// back to the least-recently-used one (tie-break: strongest priority).
function selectAngle(candidates: AngleContent[], recent: ReelAngle[]): AngleContent {
  const pool = candidates.filter((c) => c.available);
  const usable = pool.length ? pool : candidates.filter((c) => c.angle === "general");
  const recentlyUsed = new Set(recent.slice(0, AVOID_RECENT));

  const fresh = usable.filter((c) => !recentlyUsed.has(c.angle)).sort((a, b) => a.priority - b.priority);
  if (fresh.length) return fresh[0];

  // Everything available was used recently — choose the least recent, then
  // strongest, so we still rotate rather than locking onto one angle.
  return [...usable].sort((a, b) => {
    const ra = recent.indexOf(a.angle);
    const rb = recent.indexOf(b.angle);
    if (ra !== rb) return rb - ra; // larger index = used longer ago = preferred
    return a.priority - b.priority;
  })[0];
}

// ── assembly ─────────────────────────────────────────────────────────────────

function buildStoryboard(c: AngleContent, ctaScreen: string): ReelScene[] {
  const durations = [3, 6, 7, 6, 3]; // → ~25s
  const scenes: ReelScene[] = [
    {
      n: 1,
      durationSec: durations[0],
      action: "Open on the homepage hero; punch in the hook as large on-screen text over a slow zoom.",
      source: `${SITE_HOST} — homepage hero`,
      onScreenText: c.hook,
    },
  ];
  c.midScenes.forEach((m, i) => scenes.push({ n: i + 2, durationSec: durations[i + 1], ...m }));
  scenes.push({
    n: 5,
    durationSec: durations[4],
    action: "Cut to a clean HalvingLens logo card; hold for the CTA.",
    source: "HalvingLens logo / outro card",
    onScreenText: ctaScreen,
  });
  return scenes;
}

function reelCaption(c: AngleContent): string {
  return [
    c.insight,
    "",
    ENGAGEMENT_Q[c.angle],
    "",
    "Educational analysis, not financial advice.",
    "",
    "#Bitcoin #BTC #BitcoinCycle #CryptoInvesting #HalvingLens",
  ].join("\n");
}

export function reelPackage(): ReelPackage {
  const ctx = buildCtx();
  const candidates: AngleContent[] = [
    cycleDivergenceAngle(ctx),
    etfAngle(ctx),
    sentimentAngle(ctx),
    riskAngle(ctx),
    downsideAngle(ctx),
    similarAngle(ctx),
    priceAngle(ctx),
    productionCostAngle(ctx),
    generalAngle(ctx),
  ];
  const chosen = selectAngle(candidates, recentReelAngles(6));

  const day = SOURCE.fetchedAt ? new Date(SOURCE.fetchedAt) : new Date();
  const slug = format(day, "yyyy-MM-dd");
  const cta = pickCta(slug);

  const storyboard = buildStoryboard(chosen, cta.screen);
  const voiceover = clampWords(
    [chosen.voHook, chosen.voInsight, chosen.voExplain, cta.spoken].join(" ").replace(/\s+/g, " ").trim(),
    90,
  );
  const onScreenText = dedupe([chosen.hook, ...chosen.statOverlays, ...chosen.midScenes.map((m) => m.onScreenText), cta.screen]);

  return {
    date: format(day, "d MMMM yyyy"),
    angle: chosen.angle,
    angleLabel: chosen.angleLabel,
    insight: chosen.insight,
    title: truncateWords(chosen.title, 8),
    hook: chosen.hook,
    voiceover,
    voiceoverWordCount: words(voiceover),
    estDurationSec: storyboard.reduce((a, sc) => a + sc.durationSec, 0),
    storyboard,
    onScreenText,
    cta: cta.screen,
    instagram: reelCaption(chosen),
  };
}

// Flat, copy-paste production script — everything a creator needs in one block.
export function reelScriptText(r: ReelPackage): string {
  const lines: string[] = [
    `DAILY REEL — ${r.date}`,
    `Angle: ${r.angleLabel}`,
    `Insight: ${r.insight}`,
    "",
    `TITLE: ${r.title}`,
    "",
    `HOOK (0–3s): ${r.hook}`,
    "",
    `VOICEOVER (${r.voiceoverWordCount} words · ~${r.estDurationSec}s):`,
    r.voiceover,
    "",
    "STORYBOARD:",
  ];
  for (const sc of r.storyboard) {
    lines.push(
      `  Scene ${sc.n} (${sc.durationSec}s) — ${sc.action}`,
      `     Screen: ${sc.source}`,
      `     On-screen: "${sc.onScreenText}"`,
    );
  }
  lines.push("", "ON-SCREEN TEXT:");
  for (const t of r.onScreenText) lines.push(`  • ${t}`);
  lines.push("", `CTA: ${r.cta}`, "", "INSTAGRAM CAPTION:", r.instagram);
  return lines.join("\n");
}
