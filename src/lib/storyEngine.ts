// The Editorial Story Engine — HalvingLens Social Creative Engine V2.
//
// The old social pipeline asked "what pack should we generate today?" and then
// filled a fixed template with today's numbers, so consecutive posts looked
// identical bar the digits. This engine inverts that. It asks the only question
// that matters —
//
//     "What is the single most interesting thing that happened today?"
//
// — ranks every metric's story by editorial importance, and lets that one story
// drive the headline, the hero chart, the supporting stats and the layout. It is
// deliberately metric-AGNOSTIC: adding a new metric means adding one provider to
// the registry below, and it automatically inherits scoring, headline variety,
// layout rotation and history-aware diversity. Nothing else changes.
//
// HARD RULES (shared with editorialVariety / the brief spec): deterministic from
// the brief date + persisted post history, no LLM, no network inside the pure
// core, no Math.random, no `new Date()`/`Date.now()` for logic. Every figure is
// derived from the same live accessors the rest of the site uses — nothing is
// fabricated, and the framing is always historical context, never prediction.

import type { CardId } from "./contentCards";
import { allMetricChanges, type MetricChange, type MetricId } from "./metricChange";
import { cycleSummary } from "./cycleSummary";
import { drawdownAnalysis } from "./drawdowns";
import { similarMoments } from "./similarity";
import { sentimentRead, SENTIMENT_AVAILABLE } from "./sentiment";
import { etfStats, ETF } from "./etf";
import { accumulationRead } from "./accumulation";
import { marketHealthRead } from "./marketHealth";
import { dateSeed, pickFreshest, SEED_OFFSET } from "./editorialVariety";
import { fmtUsd } from "./format";

// ── Public shapes ────────────────────────────────────────────────────────────

// The story's editorial family — used for diversity (don't run the same angle
// two days running) and for the studio's "why this story" transparency.
export type StoryCategory =
  | "demand" // ETF / institutional flows
  | "valuation" // accumulation index / how cheap vs history
  | "sentiment" // fear & greed
  | "volatility" // drawdowns / corrections
  | "health" // composite market-health scorecard
  | "similarity" // historical analogue
  | "cycle"; // where we sit in the four-year rhythm

// One approved hero layout. Rotated so consecutive posts never share a layout.
//   stacked   — headline above, large chart, supporting stats below (Layout A)
//   split     — headline + insight card left, chart right (Layout B)
//   spotlight — zoomed chart with a single highlighted annotation + stats (Layout C)
export type HeroLayout = "stacked" | "split" | "spotlight";
export const HERO_LAYOUTS: HeroLayout[] = ["stacked", "split", "spotlight"];

export interface StoryStat {
  label: string;
  value: string;
  tone?: "up" | "down" | "flat" | "accent";
}

// The nine editorial-importance factors, each normalised to 0..1 and shown in the
// studio so a pick is always explainable. Mirrors the brief's requested factors.
export interface StoryScoreBreakdown {
  magnitude: number; // size of the 7-day move (materiality-anchored)
  percentChange: number; // 7-day % change
  distanceFromNorm: number; // how far the current reading sits from its median
  thresholdCrossing: number; // crossed a band / classification boundary
  rarity: number; // how historically unusual the current reading is
  percentileMovement: number; // how far its historical percentile shifted this week
  confidence: number; // how confident the underlying read is
  supportingIndicators: number; // how many sub-indicators agree
  researchSignificance: number; // tie-in to published research (0 unless set)
}

export interface Story {
  key: string; // stable id, e.g. "etf_demand"
  category: StoryCategory;
  metricId: MetricId | null;
  heroCard: CardId; // the detailed chart slide this story leads with
  headline: string; // the chosen editorial headline (curiosity, factual)
  headlineCandidates: string[];
  deck: string; // one-line subhead under the headline
  why: string[]; // 2–3 reasons this is the story (feeds cotw_why)
  context: string; // one paragraph of historical context (feeds cotw_context)
  takeaway: string; // one-line "so what", no prediction (feeds cotw_takeaway)
  stats: StoryStat[]; // supporting statistics
  cta: { label: string; href: string };
  link: string; // site page this story lives on (path, no host)
  layout: HeroLayout; // chosen hero layout (rotated for variety)
  spark: number[]; // ~30d series (oldest→newest) for the hero chart
  sparkTone: "up" | "down" | "flat";
  score: number; // 0..1 importance AFTER diversity adjustment (ranking basis)
  rawScore: number; // 0..1 importance BEFORE diversity adjustment
  breakdown: StoryScoreBreakdown;
  diversityNote: string | null; // why it was down-weighted / promoted, if at all
  overridden: boolean; // pinned via CHART_OF_WEEK_OVERRIDE
  available: boolean;
}

