// Downside Scenario engine — "where could Bitcoin's next cycle low be, based on
// historical drawdowns and long-term support?" Historical context, never a
// prediction, price target, or advice.
//
// Principles (per product brief):
//   - Deterministic and explainable. Every level traces to real price history.
//   - Framed as scenarios / reference levels, not forecasts.
//   - No fabricated numbers: a level we can't stand behind is marked coming-soon.
//
// Methodologies combined here:
//   1. Historical drawdown from the cycle high (prior cyclical bear depths,
//      applied to this cycle's high to date)
//   2. Long-term support: 200-week moving average
//   3. Realized price (aggregate on-chain cost basis), when live
//   4. Prior cycle high (psychological reference / support)

import { CYCLES, CURRENT_CYCLE, SPOT, TODAY } from "./btcData";
import { metricStatus, type DataStatus } from "./cycleIntel";

const MS_DAY = 86_400_000;
export const METHODOLOGY_VERSION = "v2"; // v2 adds the long-term regression trend band

// Drawdown episodes below this depth are treated as cyclical bear markets rather
// than intra-bull corrections. Bitcoin's three completed cyclical bears have all
// exceeded ~75%, while no intra-bull correction has exceeded ~52% — so a -60%
// floor cleanly separates the two. Documented, not arbitrary.
const CYCLE_BEAR_FLOOR = -60;

// Fallback historical bear depths (the well-documented 2015 / 2018 / 2022
// bottoms) — only used if the snapshot is too short to derive them from data.
const FALLBACK_BEAR_DEPTHS = [-77, -82, -85];

export type DataQuality = DataStatus;

export interface HistoricalBear {
  label: string; // e.g. "2022 bear"
  drawdownPct: number; // negative
  fromPrice: number;
  toPrice: number;
  date: string; // YYYY-MM of the low
}

export interface DownsideLevel {
  key: string;
  label: string;
  category: "support" | "drawdown" | "correction";
  price: number;
  dropPctFromCurrent: number; // negative = below current price ("from today")
  drawdownFromHighPct?: number; // drawdown rungs only: the depth from the cycle high that DEFINES this price
  methodology: string;
  explanation: string;
  dataQuality: DataQuality;
}

export interface DownsideScenarios {
  available: boolean;
  currentPrice: number;
  cycleHigh: number;
  fromCycleHighPct: number; // where current price sits vs the cycle high
  priorCycleHigh: number | null;
  realizedPrice: number | null;
  realizedQuality: DataQuality;
  movingAverage200w: number | null;
  ma200wSamples: number;
  trendCentral: number | null; // long-term log-log regression, fair-value line
  trendSupport: number | null; // lower band of that regression
  trendSamples: number;
  historicalBears: HistoricalBear[];
  // Drawdown depths used for the three tiers (negative %), derived or fallback.
  mildPct: number | null;
  averagePct: number | null;
  severePct: number | null;
  // Median intra-bull correction depth (a normal dip WITHIN a bull market,
  // shallower than a full cyclical bear) and how many such episodes it's from.
  bullDipPct: number | null;
  bullDipCount: number;
  derivedFromData: boolean; // true if bear depths came from the live history
  // The scenario ladder, ordered by price descending (highest → lowest).
  levels: DownsideLevel[];
  methodologyVersion: string;
  generatedAt: string | null;
}

// Continuous weekly price series across every cycle (oldest → newest).
function continuousWeekly(): { ts: number; price: number }[] {
  const out: { ts: number; price: number }[] = [];
  for (const c of CYCLES) {
    const base = new Date(c.halvingDate).getTime();
    for (const s of c.samples) if (s.price > 0) out.push({ ts: base + s.day * MS_DAY, price: s.price });
  }
  return out.sort((a, b) => a.ts - b.ts);
}

// Major cyclical bears: deepest drawdown-from-running-ATH per separated episode,
// keeping only episodes below the cycle-bear floor.
function majorBears(series: { ts: number; price: number }[]): HistoricalBear[] {
  let runMax = 0;
  let cur: { dd: number; from: number; to: number; ts: number } | null = null;
  const episodes: { dd: number; from: number; to: number; ts: number }[] = [];
  for (const p of series) {
    runMax = Math.max(runMax, p.price);
    const dd = (p.price / runMax - 1) * 100;
    if (dd < -20) {
      if (!cur || dd < cur.dd) cur = { dd, from: runMax, to: p.price, ts: p.ts };
    } else if (cur) {
      episodes.push(cur);
      cur = null;
    }
  }
  if (cur) episodes.push(cur);
  return episodes
    .filter((e) => e.dd <= CYCLE_BEAR_FLOOR)
    .map((e) => ({
      label: `${new Date(e.ts).getUTCFullYear()} bear`,
      drawdownPct: e.dd,
      fromPrice: e.from,
      toPrice: e.to,
      date: new Date(e.ts).toISOString().slice(0, 7),
    }));
}

function pct(level: number, current: number): number {
  return current > 0 ? (level / current - 1) * 100 : 0;
}

