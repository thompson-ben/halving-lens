// HalvingLens Accumulation Score — a price-only, point-in-time "how attractive
// were conditions to accumulate, historically" gauge. Educational context, never
// advice: it answers "where does today sit in Bitcoin's historical range", not
// "buy" or "sell".
//
// DESIGN PRINCIPLES
//   • Price-only. Every input is real across ALL cycles (2012→today): the Mayer
//     Multiple (price / 200-day MA, already on each sample), the 200-week MA
//     multiple, and drawdown from the running all-time high. We deliberately do
//     NOT use MVRV/NUPL/ETF/Fear&Greed in the score — those are synthetic for
//     past cycles or didn't exist, so they cannot be honestly backtested.
//   • Point-in-time. Trailing moving averages and a running ATH use only data up
//     to each date — no look-ahead — so a historical score is exactly what an
//     observer would have seen then. This is what makes the backtest legitimate.
//   • Fixed, published mappings (not percentile ranks), so the score is stable
//     and transparent rather than re-ranked by future data.
//
// SCORE DIRECTION: 0 = historically deep value, 100 = historically overheated.

import { CYCLES } from "./btcData";

const MS_DAY = 86_400_000;
const WEEK = 7 * MS_DAY;

export type AccumulationBandKey = "deep_value" | "attractive" | "neutral" | "elevated" | "overheated";

export interface AccumulationBand {
  key: AccumulationBandKey;
  label: string;
  range: [number, number];
  color: string; // hex, opportunity→risk ramp (cool/cyan = deep value, red = overheated)
  context: string; // historical framing, compliance-safe
}

// The five environments, lowest score (most attractive) → highest (overheated).
export const ACCUMULATION_BANDS: AccumulationBand[] = [
  {
    key: "deep_value",
    label: "Historically Deep Value",
    range: [0, 20],
    color: "#22d3ee",
    context:
      "Conditions sit toward the cheapest end of Bitcoin's historical range. Periods that looked like this have, historically, preceded strong long-term outcomes — though the past is never a guarantee.",
  },
  {
    key: "attractive",
    label: "Historically Attractive",
    range: [20, 40],
    color: "#34d399",
    context:
      "Conditions sit in the lower, historically calmer part of Bitcoin's range — below the levels that have marked past cycle peaks.",
  },
  {
    key: "neutral",
    label: "Historically Neutral",
    range: [40, 60],
    color: "#eab308",
    context: "Conditions sit in the middle of Bitcoin's historical range — historically neither cheap nor stretched.",
  },
  {
    key: "elevated",
    label: "Historically Elevated",
    range: [60, 80],
    color: "#f97316",
    context:
      "Conditions are elevated versus history — the kind of range seen in the later, higher-risk parts of past cycles.",
  },
  {
    key: "overheated",
    label: "Historically Overheated",
    range: [80, 100],
    color: "#ef4444",
    context:
      "Conditions sit in the stretched end of Bitcoin's historical range, associated with late-cycle periods that have historically preceded weaker forward returns.",
  },
];

export function bandFor(score: number): AccumulationBand {
  return (
    ACCUMULATION_BANDS.find((b) => score >= b.range[0] && score < b.range[1]) ??
    ACCUMULATION_BANDS[ACCUMULATION_BANDS.length - 1]
  );
}

export interface AccumulationFactor {
  factor: string;
  reading: string; // raw value, plain
  score: number; // 0-100 contribution (high = overheated)
  weight: number; // applied weight (renormalised when a factor is unavailable)
}

export interface AccumulationPoint {
  ts: number;
  date: string; // YYYY-MM-DD
  cycleId: number;
  price: number;
  mayer: number;
  ma200w: number | null;
  ma200wMult: number | null;
  drawdownPct: number; // ≤ 0, from running ATH
  score: number; // 0-100
  bandKey: AccumulationBandKey;
  factors: AccumulationFactor[];
}

// Piecewise-linear map with clamped ends. Anchors sorted ascending by x.
function piecewise(x: number, anchors: Array<[number, number]>): number {
  if (x <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < anchors.length; i++) {
    const [x0, y0] = anchors[i - 1];
    const [x1, y1] = anchors[i];
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
  }
  return last[1];
}