// The engine's decision for a given day, threaded into the render + studio so
// they always agree.
export interface StorySelection {
  top: Story;
  ranked: Story[]; // all candidates, best-first (for studio transparency)
  generatedAt: string;
}

// A recent published post, as remembered by the persisted social-post log. The
// engine treats this as read-only history — see socialPosts.ts for the store.
export interface RecentPost {
  postDate: string; // yyyy-mm-dd (the content date)
  pack: string;
  heroCard: string | null;
  headline: string | null;
  layout: string | null;
  primaryMetric: string | null;
  category: string | null;
}

// ── Scoring model ─────────────────────────────────────────────────────────────

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

// Editorial-importance weights. Tunable in one place; they sum to 1 so `score`
// stays a clean 0..1. Magnitude and distance-from-norm carry the most weight —
// a big move in something far from normal is the strongest story.
const WEIGHTS: Record<keyof StoryScoreBreakdown, number> = {
  magnitude: 0.22,
  distanceFromNorm: 0.16,
  percentChange: 0.12,
  thresholdCrossing: 0.12,
  rarity: 0.11,
  percentileMovement: 0.09,
  supportingIndicators: 0.07,
  confidence: 0.06,
  researchSignificance: 0.05,
};

// Materiality (from metricChange) is already normalised across metrics, so it is
// the natural backbone of "magnitude" — no per-metric scale tuning needed.
const MATERIALITY_MAGNITUDE: Record<MetricChange["materiality"], number> = {
  none: 0.08,
  modest: 0.32,
  material: 0.6,
  band: 0.82,
  historic: 1,
};

// Percentile rank of `v` within `arr` (0..1). Used for percentile-movement.
function pctRank(arr: number[], v: number): number {
  if (!arr.length) return 0.5;
  const n = arr.filter((x) => x <= v).length;
  return n / arr.length;
}

// Signals a provider supplies on top of the shared metricChange substrate.
interface ProviderSignals {
  confidence?: number; // 0..1 (default 0.7)
  supporting?: { agree: number; total: number };
  rarity?: number; // explicit 0..1 (else derived from percentile)
  thresholdCrossed?: boolean; // explicit (else derived from a band change)
  researchSignificance?: number; // 0..1 (default 0)
  floor?: number; // evergreen floor so there is always a pick
}

interface RawStory {
  key: string;
  category: StoryCategory;
  metricId: MetricId | null;
  heroCard: CardId;
  headlineCandidates: string[];
  deck: string;
  why: string[];
  context: string;
  takeaway: string;
  stats: StoryStat[];
  link: string;
  ctaLabel: string;
  sparkOverride?: number[]; // for non-metric stories (similarity / cycle)
  signals: ProviderSignals;
  available: boolean;
}

interface ScoredEntry {
  raw: RawStory;
  scored: ReturnType<typeof scoreRaw>;
  historic: boolean; // metricChange materiality === "historic" → dominance exemption
}