// Intra-bull corrections: drawdown episodes shallower than the cycle-bear floor —
// the normal dips within a bull market, not cycle-ending bears. Returns depths
// (negative %), most severe first. Separated the same way as majorBears.
function intraBullCorrections(series: { ts: number; price: number }[]): number[] {
  let runMax = 0;
  let cur: number | null = null;
  const eps: number[] = [];
  for (const p of series) {
    runMax = Math.max(runMax, p.price);
    const dd = (p.price / runMax - 1) * 100;
    if (dd < -10) {
      if (cur == null || dd < cur) cur = dd;
    } else if (cur != null) {
      eps.push(cur);
      cur = null;
    }
  }
  if (cur != null) eps.push(cur);
  return eps.filter((d) => d > CYCLE_BEAR_FLOOR).sort((a, b) => a - b);
}

function median(sorted: number[]): number | null {
  const n = sorted.length;
  if (!n) return null;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

// Long-term logarithmic regression of price vs time (the Bitcoin "power-law"
// trend): fit ln(price) against ln(days since genesis) by least squares over the
// full weekly history. Returns the fair-value line today plus its lower band
// (one residual sigma below), where deep-value, late-bear conditions have
// historically sat. Defensible long-term trend support, not a forecast.
const GENESIS = Date.parse("2009-01-03");

function logRegression(
  series: { ts: number; price: number }[],
): { central: number; lower: number; n: number } | null {
  const pts = series
    .filter((p) => p.ts > GENESIS && p.price > 0)
    .map((p) => ({ x: Math.log((p.ts - GENESIS) / MS_DAY), y: Math.log(p.price) }));
  const n = pts.length;
  if (n < 50) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
    sxx += p.x * p.x;
    sxy += p.x * p.y;
  }
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const b = (n * sxy - sx * sy) / denom;
  const a = (sy - b * sx) / n;
  let ss = 0;
  for (const p of pts) {
    const r = p.y - (a + b * p.x);
    ss += r * r;
  }
  const sigma = Math.sqrt(ss / Math.max(1, n - 2));
  const todayDays = (series[series.length - 1].ts - GENESIS) / MS_DAY;
  const predLn = a + b * Math.log(todayDays);
  return { central: Math.exp(predLn), lower: Math.exp(predLn - sigma), n };
}