// ── Component maps (fixed, published) ────────────────────────────────────────

// Mayer Multiple (price / 200-day MA) → heat 0..100. <0.6 deep value, ~2.4+ hot.
function mayerScore(m: number): number {
  return piecewise(m, [
    [0.6, 0],
    [1.0, 30],
    [1.5, 55],
    [2.4, 85],
    [3.5, 100],
  ]);
}

// 200-week MA multiple (price / 200w MA) → 0..100. Bottoms cluster ≤1×, tops 3–5×.
function ma200wScore(mult: number): number {
  return piecewise(mult, [
    [0.9, 0],
    [1.5, 30],
    [2.5, 60],
    [4.0, 90],
    [5.0, 100],
  ]);
}

// Drawdown from running ATH (≤0) → 0..100. At the high = overheated; deep
// drawdown = deep value. Inverts the others, capturing "how far from the top".
function drawdownScore(ddPct: number): number {
  // ddPct is negative; piecewise wants ascending x, so use the magnitude.
  return piecewise(-ddPct, [
    [0, 100],
    [25, 70],
    [50, 40],
    [70, 15],
    [85, 0],
  ]);
}

const W_MAYER = 0.45;
const W_MA200W = 0.3;
const W_DD = 0.25;

// ── Continuous, point-in-time series across all cycles ───────────────────────

interface RawPoint {
  ts: number;
  cycleId: number;
  price: number;
  mayer: number;
}