function scoreRaw(raw: RawStory, mc: MetricChange | null): { score: number; breakdown: StoryScoreBreakdown; spark: number[]; tone: "up" | "down" | "flat" } {
  const spark = raw.sparkOverride ?? mc?.spark ?? [];
  const seven = mc?.changes.find((c) => c.period === 7) ?? null;

  const magnitude = mc ? MATERIALITY_MAGNITUDE[mc.materiality] : raw.signals.floor != null ? 0.3 : 0.2;
  const percentChange = seven?.pctChange != null ? clamp01(Math.abs(seven.pctChange) / 25) : 0;
  const distanceFromNorm = mc?.percentile != null ? Math.abs(mc.percentile - 50) / 50 : 0.3;
  const thresholdCrossing = raw.signals.thresholdCrossed || mc?.bandChanged != null ? 1 : 0;
  const rarity =
    raw.signals.rarity != null
      ? clamp01(raw.signals.rarity)
      : mc?.percentile != null
        ? Math.abs(mc.percentile - 50) / 50
        : 0.3;
  const percentileMovement = (() => {
    if (spark.length < 9) return percentChange * 0.6; // not enough history → proxy
    const cur = spark[spark.length - 1];
    const wkAgo = spark[spark.length - 8];
    return clamp01(Math.abs(pctRank(spark, cur) - pctRank(spark, wkAgo)) * 1.5);
  })();
  const confidence = clamp01(raw.signals.confidence ?? 0.7);
  const supportingIndicators = raw.signals.supporting
    ? clamp01(raw.signals.supporting.agree / Math.max(1, raw.signals.supporting.total))
    : 0.5;
  const researchSignificance = clamp01(raw.signals.researchSignificance ?? 0);

  const breakdown: StoryScoreBreakdown = {
    magnitude,
    percentChange,
    distanceFromNorm,
    thresholdCrossing,
    rarity,
    percentileMovement,
    confidence,
    supportingIndicators,
    researchSignificance,
  };

  let score = (Object.keys(WEIGHTS) as (keyof StoryScoreBreakdown)[]).reduce(
    (acc, k) => acc + WEIGHTS[k] * breakdown[k],
    0,
  );
  if (raw.signals.floor != null) score = Math.max(score, raw.signals.floor);

  const dir: "up" | "down" | "flat" = seven?.dir ?? (spark.length >= 2 ? (spark[spark.length - 1] > spark[0] ? "up" : spark[spark.length - 1] < spark[0] ? "down" : "flat") : "flat");
  return { score: clamp01(score), breakdown, spark, tone: dir };
}

// ── Diversity + headline + layout (the pure, history-aware ranking) ────────────

const HERO_WINDOW = 16; // days within which a repeated hero chart is penalised
const CATEGORY_WINDOW = 10; // days within which a repeated angle is penalised
const DOMINANCE_MARGIN = 0.22; // a raw lead this big is "genuinely today's story" → exempt from penalty

function epochDay(dateStr: string): number {
  const t = Date.parse(dateStr);
  return Number.isNaN(t) ? 0 : Math.floor(t / 86_400_000);
}

// Choose a layout that never repeats the most recent post's layout, then rotates
// deterministically by seed so it still varies day to day.
function chooseLayout(recent: RecentPost[], seed: number): HeroLayout {
  const lastLayout = recent[0]?.layout as HeroLayout | undefined;
  const pool = HERO_LAYOUTS.filter((l) => l !== lastLayout);
  const options = pool.length ? pool : HERO_LAYOUTS;
  return options[((seed % options.length) + options.length) % options.length];
}