export function downsideScenarios(): DownsideScenarios {
  const series = continuousWeekly();
  const currentPrice = SPOT?.price ?? CURRENT_CYCLE.samples[CURRENT_CYCLE.samples.length - 1].price;
  const cycleHigh = CYCLES.reduce((m, c) => Math.max(m, c.peakPrice), 0);

  // Prior cycle high — the previous completed cycle's peak (psychological level).
  const priorCompleted = CYCLES.filter((c) => c.id !== CURRENT_CYCLE.id);
  const priorCycleHigh = priorCompleted.length
    ? priorCompleted.reduce((m, c) => Math.max(m, c.peakPrice), 0)
    : null;

  // 200-week moving average from the trailing weekly closes.
  const trailing = series.slice(-200);
  const ma200wSamples = trailing.length;
  const movingAverage200w = trailing.length
    ? trailing.reduce((a, s) => a + s.price, 0) / trailing.length
    : null;

  // Long-term log-log regression trend + lower band.
  const reg = logRegression(series);

  // Realized price (aggregate cost basis) — only used when it's a live metric.
  const realizedQuality = metricStatus("realized-price");
  const realizedPrice =
    realizedQuality !== "coming-soon" && Number.isFinite(TODAY.realizedPrice)
      ? TODAY.realizedPrice
      : null;

  // Historical cyclical bear depths → mild / average / severe tiers.
  const bears = majorBears(series);
  const derivedFromData = bears.length >= 2;
  const depths = (derivedFromData ? bears.map((b) => b.drawdownPct) : FALLBACK_BEAR_DEPTHS)
    .slice()
    .sort((a, b) => a - b); // most severe first
  const severePct = depths.length ? depths[0] : null;
  const mildPct = depths.length ? depths[depths.length - 1] : null;
  const averagePct = depths.length ? depths.reduce((a, b) => a + b, 0) / depths.length : null;

  // Typical bull-market correction — the median intra-bull dip, applied from
  // TODAY's price (a normal pullback from here, distinct from a full bear).
  const bullCorrections = intraBullCorrections(series);
  const bullDipPct = median(bullCorrections);

  const drawdownLevel = (
    key: string,
    label: string,
    depthPct: number | null,
    explanation: string,
  ): DownsideLevel | null => {
    if (depthPct == null || cycleHigh <= 0) return null;
    // Single source of truth: the target is the cycle high reduced by the drawdown
    // depth. The displayed drawdown %, the price, and the copy all derive from
    // these two numbers, so they always reconcile: price = cycleHigh × (1 + depth/100).
    const price = cycleHigh * (1 + depthPct / 100);
    return {
      key,
      label,
      category: "drawdown",
      price,
      dropPctFromCurrent: pct(price, currentPrice),
      drawdownFromHighPct: depthPct,
      methodology: `Historical drawdown applied to the cycle high (${fmtSigned(depthPct)} from ${Math.round(cycleHigh).toLocaleString()})`,
      explanation,
      dataQuality: derivedFromData ? "live-derived" : "coming-soon",
    };
  };

  const levels: (DownsideLevel | null)[] = [
    bullDipPct != null
      ? {
          key: "bull-dip",
          label: "Typical bull-market correction",
          category: "correction",
          price: currentPrice * (1 + bullDipPct / 100),
          dropPctFromCurrent: bullDipPct,
          methodology: `Median intra-bull correction (${fmtSigned(bullDipPct)}) applied from today's price`,
          explanation: `The typical dip WITHIN a Bitcoin bull market — the median of ${bullCorrections.length} historical corrections shallower than a full cyclical bear — applied from today's price. A normal pullback, distinct from a cycle-ending bear market.`,
          dataQuality: "live-derived",
        }
      : null,
    priorCycleHigh != null
      ? {
          key: "prior-cycle-high",
          label: "Prior cycle high",
          category: "support",
          price: priorCycleHigh,
          dropPctFromCurrent: pct(priorCycleHigh, currentPrice),
          methodology: "Previous cycle's all-time high",
          explanation:
            "The previous cycle's high has historically acted as a psychological reference level that price has tended to revisit, not a guaranteed floor.",
          dataQuality: "live",
        }
      : null,
    movingAverage200w != null
      ? {
          key: "ma-200w",
          label: "200-week moving average",
          category: "support",
          price: movingAverage200w,
          dropPctFromCurrent: pct(movingAverage200w, currentPrice),
          methodology: "Average of the last 200 weekly closes",
          explanation:
            "The 200-week moving average is a long-term trend line that, in prior cycles, price has approached or briefly undercut near major lows.",
          dataQuality: "live-derived",
        }
      : null,
    realizedPrice != null
      ? {
          key: "realized-price",
          label: "Realized price (cost basis)",
          category: "support",
          price: realizedPrice,
          dropPctFromCurrent: pct(realizedPrice, currentPrice),
          methodology: "Aggregate on-chain cost basis",
          explanation:
            "Realized price is the network's aggregate cost basis. Historically, sustained trading below it has coincided with deep-value, late-bear conditions.",
          dataQuality: realizedQuality,
        }
      : null,
    reg
      ? {
          key: "trend",
          label: "Long-term trend support",
          category: "support",
          price: reg.lower,
          dropPctFromCurrent: pct(reg.lower, currentPrice),
          methodology: "Lower band of the long-term log-log price regression",
          explanation:
            "Across cycles, Bitcoin's price has tracked a long-term logarithmic trend. The lower band of that regression marks the kind of level prior cycle lows have approached — a trend-based reference, not a floor.",
          dataQuality: "live-derived",
        }
      : null,
    drawdownLevel(
      "mild",
      "Mild historical drawdown",
      mildPct,
      "If this cycle's high corrected by the same amount as the mildest prior cyclical bear market.",
    ),
    drawdownLevel(
      "average",
      "Average historical drawdown",
      averagePct,
      "Based on the average drawdown of prior Bitcoin cyclical bear markets from their highs.",
    ),
    drawdownLevel(
      "severe",
      "Severe historical drawdown",
      severePct,
      "If this cycle's high corrected as deeply as the most severe prior cyclical bear market.",
    ),
  ];

  const ordered = levels
    .filter((l): l is DownsideLevel => l !== null)
    // Only downside-relevant rungs (at or below current price, small tolerance).
    .filter((l) => l.price <= currentPrice * 1.03)
    .sort((a, b) => b.price - a.price);

  return {
    available: ordered.length > 0,
    currentPrice,
    cycleHigh,
    fromCycleHighPct: pct(currentPrice, cycleHigh),
    priorCycleHigh,
    realizedPrice,
    realizedQuality,
    movingAverage200w,
    ma200wSamples,
    trendCentral: reg?.central ?? null,
    trendSupport: reg?.lower ?? null,
    trendSamples: reg?.n ?? 0,
    historicalBears: bears,
    mildPct,
    averagePct,
    severePct,
    bullDipPct,
    bullDipCount: bullCorrections.length,
    derivedFromData,
    levels: ordered,
    methodologyVersion: METHODOLOGY_VERSION,
    generatedAt: SPOT ? new Date(SPOT.ts).toISOString() : null,
  };
}

function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// Compact payload for the historical warehouse (stable shape, one row/day).
export function downsideWarehouseRow(date: string): Record<string, unknown> {
  const d = downsideScenarios();
  const byKey = (k: string) => d.levels.find((l) => l.key === k)?.price ?? null;
  return {
    date,
    current_price: d.currentPrice,
    cycle_high: d.cycleHigh,
    mild_drawdown_price: byKey("mild"),
    average_drawdown_price: byKey("average"),
    severe_drawdown_price: byKey("severe"),
    realized_price_support: d.realizedPrice,
    moving_average_support: d.movingAverage200w,
    prior_cycle_high_support: d.priorCycleHigh,
    methodology_version: d.methodologyVersion,
  };
}