function rawSeries(): RawPoint[] {
  const out: RawPoint[] = [];
  for (const c of CYCLES) {
    const base = new Date(c.halvingDate).getTime();
    for (const s of c.samples) {
      if (s.price > 0) out.push({ ts: base + s.day * MS_DAY, cycleId: c.id, price: s.price, mayer: s.mayer });
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}

let _cache: AccumulationPoint[] | null = null;

// The full enriched, point-in-time scored timeline (weekly, 2012→today). Cached.
export function accumulationSeries(): AccumulationPoint[] {
  if (_cache) return _cache;
  const raw = rawSeries();
  const out: AccumulationPoint[] = [];

  for (let i = 0; i < raw.length; i++) {
    const p = raw[i];

    // Running all-time high using only data up to and including this point.
    let runMax = 0;
    for (let j = 0; j <= i; j++) runMax = Math.max(runMax, raw[j].price);
    const drawdownPct = (p.price / runMax - 1) * 100;

    // Trailing 200-week MA from points within the prior 200 weeks. Needs at
    // least ~2 years of history to be meaningful, else unavailable (early 2012–14).
    const windowStart = p.ts - 200 * WEEK;
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0 && raw[j].ts >= windowStart; j--) {
      sum += raw[j].price;
      n++;
    }
    const ma200w = n >= 104 ? sum / n : null;
    const ma200wMult = ma200w ? p.price / ma200w : null;

    const factors: AccumulationFactor[] = [];
    const fMayer = mayerScore(p.mayer);
    factors.push({ factor: "Mayer Multiple", reading: `${p.mayer.toFixed(2)}× the 200-day average`, score: Math.round(fMayer), weight: W_MAYER });
    const fDd = drawdownScore(drawdownPct);
    factors.push({ factor: "Drawdown from high", reading: `${drawdownPct.toFixed(0)}% from the running ATH`, score: Math.round(fDd), weight: W_DD });

    let wSum = W_MAYER + W_DD;
    let acc = fMayer * W_MAYER + fDd * W_DD;
    if (ma200wMult != null) {
      const fMa = ma200wScore(ma200wMult);
      factors.push({ factor: "200-week MA multiple", reading: `${ma200wMult.toFixed(2)}× the 200-week average`, score: Math.round(fMa), weight: W_MA200W });
      acc += fMa * W_MA200W;
      wSum += W_MA200W;
    }
    // Renormalise weights over available factors.
    for (const f of factors) f.weight = Number((f.weight / wSum).toFixed(3));
    const score = Math.round(acc / wSum);

    out.push({
      ts: p.ts,
      date: new Date(p.ts).toISOString().slice(0, 10),
      cycleId: p.cycleId,
      price: p.price,
      mayer: p.mayer,
      ma200w,
      ma200wMult,
      drawdownPct,
      score,
      bandKey: bandFor(score).key,
      factors,
    });
  }

  _cache = out;
  return out;
}

export interface OverheatedRunStats {
  count: number; // number of distinct overheated stretches in the record
  avgWeeks: number; // mean length of a stretch, in weekly samples
  medianWeeks: number;
  maxWeeks: number;
  totalWeeks: number; // total weeks ever spent overheated
  runs: number[]; // each stretch's length, oldest → newest
  firstYear: string; // year of the earliest overheated week (context)
  ongoing: boolean; // true if the latest week is itself overheated (run still open)
}

// Run-length-encode consecutive weeks matching a predicate on the point-in-time
// series. Used to size the distribution rule symmetrically: trim a target % over
// a typical overheated stretch, and redeploy the war chest over a typical cheap
// stretch. Descriptive history only — not a forecast.
function bandRunStats(match: (p: AccumulationPoint) => boolean): OverheatedRunStats {
  const series = accumulationSeries();
  const runs: number[] = [];
  let cur = 0;
  let firstTs = 0;
  for (const p of series) {
    if (match(p)) {
      if (cur === 0 && firstTs === 0) firstTs = p.ts;
      cur += 1;
    } else if (cur > 0) {
      runs.push(cur);
      cur = 0;
    }
  }
  const ongoing = cur > 0;
  if (cur > 0) runs.push(cur);

  const total = runs.reduce((a, c) => a + c, 0);
  const sorted = [...runs].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  const medianWeeks = sorted.length ? (sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2) : 0;

  return {
    count: runs.length,
    avgWeeks: runs.length ? total / runs.length : 0,
    medianWeeks,
    maxWeeks: runs.length ? Math.max(...runs) : 0,
    totalWeeks: total,
    runs,
    firstYear: firstTs ? new Date(firstTs).toISOString().slice(0, 4) : "",
    ongoing,
  };
}

// Average length of an overheated stretch — sizes the weekly trim (target ÷ avg).
export function overheatedRunStats(): OverheatedRunStats {
  return bandRunStats((p) => p.bandKey === "overheated");
}

// Average length of a "cheap" stretch (deep value or attractive, score < 40) —
// sizes how fast the realised-profit war chest is redeployed into extra buys.
export function cheapRunStats(): OverheatedRunStats {
  return bandRunStats((p) => p.bandKey === "deep_value" || p.bandKey === "attractive");
}

export interface AccumulationRead {
  date: string;
  score: number;
  band: AccumulationBand;
  factors: AccumulationFactor[];
  price: number;
  mayer: number;
  ma200wMult: number | null;
  drawdownPct: number;
  // Where today's score sits across the full historical record (rank percentile),
  // shown as descriptive context — not part of the score itself.
  historicalPercentile: number;
  reasoning: string;
}

// Today's read — the latest point on the timeline, plus a plain-English reason.
export function accumulationRead(): AccumulationRead {
  const series = accumulationSeries();
  const t = series[series.length - 1];
  const band = bandFor(t.score);

  const below = series.filter((p) => p.score <= t.score).length;
  const historicalPercentile = Math.round((below / series.length) * 100);

  const reasoning =
    `Bitcoin is ${t.mayer.toFixed(2)}× its 200-day average` +
    (t.ma200wMult != null ? ` and ${t.ma200wMult.toFixed(2)}× its 200-week average` : "") +
    `, ${Math.abs(Math.round(t.drawdownPct))}% below its running all-time high. ` +
    `On the HalvingLens Accumulation Score that reads ${t.score}/100 — ${band.label.toLowerCase()}. ` +
    band.context;

  return {
    date: t.date,
    score: t.score,
    band,
    factors: t.factors,
    price: t.price,
    mayer: t.mayer,
    ma200wMult: t.ma200wMult,
    drawdownPct: t.drawdownPct,
    historicalPercentile,
    reasoning,
  };
}