// Rank raw stories into finished Stories, applying history-aware diversity,
// dynamic headline selection and layout rotation. Pure + deterministic given
// (raws, recent, today, seed) — unit-testable without any network.
export function rankStories(
  raws: ScoredEntry[],
  recent: RecentPost[],
  today: number,
  seed: number,
  overrideKey?: string,
): StorySelection {
  const recentHeadlines = recent.map((r) => r.headline).filter((h): h is string => !!h);

  // The raw leader (before diversity) — used for the dominance exemption.
  const rawSorted = [...raws].sort((a, b) => b.scored.score - a.scored.score);
  const rawLead = rawSorted[0];
  const rawRunnerUp = rawSorted[1];
  const dominates =
    rawLead != null &&
    (rawLead.historic || !rawRunnerUp || rawLead.scored.score - rawRunnerUp.scored.score >= DOMINANCE_MARGIN);

  const layout = chooseLayout(recent, seed);

  const stories: Story[] = raws.map(({ raw, scored }) => {
    // Diversity penalty: down-weight a hero/category/metric used recently,
    // scaled by recency (a repeat yesterday hurts far more than one two weeks ago).
    let penalty = 0;
    const notes: string[] = [];
    for (const p of recent) {
      const age = today - epochDay(p.postDate);
      if (age < 0) continue;
      if (p.heroCard === raw.heroCard && age <= HERO_WINDOW) {
        const w = (HERO_WINDOW - age) / HERO_WINDOW;
        penalty += 0.28 * w;
        notes.push(`hero reused ${age}d ago`);
      }
      if (p.category === raw.category && age <= CATEGORY_WINDOW) {
        const w = (CATEGORY_WINDOW - age) / CATEGORY_WINDOW;
        penalty += 0.14 * w;
      }
      if (p.primaryMetric && p.primaryMetric === (raw.metricId ?? raw.key) && age <= CATEGORY_WINDOW) {
        penalty += 0.06;
      }
    }
    penalty = Math.min(penalty, 0.6);

    // The exemption: the day's genuinely-biggest story still wins even if it was
    // covered recently, so we never bury a historic move for the sake of variety.
    const isRawLeader = rawLead != null && raw.key === rawLead.raw.key;
    const exempt = isRawLeader && dominates;
    const adjusted = exempt ? scored.score : clamp01(scored.score - penalty);

    let diversityNote: string | null = null;
    if (exempt && penalty > 0.05) diversityNote = "Covered recently, but still the day's biggest story — kept.";
    else if (penalty > 0.05) diversityNote = `Down-weighted for variety (${notes[0] ?? "recent repeat"}).`;

    const { value: headline } = pickFreshest(raw.headlineCandidates, recentHeadlines, seed + SEED_OFFSET.subject);

    return {
      key: raw.key,
      category: raw.category,
      metricId: raw.metricId,
      heroCard: raw.heroCard,
      headline,
      headlineCandidates: raw.headlineCandidates,
      deck: raw.deck,
      why: raw.why,
      context: raw.context,
      takeaway: raw.takeaway,
      stats: raw.stats,
      cta: { label: raw.ctaLabel, href: raw.link },
      link: raw.link,
      layout,
      spark: scored.spark,
      sparkTone: scored.tone,
      score: adjusted,
      rawScore: scored.score,
      breakdown: scored.breakdown,
      diversityNote,
      overridden: false,
      available: raw.available,
    };
  });

  // Founder override — pin a specific story by key or hero card id.
  if (overrideKey) {
    const pinned = stories.find((s) => s.key === overrideKey) || stories.find((s) => s.heroCard === overrideKey);
    if (pinned) {
      pinned.overridden = true;
      pinned.score = 1;
      pinned.diversityNote = "Pinned via CHART_OF_WEEK_OVERRIDE.";
    }
  }

  const ranked = [...stories].sort((a, b) => b.score - a.score);
  return { top: ranked[0], ranked, generatedAt: new Date(today * 86_400_000).toISOString() };
}

// ── Story providers (the registry — add a metric = add one entry here) ─────────

