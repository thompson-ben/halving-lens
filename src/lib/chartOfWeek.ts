// Chart of the Week — the deterministic "which single chart is most worth
// looking at this week?" selector that drives the Chart of the Week content pack.
//
// Each candidate corresponds to one chart-rendering card in the shared asset
// library. A candidate scores itself 0..1 from the live data (how strong / how
// unusual its story is this week); the highest score wins. The multi-cycle
// overlay is always present with a modest evergreen floor, so there is always a
// pick even on a quiet week.
//
// The founder can pin a specific chart with CHART_OF_WEEK_OVERRIDE (a candidate
// key like "drawdown" or a card id like "drawdowns"). Everything is derived from
// the same live accessors the rest of the site uses — nothing is fabricated, and
// the framing stays historical context, never prediction.

import type { CardId } from "./contentCards";
import { cycleSummary } from "./cycleSummary";
import { drawdownAnalysis } from "./drawdowns";
import { similarMoments } from "./similarity";
import { sentimentRead, SENTIMENT_AVAILABLE } from "./sentiment";
import { etfStats, ETF } from "./etf";
import { accumulationRead } from "./accumulation";
import { fmtUsd } from "./format";

export type ChartKey = "similar" | "drawdown" | "sentiment" | "etf" | "accumulation" | "overlay";

export interface ChartOfWeekPick {
  key: ChartKey;
  chartCard: CardId; // the chart-rendering card this pack leads with
  title: string; // editorial headline for the "why this chart" slide
  why: string[]; // 2–3 reasons this is *the* chart this week
  context: string; // one paragraph of historical context
  takeaway: string; // one-line "so what", no prediction
  link: string; // the site page this chart lives on (path, no host)
  score: number; // 0..1 selection score (shown in the studio for transparency)
  overridden: boolean; // true when pinned via CHART_OF_WEEK_OVERRIDE
}

type Candidate = Omit<ChartOfWeekPick, "overridden">;

function similarCandidate(): Candidate | null {
  const top = similarMoments(1)[0];
  if (!top) return null;
  return {
    key: "similar",
    chartCard: "similar_top3",
    score: top.similarity / 100,
    title: `Today rhymes with ${top.dateLabel}`,
    why: [
      `Today's mix of cycle position, drawdown and price heat is a ${top.similarity}% match to ${top.dateLabel} — the closest analogue in the record.`,
      "The top-3 chart lines up the nearest historical moments side by side, so you can see how alike (and how different) they really are.",
    ],
    context: `Similarity is measured across cycle day, drawdown from the high and price heat, drawn from every day since 2012. A ${top.similarity}% match means the conditions rhyme — not that the outcome will.`,
    takeaway:
      "History rhymes more than it repeats. A close match is context for what happened before, never a forecast of what comes next.",
    link: "/similar-moments",
  };
}

function drawdownCandidate(): Candidate | null {
  const dd = drawdownAnalysis();
  if (!dd.available) return null;
  const cur = Math.abs(dd.current);
  const avg = Math.abs(dd.avgAtStage);
  const rel = cur < avg - 3 ? "shallower than" : cur > avg + 3 ? "deeper than" : "in line with";
  return {
    key: "drawdown",
    chartCard: "drawdowns",
    score: Math.min(1, cur / 40),
    title: `${Math.round(cur)}% below the cycle high`,
    why: [
      `Bitcoin is ${Math.round(cur)}% off its cycle high — a correction worth putting in historical perspective.`,
      `At day ${dd.cycleDay}, that's ${rel} the ${Math.round(avg)}% prior cycles averaged at the same stage.`,
    ],
    context: `Every cycle has drawn down hard mid-run — the 2016 and 2020 cycles both saw multiple 30%+ corrections on the way up. The chart overlays each cycle's drawdown at the same cycle day, so today's ${Math.round(cur)}% sits against its true peers.`,
    takeaway: `Whether a drop is "normal" is best judged against history, not headlines — this one is ${rel} the average at this stage. Context, not a forecast.`,
    link: "/downside-scenarios",
  };
}