function providers(): RawStory[] {
  const out: RawStory[] = [];

  // 1) ETF demand — the genuinely new, at-scale, regulated buyer this cycle.
  if (ETF.connected) {
    const wk = etfStats().trailingWeek;
    const dir = wk > 0 ? "net inflows" : wk < 0 ? "net outflows" : "flat flows";
    const mag = fmtUsd(Math.abs(wk), { compact: true });
    out.push({
      key: "etf_demand",
      category: "demand",
      metricId: "etf_flow",
      heroCard: "etf_trend",
      headlineCandidates: [
        wk > 0 ? "ETF Demand Just Accelerated" : wk < 0 ? "ETF Demand Just Cooled" : "ETF Demand Went Quiet",
        `Institutions Just ${wk >= 0 ? "Bought" : "Sold"} ${mag} of Bitcoin`,
        "Who Is Actually Buying Bitcoin?",
        "The New Buyer That Didn't Exist Last Cycle",
      ],
      deck: `US spot ETFs saw ${mag} ${dir} over the last 7 trading days.`,
      why: [
        `US spot Bitcoin ETFs saw ${dir} of ${mag} over the last 7 trading days — the regulated demand signal that didn't exist before 2024.`,
        "Trends over 7 and 30 trading days show whether that flow is building or fading, not just one noisy day.",
      ],
      context:
        "Spot ETFs are the genuinely new variable this cycle — an at-scale, regulated buyer absent from 2012, 2016 and 2020. Sustained flows change who is buying; the trend matters more than any single day.",
      takeaway: "Flows are demand made visible. One week doesn't make a trend, but the direction is worth watching. Context, not a forecast.",
      stats: [
        { label: "Net flow · 7 trading days", value: `${wk >= 0 ? "+" : "−"}${mag}`, tone: wk >= 0 ? "up" : "down" },
        { label: "Direction", value: dir, tone: wk >= 0 ? "up" : "down" },
      ],
      link: "/etf",
      ctaLabel: "See ETF flows",
      signals: { confidence: 0.9, supporting: { agree: wk !== 0 ? 1 : 0, total: 1 } },
      available: true,
    });
  }

  // 2) Valuation — how cheap or dear entry looks versus all of history.
  {
    const acc = accumulationRead();
    const pctile = acc.historicalPercentile;
    const cheaperThan = 100 - pctile;
    const stance = acc.score >= 60 ? "historically attractive" : acc.score <= 40 ? "historically stretched" : "middling";
    out.push({
      key: "valuation",
      category: "valuation",
      metricId: "accumulation",
      heroCard: "accumulation",
      headlineCandidates: [
        `Bitcoin Is Cheaper Than ${cheaperThan}% Of History`,
        "How Cheap Is Bitcoin, Really?",
        `Accumulation Index Reads ${acc.score}/100`,
        "Where Value Sits Versus History",
      ],
      deck: `The Accumulation Index reads ${acc.score}/100 — ${stance}.`,
      why: [
        `The HalvingLens Accumulation Index reads ${acc.score}/100 — more attractive than ${cheaperThan}% of all weeks since 2012.`,
        "It blends how far price sits below its long-run averages and its all-time high into a single value-of-entry read.",
      ],
      context: `The index isn't a buy signal — it's a value gauge. ${acc.reasoning}`,
      takeaway:
        "Value and timing are different questions. The index frames how cheap or dear entry looks versus history — it can't tell you what happens next.",
      stats: [
        { label: "Index", value: `${acc.score}/100`, tone: "accent" },
        { label: "Cheaper than", value: `${cheaperThan}% of history` },
      ],
      link: "/accumulation",
      ctaLabel: "See the index",
      signals: {
        confidence: 0.85,
        supporting: { agree: acc.factors?.length ?? 0, total: acc.factors?.length ?? 1 },
        rarity: Math.abs(pctile - 50) / 50,
      },
      available: true,
    });
  }

  // 3) Sentiment — Fear & Greed, which matters most at the extremes.
  if (SENTIMENT_AVAILABLE) {
    const sr = sentimentRead();
    if (sr) {
      const fg = sr.value;
      const mood = fg <= 25 ? "Extreme Fear" : fg >= 75 ? "Extreme Greed" : sr.band.label;
      const extreme = fg <= 25 || fg >= 75;
      out.push({
        key: "sentiment",
        category: "sentiment",
        metricId: "sentiment",
        heroCard: "fear_greed_vs_price",
        headlineCandidates: [
          fg <= 25 ? "Fear Is Rising Again" : fg >= 75 ? "Greed Is Back" : "What Is The Market Feeling?",
          `Fear & Greed Sits At ${fg}`,
          "Mood Versus Price — Do They Agree?",
        ],
        deck: `Market mood is ${mood.toLowerCase()} — Fear & Greed at ${fg}.`,
        why: [
          `The market mood is ${mood.toLowerCase()} (Fear & Greed ${fg}). Extremes are where sentiment has mattered most historically.`,
          "Plotting Fear & Greed against price shows whether mood and price are moving together or pulling apart.",
        ],
        context:
          "Historically, extreme fear has clustered nearer cycle lows and euphoria nearer tops — but only as a rough, contrarian tell, never a timer. The chart pairs sentiment with price so you can see the relationship, not just the number.",
        takeaway:
          "Sentiment matters most at the extremes, and only as a contrarian read. Where the cycle actually sits says more than the daily mood. Context, not a forecast.",
        stats: [
          { label: "Fear & Greed", value: `${fg}`, tone: extreme ? "accent" : "flat" },
          { label: "Mood", value: mood },
        ],
        link: "/sentiment",
        ctaLabel: "See sentiment",
        signals: { confidence: 0.8, thresholdCrossed: extreme, rarity: Math.abs(fg - 50) / 50 },
        available: true,
      });
    }
  }

  // 4) Volatility — the current correction in historical perspective.
  {
    const dd = drawdownAnalysis();
    if (dd.available) {
      const cur = Math.abs(dd.current);
      const avg = Math.abs(dd.avgAtStage);
      const rel = cur < avg - 3 ? "shallower than" : cur > avg + 3 ? "deeper than" : "in line with";
      out.push({
        key: "volatility",
        category: "volatility",
        metricId: "drawdown",
        heroCard: "drawdowns",
        headlineCandidates: [
          `Bitcoin Is ${Math.round(cur)}% Off Its High`,
          "Is This Drop Normal?",
          "History Says This Correction Is Unusual".replace("Unusual", rel === "deeper than" ? "Deep" : rel === "shallower than" ? "Mild" : "Ordinary"),
          "How This Correction Compares",
        ],
        deck: `Bitcoin is ${Math.round(cur)}% below its cycle high — ${rel} the ${Math.round(avg)}% average at this stage.`,
        why: [
          `Bitcoin is ${Math.round(cur)}% off its cycle high — a correction worth putting in historical perspective.`,
          `At day ${dd.cycleDay}, that's ${rel} the ${Math.round(avg)}% prior cycles averaged at the same stage.`,
        ],
        context: `Every cycle has drawn down hard mid-run — 2016 and 2020 both saw multiple 30%+ corrections on the way up. The chart overlays each cycle's drawdown at the same cycle day, so today's ${Math.round(cur)}% sits against its true peers.`,
        takeaway: `Whether a drop is "normal" is best judged against history, not headlines — this one is ${rel} the average at this stage. Context, not a forecast.`,
        stats: [
          { label: "Off cycle high", value: `−${Math.round(cur)}%`, tone: "down" },
          { label: "Vs stage average", value: rel },
        ],
        link: "/historical-price-paths",
        ctaLabel: "See drawdowns",
        signals: { confidence: 0.85 },
        available: true,
      });
    }
  }

  // 5) Market health — the composite "how healthy is the market today?" read.
  {
    const mh = marketHealthRead();
    const factors = mh.factors ?? [];
    // Factor score is 0–100 with higher = healthier/cooler (same polarity as the
    // composite), so "constructive" = factors on the same side of the midpoint as
    // the overall read. Robust to the free-text `status` label.
    const healthy = mh.score >= 50;
    const constructive = factors.filter((f) => (healthy ? f.score >= 50 : f.score < 50)).length;
    out.push({
      key: "market_health",
      category: "health",
      metricId: "market_health",
      heroCard: "market_health",
      headlineCandidates: [
        `Market Health Reads ${mh.score}/100`,
        "How Healthy Is The Market Today?",
        `The Market Looks ${mh.label}`,
        "One Score For The Whole Market",
      ],
      deck: `The composite market-health read is ${mh.score}/100 — ${mh.label}.`,
      why: [
        `The composite Market Health score reads ${mh.score}/100 (${mh.label}), blending valuation, momentum, timing and sentiment into one number.`,
        `${constructive} of ${factors.length} underlying factors are constructive — the balance is what moves the score.`,
      ],
      context:
        "No single indicator captures a market. The scorecard combines the same factors HalvingLens tracks individually into one composite, so a day's read is a weighted balance, not one loud signal.",
      takeaway:
        "A composite smooths out the noise of any one metric. It says how balanced conditions are today — not where they go next. Context, not a forecast.",
      stats: [
        { label: "Health", value: `${mh.score}/100`, tone: "accent" },
        { label: "Constructive factors", value: `${constructive}/${factors.length}` },
      ],
      link: "/market-health",
      ctaLabel: "See market health",
      signals: {
        confidence: 0.8,
        supporting: { agree: constructive, total: Math.max(1, factors.length) },
      },
      available: true,
    });
  }

  // 6) Similarity — the strongest historical analogue to today.
  {
    const top = similarMoments(1)[0];
    if (top) {
      const spark = Array.isArray(top.spark) ? top.spark.map((s) => s.mult) : undefined;
      out.push({
        key: "similarity",
        category: "similarity",
        metricId: null,
        heroCard: "similar_top3",
        headlineCandidates: [
          "Has Bitcoin Been Here Before?",
          `Today Rhymes With ${top.dateLabel}`,
          `A ${top.similarity}% Match To ${top.dateLabel}`,
          "What This Moment Rhymes With",
        ],
        deck: `Today is a ${top.similarity}% match to ${top.dateLabel} — the closest analogue on record.`,
        why: [
          `Today's mix of cycle position, drawdown and price heat is a ${top.similarity}% match to ${top.dateLabel} — the closest analogue in the record.`,
          "The top-3 chart lines up the nearest historical moments side by side, so you can see how alike (and how different) they really are.",
        ],
        context: `Similarity is measured across cycle day, drawdown from the high and price heat, drawn from every day since 2012. A ${top.similarity}% match means the conditions rhyme — not that the outcome will.`,
        takeaway: "History rhymes more than it repeats. A close match is context for what happened before, never a forecast of what comes next.",
        stats: [
          { label: "Closest match", value: top.dateLabel, tone: "accent" },
          { label: "Similarity", value: `${top.similarity}%` },
        ],
        link: "/similar-moments",
        ctaLabel: "See similar moments",
        sparkOverride: spark,
        signals: { confidence: 0.75, rarity: clamp01(top.similarity / 100) },
        available: true,
      });
    }
  }

  // 7) Cycle position — the evergreen floor, so there is ALWAYS a pick.
  {
    const s = cycleSummary();
    out.push({
      key: "cycle_position",
      category: "cycle",
      metricId: null,
      heroCard: "cycle_overlay",
      headlineCandidates: [
        `Where Are We In The Cycle?`,
        `Day ${s.cycleDay} Of The Bitcoin Cycle`,
        "One Chart For The Whole Cycle",
        `${s.progressPct}% Through The Four-Year Rhythm`,
      ],
      deck: `Day ${s.cycleDay} — ${s.progressPct}% through the four-year rhythm.`,
      why: [
        `Day ${s.cycleDay} of the cycle, ${s.progressPct}% through the four-year rhythm.`,
        "The multi-cycle overlay lines up every completed cycle from its halving, with today marked — the clearest single view of where we are.",
      ],
      context:
        "Only three completed cycles exist, so the overlay is a rhythm, not a schedule. It frames where price sits versus history; the ETF era is the new variable that could bend the pattern.",
      takeaway: "The overlay shows where we are, not where we're going. Historical context, not a forecast.",
      stats: [
        { label: "Cycle day", value: `${s.cycleDay}`, tone: "accent" },
        { label: "Through cycle", value: `${s.progressPct}%` },
      ],
      link: "/cycles",
      ctaLabel: "See the cycle",
      signals: { confidence: 0.7, floor: 0.3 },
      available: true,
    });
  }

  return out.filter((r) => r.available);
}

// ── Public entry points ────────────────────────────────────────────────────────

// The synchronous, deterministic core. `recentPosts` defaults to none, so the
// render pipeline and sync callers (selectChartOfWeek, episode brief) still work
// without a history fetch — they just get the pure top-score pick. Async callers
// (the image route, the studio) fetch history and pass it for full diversity.
export function storyEngine(opts: { recentPosts?: RecentPost[]; seed?: number } = {}): StorySelection {
  const recent = (opts.recentPosts ?? []).slice().sort((a, b) => epochDay(b.postDate) - epochDay(a.postDate));
  const seed = opts.seed ?? dateSeed();
  const mcById = new Map<MetricId, MetricChange>();
  for (const mc of allMetricChanges()) mcById.set(mc.id, mc);

  const raws: ScoredEntry[] = providers().map((raw) => {
    const mc = raw.metricId ? mcById.get(raw.metricId) ?? null : null;
    return { raw, scored: scoreRaw(raw, mc), historic: mc?.materiality === "historic" };
  });

  const override = (process.env.CHART_OF_WEEK_OVERRIDE || "").trim().toLowerCase() || undefined;
  return rankStories(raws, recent, seed, seed, override);
}

// Convenience: today's single most interesting story.
export function selectTopStory(recentPosts?: RecentPost[]): Story {
  return storyEngine({ recentPosts }).top;
}