function sentimentCandidate(): Candidate | null {
  if (!SENTIMENT_AVAILABLE) return null;
  const sr = sentimentRead();
  if (!sr) return null;
  const fg = sr.value;
  const mood = fg <= 25 ? "extreme fear" : fg >= 75 ? "extreme greed" : sr.band.label.toLowerCase();
  return {
    key: "sentiment",
    chartCard: "fear_greed_vs_price",
    score: Math.abs(fg - 50) / 50, // full weight at the 0 / 100 extremes
    title: `Fear & Greed at ${fg} — ${mood}`,
    why: [
      `The market mood is ${mood} (Fear & Greed ${fg}). Extremes are where sentiment has mattered most historically.`,
      "Plotting Fear & Greed against price shows whether mood and price are moving together or pulling apart.",
    ],
    context:
      "Historically, extreme fear has clustered nearer cycle lows and euphoria nearer tops — but only as a rough, contrarian tell, never a timer. The chart pairs sentiment with price so you can see the relationship, not just the number.",
    takeaway:
      "Sentiment matters most at the extremes, and only as a contrarian read. Where the cycle actually sits says more than the daily mood. Context, not a forecast.",
    link: "/sentiment",
  };
}

function etfCandidate(): Candidate | null {
  if (!ETF.connected) return null;
  const wk = etfStats().trailingWeek;
  const dir = wk > 0 ? "net inflows" : wk < 0 ? "net outflows" : "flat flows";
  return {
    key: "etf",
    chartCard: "etf_trend",
    score: Math.min(1, Math.abs(wk) / 3e9),
    title: `Spot ETFs: ${fmtUsd(Math.abs(wk), { compact: true })} ${dir} this week`,
    why: [
      `US spot Bitcoin ETFs saw ${dir} of ${fmtUsd(Math.abs(wk), { compact: true })} over the last week — the regulated demand signal that didn't exist before 2024.`,
      "The 7-day and 30-day trend chart shows whether that flow is building or fading.",
    ],
    context:
      "Spot ETFs are the genuinely new variable this cycle — an at-scale, regulated buyer absent from 2012, 2016 and 2020. Sustained flows change who is buying; the chart tracks the trend rather than any single noisy day.",
    takeaway:
      "Flows are demand made visible. One week doesn't make a trend, but the direction is worth watching. Context, not a forecast.",
    link: "/etf",
  };
}

function accumulationCandidate(): Candidate | null {
  const acc = accumulationRead();
  const pctile = acc.historicalPercentile;
  const stance = acc.score >= 60 ? "historically attractive" : acc.score <= 40 ? "historically stretched" : "middling";
  return {
    key: "accumulation",
    chartCard: "accumulation",
    score: Math.abs(pctile - 50) / 50, // extreme when very cheap or very stretched vs history
    title: `Accumulation Index ${acc.score}/100 — ${stance}`,
    why: [
      `The HalvingLens Accumulation Index reads ${acc.score}/100 — more attractive than ${100 - pctile}% of all weeks since 2012.`,
      "It blends how far price sits below its long-run averages and its all-time high into a single value-of-entry read.",
    ],
    context: `The index isn't a buy signal — it's a value gauge. ${acc.reasoning}`,
    takeaway:
      "Value and timing are different questions. The index frames how cheap or dear entry looks versus history — it can't tell you what happens next.",
    link: "/accumulation",
  };
}

function overlayCandidate(): Candidate {
  const s = cycleSummary();
  return {
    key: "overlay",
    chartCard: "cycle_overlay",
    score: 0.3, // evergreen floor — there is always a chart of the week
    title: `Where the cycle sits — day ${s.cycleDay}`,
    why: [
      `Day ${s.cycleDay} of the cycle, ${s.progressPct}% through the four-year rhythm.`,
      "The multi-cycle overlay lines up every completed cycle from its halving, with today marked — the clearest single view of where we are.",
    ],
    context:
      "Only three completed cycles exist, so the overlay is a rhythm, not a schedule. It frames where price sits versus history; the ETF era is the new variable that could bend the pattern.",
    takeaway: "The overlay shows where we are, not where we're going. Historical context, not a forecast.",
    link: "/cycles",
  };
}

// Deterministic: same data snapshot → same pick, so the image route and the
// studio always agree. The overlay candidate is always present, so `cands` is
// never empty and the reduce below is safe.
export function selectChartOfWeek(): ChartOfWeekPick {
  const cands = [
    similarCandidate(),
    drawdownCandidate(),
    sentimentCandidate(),
    etfCandidate(),
    accumulationCandidate(),
    overlayCandidate(),
  ].filter((c): c is Candidate => c != null);

  // Founder override — pin a specific chart by candidate key or card id.
  const override = (process.env.CHART_OF_WEEK_OVERRIDE || "").trim().toLowerCase();
  if (override) {
    const chosen = cands.find((c) => c.key === override) || cands.find((c) => c.chartCard === override);
    if (chosen) return { ...chosen, overridden: true };
  }

  const best = cands.reduce((a, b) => (b.score > a.score ? b : a));
  return { ...best, overridden: false };
}
