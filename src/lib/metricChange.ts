// Metric-change service — the single source of truth for "what's changed?".
//
// Every What's Changed? component and the Market Snapshot dashboard read from
// here, so the daily/weekly numbers are computed once and never drift between
// pages, packs and emails (PART 11 of the spec).
//
// For each supported metric it returns: the current reading; point-in-time
// 1-day / 7-day / 30-day changes (closest prior observation ≤ the target date —
// never future data); a 30-day sparkline; a historical percentile; band /
// classification and any band-crossing; a metric-specific direction status and
// materiality; and one deterministic, factual summary (20–50 words, no LLM, no
// prediction). Direction semantics are per-metric — a lower Accumulation Index
// is constructive, a deeper drawdown is deterioration, higher sentiment is
// neither good nor bad. Everything degrades honestly when history is short.
import { productionCostRead } from "./productionCost";
import { SNAPSHOT } from "./data/snapshot";
import { classifyPremium } from "./data/productionCost";

import { format } from "date-fns";
import { PRICE_HISTORY, SPOT, TODAY } from "./btcData";
import { cycleScorecard, scoreBand, cycleSummary } from "./cycleSummary";
import {
  pricedSentimentSeries,
  sentimentRead,
  sentimentPercentile,
  SENTIMENT_AVAILABLE,
  bandFor as sentimentBand,
} from "./sentiment";
import { accumulationSeries, accumulationRead, bandFor as accBand } from "./accumulation";
import { ETF, etfStats, etfWindowNet } from "./etf";
import { STORED_BRIEFS } from "./data/briefs";
import { briefDate } from "./briefArchive";
import { fmtUsd } from "./format";

const DAY = 86_400_000;

export type MetricId = "price" | "market_health" | "sentiment" | "accumulation" | "drawdown" | "etf_flow" | "production_premium";

// How a rise in the raw value maps to constructive / deteriorating / neutral.
type DirectionMode = "good-up" | "good-down" | "neutral" | "flow";

export type DirectionStatus = "improving" | "weakening" | "stable" | "mixed" | "insufficient";
export type Materiality = "none" | "modest" | "material" | "band" | "historic";
export type Semantic = "good" | "bad" | "neutral";
export type RawDir = "up" | "down" | "flat";
export type Period = 1 | 7 | 30;

export interface PeriodChange {
  period: Period;
  available: boolean;
  asOfLabel: string | null; // date of the prior observation (tooltip / secondary label)
  absChange: number;
  pctChange: number | null;
  absLabel: string; // e.g. "+5 pts", "−1.4%", "+$120M"
  pctLabel: string | null; // e.g. "+3.1%"
  dir: RawDir;
  good: Semantic; // metric-specific meaning of this move
}

export interface MetricChange {
  id: MetricId;
  name: string;
  unit: string;
  frequency: "daily" | "weekly" | "trading-day";
  available: boolean;
  current: number;
  currentLabel: string;
  band: { key: string; label: string } | null;
  bandChanged: { from: string; to: string; overDays: number } | null;
  percentile: number | null; // 0..100 historical rank of the current reading
  percentileLabel: string | null; // human phrase, e.g. "more attractive than 78% of weeks"
  changes: PeriodChange[]; // only the meaningful periods for this metric
  spark: number[]; // ~30d recent values (oldest→newest) for the sparkline
  high30: number | null;
  low30: number | null;
  status: DirectionStatus;
  materiality: Materiality;
  summary: string; // deterministic, 20–50 words, no prediction
  drivers: string[]; // primary driver(s) of the move
  asOfLabel: string; // freshness / latest-observation label
  fresh: boolean;
}

// ── shared helpers ───────────────────────────────────────────────────────────
interface Obs {
  ts: number;
  value: number;
}

// Closest observation at or before the target timestamp (no future leakage).
function priorAt(series: Obs[], targetTs: number): Obs | null {
  let out: Obs | null = null;
  for (const o of series) {
    if (o.ts <= targetTs) out = o;
    else break;
  }
  return out;
}

function pctOf(cur: number, prev: number): number | null {
  if (!isFinite(prev) || prev === 0) return null;
  return (cur / prev - 1) * 100;
}

function rankPercentile(values: number[], v: number): number {
  const below = values.filter((x) => x <= v).length;
  return Math.round((below / values.length) * 100);
}

function semantic(mode: DirectionMode, delta: number): Semantic {
  if (delta === 0 || mode === "neutral") return "neutral";
  if (mode === "good-up" || mode === "flow") return delta > 0 ? "good" : "bad";
  return delta > 0 ? "bad" : "good"; // good-down
}

function rawDir(delta: number, eps: number): RawDir {
  return delta > eps ? "up" : delta < -eps ? "down" : "flat";
}

function signed(n: number, digits = 0): string {
  const r = n.toFixed(digits);
  return `${n > 0 ? "+" : ""}${r}`;
}
function signedPctLabel(p: number): string {
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}
function fmtDate(ts: number): string {
  return format(ts, "d MMM");
}
function ptsWord(n: number): string {
  return `point${Math.abs(Math.round(n)) === 1 ? "" : "s"}`;
}
function ord(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// Build one period column for a level metric.
function levelPeriod(
  period: Period,
  cur: number,
  series: Obs[],
  nowTs: number,
  mode: DirectionMode,
  eps: number,
  fmtAbs: (n: number) => string,
  usePct: boolean,
): PeriodChange {
  const prior = priorAt(series, nowTs - period * DAY);
  if (!prior || prior.ts >= nowTs) {
    return { period, available: false, asOfLabel: null, absChange: 0, pctChange: null, absLabel: "—", pctLabel: null, dir: "flat", good: "neutral" };
  }
  const abs = cur - prior.value;
  const p = pctOf(cur, prior.value);
  return {
    period,
    available: true,
    asOfLabel: fmtDate(prior.ts),
    absChange: abs,
    pctChange: p,
    absLabel: fmtAbs(abs),
    pctLabel: usePct && p != null ? signedPctLabel(p) : null,
    dir: rawDir(abs, eps),
    good: semantic(mode, abs),
  };
}

function statusOf(changes: PeriodChange[], mode: DirectionMode, primaryMateriality: Materiality): DirectionStatus {
  const c7 = changes.find((c) => c.period === 7 && c.available) ?? changes.find((c) => c.available);
  const c1 = changes.find((c) => c.period === 1 && c.available);
  if (!c7) return "insufficient";
  if (c1 && c1.dir !== "flat" && c7.dir !== "flat" && c1.dir !== c7.dir) return "mixed";
  if (primaryMateriality === "none") return "stable";
  if (mode === "neutral") return "mixed";
  return c7.good === "good" ? "improving" : c7.good === "bad" ? "weakening" : "stable";
}

function spark30(series: Obs[], nowTs: number): { spark: number[]; high: number | null; low: number | null } {
  const window = series.filter((o) => o.ts >= nowTs - 31 * DAY).map((o) => o.value);
  if (!window.length) return { spark: [], high: null, low: null };
  return { spark: window, high: Math.max(...window), low: Math.min(...window) };
}

// Materiality-aware week clause with a metric-specific rise/fall verb pair.
function weekClauseFor(c: PeriodChange | undefined, materiality: Materiality, up: string, down: string): string {
  if (!c || !c.available || c.dir === "flat" || materiality === "none") return "broadly unchanged this week";
  const n = Math.abs(Math.round(c.absChange));
  return `${c.dir === "up" ? up : down} ${n} ${ptsWord(n)} this week`;
}

// ── Market Health (composite cycle scorecard) ────────────────────────────────
function marketHealthChange(): MetricChange {
  const sc = cycleScorecard();
  const cur = sc.overall;
  const nowTs = briefDate().getTime();
  const series: Obs[] = STORED_BRIEFS.filter((b) => b.cycleScore != null)
    .map((b) => ({ ts: Date.parse(b.slug), value: b.cycleScore as number }))
    .sort((a, b) => a.ts - b.ts);
  const fmtAbs = (n: number) => `${signed(n)} pts`;
  const changes = ([1, 7, 30] as Period[]).map((p) => levelPeriod(p, cur, series, nowTs, "good-up", 0.5, fmtAbs, false));
  const { spark, high, low } = spark30(series, nowTs);
  const band = { key: sc.overallLabel, label: sc.overallLabel };
  const c7 = changes.find((c) => c.period === 7);
  const prior7 = priorAt(series, nowTs - 7 * DAY);
  const bandChanged = prior7 && scoreBand(prior7.value).label !== sc.overallLabel ? { from: scoreBand(prior7.value).label, to: sc.overallLabel, overDays: 7 } : null;
  const absMove = c7?.available ? Math.abs(c7.absChange) : 0;
  let materiality: Materiality = absMove < 2 ? "none" : absMove < 5 ? "modest" : "material";
  if (bandChanged) materiality = "band";
  const drivers = weekDrivers();
  const summary = clamp(
    `Market Health is ${sc.overallLabel.toLowerCase()} at ${cur}, ${weekClauseFor(c7, materiality, "up", "down")}${drivers.length && materiality !== "none" ? `, led by ${drivers[0]}` : ""}.`,
  );
  const pctile = series.length >= 30 ? rankPercentile(series.map((o) => o.value), cur) : null;
  return {
    id: "market_health",
    name: "Market Health",
    unit: "pts",
    frequency: "daily",
    available: true,
    current: cur,
    currentLabel: `${cur}`,
    band,
    bandChanged,
    percentile: pctile,
    percentileLabel: pctile != null ? `${ord(pctile)} percentile of tracked days` : null,
    changes,
    spark,
    high30: high,
    low30: low,
    status: statusOf(changes, "good-up", materiality),
    materiality,
    summary,
    drivers,
    asOfLabel: fmtDate(nowTs),
    fresh: true,
  };
}

// Which underlying input moved Market Health most over the week — deterministic,
// from the archived briefs (ETF trailing-week, sentiment, price momentum).
function weekDrivers(): string[] {
  const nowTs = briefDate().getTime();
  const now = STORED_BRIEFS.filter((b) => b.slug <= format(nowTs, "yyyy-MM-dd")).sort((a, b) => (a.slug < b.slug ? 1 : -1))[0];
  const wk = STORED_BRIEFS.filter((b) => Date.parse(b.slug) <= nowTs - 7 * DAY).sort((a, b) => (a.slug < b.slug ? 1 : -1))[0];
  if (!now || !wk) return [];
  const out: { label: string; mag: number }[] = [];
  if (now.etfTrailingWeek != null && wk.etfTrailingWeek != null) {
    const d = now.etfTrailingWeek - wk.etfTrailingWeek;
    if (Math.abs(d) >= 2e8) out.push({ label: d > 0 ? "stronger ETF demand" : "softer ETF demand", mag: Math.abs(d) / 1e9 });
  }
  if (now.sentimentValue != null && wk.sentimentValue != null) {
    const d = now.sentimentValue - wk.sentimentValue;
    if (Math.abs(d) >= 5) out.push({ label: d > 0 ? "firmer sentiment" : "weaker sentiment", mag: Math.abs(d) / 20 });
  }
  if (now.price && wk.price) {
    const d = (now.price / wk.price - 1) * 100;
    if (Math.abs(d) >= 3) out.push({ label: d > 0 ? "improving price momentum" : "softer price momentum", mag: Math.abs(d) / 10 });
  }
  return out.sort((a, b) => b.mag - a.mag).map((o) => o.label);
}

// ── Sentiment / Fear & Greed ─────────────────────────────────────────────────
function sentimentChangeMetric(): MetricChange {
  const read = sentimentRead();
  const nowTs = briefDate().getTime();
  if (!SENTIMENT_AVAILABLE || !read) return unavailable("sentiment", "Sentiment", "pts", "daily");
  const cur = read.value;
  const series: Obs[] = pricedSentimentSeries().map((p) => ({ ts: p.ts, value: p.value }));
  const fmtAbs = (n: number) => `${signed(n)} pts`;
  const changes = ([1, 7, 30] as Period[]).map((p) => levelPeriod(p, cur, series, nowTs, "neutral", 0.5, fmtAbs, false));
  const { spark, high, low } = spark30(series, nowTs);
  const band = { key: read.band.band, label: read.band.label };
  const prior7 = priorAt(series, nowTs - 7 * DAY);
  const bandChanged = prior7 && sentimentBand(prior7.value).label !== read.band.label ? { from: sentimentBand(prior7.value).label, to: read.band.label, overDays: 7 } : null;
  const c1 = changes.find((c) => c.period === 1);
  const c7 = changes.find((c) => c.period === 7);
  const absMove = c7?.available ? Math.abs(c7.absChange) : 0;
  let materiality: Materiality = absMove < 3 ? "none" : absMove < 8 ? "modest" : "material";
  if (bandChanged) materiality = "band";
  const d1 = Math.abs(Math.round(c1?.absChange ?? 0));
  const d7 = Math.abs(Math.round(c7?.absChange ?? 0));
  const dayClause = c1?.available && c1.dir !== "flat" ? `${c1.dir === "up" ? "rising" : "falling"} ${d1} ${ptsWord(d1)} today` : "little changed today";
  const weekClause = c7?.available && c7.dir !== "flat" ? ` and ${d7} ${ptsWord(d7)} over the week` : "";
  const pRaw = sentimentPercentile(cur);
  const pctile = pRaw == null ? null : Math.round(pRaw);
  const summary = clamp(`Sentiment ${bandChanged ? "moved to" : "remains in"} ${read.band.label} at ${cur}, ${dayClause}${weekClause}.`);
  return {
    id: "sentiment",
    name: "Sentiment",
    unit: "pts",
    frequency: "daily",
    available: true,
    current: cur,
    currentLabel: `${cur}`,
    band,
    bandChanged,
    percentile: pctile,
    percentileLabel: pctile != null ? `${ord(pctile)} percentile historically` : null,
    changes,
    spark,
    high30: high,
    low30: low,
    status: statusOf(changes, "neutral", materiality),
    materiality,
    summary,
    drivers: [],
    asOfLabel: fmtDate(nowTs),
    fresh: true,
  };
}

// ── Accumulation Index (weekly cadence — no 1-day column) ────────────────────
function accumulationChange(): MetricChange {
  const read = accumulationRead();
  const cur = read.score;
  const nowTs = briefDate().getTime();
  const series: Obs[] = accumulationSeries().map((p) => ({ ts: p.ts, value: p.score }));
  const fmtAbs = (n: number) => `${signed(n)} pts`;
  const changes = ([7, 30] as Period[]).map((p) => levelPeriod(p, cur, series, nowTs, "good-down", 0.5, fmtAbs, false));
  const { spark, high, low } = spark30(series, nowTs);
  const band = { key: read.band.key, label: read.band.label };
  const prior7 = priorAt(series, nowTs - 7 * DAY);
  const bandChanged = prior7 && accBand(prior7.value).label !== read.band.label ? { from: accBand(prior7.value).label, to: read.band.label, overDays: 7 } : null;
  const c7 = changes.find((c) => c.period === 7);
  const absMove = c7?.available ? Math.abs(c7.absChange) : 0;
  let materiality: Materiality = absMove < 2 ? "none" : absMove < 5 ? "modest" : "material";
  if (bandChanged) materiality = "band";
  const moveWord = c7?.available && c7.dir !== "flat" ? `, ${c7.dir === "down" ? "improving" : "easing"} ${Math.abs(c7.absChange).toFixed(0)} points this week` : "";
  const driver = accDriver(series, nowTs);
  const summary = clamp(`The Accumulation Index is ${read.band.label} at ${cur}${moveWord}${driver ? ` as ${driver}` : ""}. A lower score is a historically more attractive environment.`);
  return {
    id: "accumulation",
    name: "Accumulation Index",
    unit: "pts",
    frequency: "weekly",
    available: true,
    current: cur,
    currentLabel: `${cur}`,
    band,
    bandChanged,
    percentile: read.historicalPercentile,
    percentileLabel: `more attractive than ${100 - read.historicalPercentile}% of weeks`,
    changes,
    spark,
    high30: high,
    low30: low,
    status: statusOf(changes, "good-down", materiality),
    materiality,
    summary,
    drivers: driver ? [driver] : [],
    asOfLabel: fmtDate(nowTs),
    fresh: true,
  };
}

function accDriver(series: Obs[], nowTs: number): string | null {
  const pts = accumulationSeries();
  const now = pts[pts.length - 1];
  const target = nowTs - 7 * DAY;
  let prior = null as (typeof pts)[number] | null;
  for (const p of pts) {
    if (p.ts <= target) prior = p;
    else break;
  }
  if (!now || !prior) return null;
  const dMayer = now.mayer - prior.mayer;
  const dDraw = now.drawdownPct - prior.drawdownPct;
  if (Math.abs(dMayer) >= 0.03) return dMayer < 0 ? "Bitcoin moved further below its 200-day average" : "Bitcoin rose relative to its 200-day average";
  if (Math.abs(dDraw) >= 2) return dDraw < 0 ? "the drawdown from the high deepened" : "price recovered toward the high";
  return null;
}

// ── Price ────────────────────────────────────────────────────────────────────
function priceChange(): MetricChange {
  const cur = SPOT?.price ?? TODAY.price;
  const nowTs = briefDate().getTime();
  const series: Obs[] = PRICE_HISTORY.map((p) => ({ ts: p.ts, value: p.price })).sort((a, b) => a.ts - b.ts);
  if (series.length && series[series.length - 1].ts < nowTs) series.push({ ts: nowTs, value: cur });
  const fmtAbs = (n: number) => `${n >= 0 ? "+" : "−"}${fmtUsd(Math.abs(n), { compact: true })}`;
  const changes = ([1, 7, 30] as Period[]).map((p) => levelPeriod(p, cur, series, nowTs, "good-up", 1, fmtAbs, true));
  const { spark, high, low } = spark30(series, nowTs);
  const c1 = changes.find((c) => c.period === 1);
  const c7 = changes.find((c) => c.period === 7);
  const absMove = c7?.pctChange != null ? Math.abs(c7.pctChange) : 0;
  const materiality: Materiality = absMove < 1 ? "none" : absMove < 5 ? "modest" : "material";
  const dayClause = c1?.available && c1.pctChange != null && Math.abs(c1.pctChange) >= 0.05 ? `${signedPctLabel(c1.pctChange)} today` : "little changed today";
  const weekClause = c7?.available && c7.pctChange != null && Math.abs(c7.pctChange) >= 0.05 ? `, ${signedPctLabel(c7.pctChange)} this week` : "";
  const summary = clamp(`Bitcoin is ${fmtUsd(cur)}, ${dayClause}${weekClause}.`);
  return {
    id: "price",
    name: "Bitcoin Price",
    unit: "USD",
    frequency: "daily",
    available: true,
    current: cur,
    currentLabel: fmtUsd(cur),
    band: null,
    bandChanged: null,
    percentile: null,
    percentileLabel: null,
    changes,
    spark,
    high30: high,
    low30: low,
    status: statusOf(changes, "good-up", materiality),
    materiality,
    summary,
    drivers: [],
    asOfLabel: fmtDate(nowTs),
    fresh: true,
  };
}

// ── Drawdown from the running high (≤ 0) ─────────────────────────────────────
function drawdownChange(): MetricChange {
  const cur = cycleSummary().drawdownFromAth; // ≤ 0
  const nowTs = briefDate().getTime();
  const series: Obs[] = STORED_BRIEFS.filter((b) => b.drawdownFromAth != null)
    .map((b) => ({ ts: Date.parse(b.slug), value: b.drawdownFromAth }))
    .sort((a, b) => a.ts - b.ts);
  if (series.length && series[series.length - 1].ts < nowTs) series.push({ ts: nowTs, value: cur });
  const fmtAbs = (n: number) => `${signed(n, 1)} pp`;
  // Value closer to 0 is constructive → good-up.
  const changes = ([1, 7, 30] as Period[]).map((p) => levelPeriod(p, cur, series, nowTs, "good-up", 0.5, fmtAbs, false));
  const { spark, high, low } = spark30(series, nowTs);
  const c7 = changes.find((c) => c.period === 7);
  const absMove = c7?.available ? Math.abs(c7.absChange) : 0;
  const materiality: Materiality = absMove < 1 ? "none" : absMove < 3 ? "modest" : "material";
  const depth = Math.abs(Math.round(cur));
  const dd7 = Math.abs(Math.round(c7?.absChange ?? 0));
  const weekClause = c7?.available && c7.dir !== "flat" && materiality !== "none" ? `, ${c7.dir === "down" ? "deepening" : "recovering"} ${dd7} ${ptsWord(dd7)} this week` : "";
  const summary = clamp(`Bitcoin is ${depth}% below its cycle high${weekClause}. Historical context on how corrections have behaved — not a floor.`);
  const absVals = series.map((o) => Math.abs(o.value));
  const pctile = series.length >= 30 ? rankPercentile(absVals, Math.abs(cur)) : null;
  return {
    id: "drawdown",
    name: "Drawdown",
    unit: "pp",
    frequency: "daily",
    available: true,
    current: cur,
    currentLabel: `−${depth}%`,
    band: null,
    bandChanged: null,
    percentile: pctile,
    percentileLabel: pctile != null ? `deeper than ${pctile}% of tracked days` : null,
    changes,
    spark,
    high30: high,
    low30: low,
    status: statusOf(changes, "good-up", materiality),
    materiality,
    summary,
    drivers: [],
    asOfLabel: fmtDate(nowTs),
    fresh: true,
  };
}

// ── ETF net flow (trading-day cadence; windows are net demand, not deltas) ────
function etfFlowChange(): MetricChange {
  if (!ETF.connected) return unavailable("etf_flow", "ETF Demand", "USD", "trading-day");
  const pts = ETF.points;
  const stats = etfStats();
  const latest = stats.latest as (typeof pts)[number];
  const net7 = etfWindowNet(pts, 7).net;
  const net30 = etfWindowNet(pts, 30).net;
  const usd = (n: number) => `${n >= 0 ? "+" : "−"}${fmtUsd(Math.abs(n), { compact: true })}`;
  const mk = (period: Period, value: number): PeriodChange => ({
    period,
    available: true,
    asOfLabel: latest.date,
    absChange: value,
    pctChange: null,
    absLabel: usd(value),
    pctLabel: null,
    dir: rawDir(value, 1),
    good: semantic("flow", value),
  });
  const changes = [mk(1, latest.netFlow), mk(7, net7), mk(30, net30)];
  // Streak of consecutive same-sign trading days at the tail.
  let streak = 0;
  const sign = Math.sign(latest.netFlow);
  for (let i = pts.length - 1; i >= 0; i--) {
    if (Math.sign(pts[i].netFlow) === sign && sign !== 0) streak++;
    else break;
  }
  const streakWord = sign > 0 ? "inflow" : sign < 0 ? "outflow" : "flat";
  const spark = pts.slice(-30).map((p) => p.netFlow);
  const flows = pts.map((p) => p.netFlow);
  const pctile = pts.length >= 30 ? rankPercentile(flows, latest.netFlow) : null;
  const absMove = Math.abs(net7);
  const materiality: Materiality = absMove < 2.5e8 ? "none" : absMove < 1e9 ? "modest" : "material";
  const summary = clamp(
    `US spot Bitcoin ETFs saw a net ${latest.netFlow >= 0 ? "inflow" : "outflow"} of ${fmtUsd(Math.abs(latest.netFlow), { compact: true })} on ${latest.date}, a ${streak}-day ${streakWord} streak, bringing demand over 7 trading days to ${usd(net7)}.`,
  );
  return {
    id: "etf_flow",
    name: "ETF Demand",
    unit: "USD",
    frequency: "trading-day",
    available: true,
    current: latest.netFlow,
    currentLabel: usd(latest.netFlow),
    band: { key: streakWord, label: sign !== 0 ? `${streak}-day ${streakWord} streak` : "flat latest day" },
    bandChanged: null,
    percentile: pctile,
    percentileLabel: pctile != null ? `${ord(pctile)} percentile of daily flows` : null,
    changes,
    spark,
    high30: Math.max(...spark),
    low30: Math.min(...spark),
    status: statusOf(changes, "flow", materiality),
    materiality,
    summary,
    drivers: [],
    asOfLabel: latest.date,
    fresh: true,
  };
}

// ── shared fallbacks ─────────────────────────────────────────────────────────
function unavailable(id: MetricId, name: string, unit: string, frequency: MetricChange["frequency"]): MetricChange {
  return {
    id,
    name,
    unit,
    frequency,
    available: false,
    current: 0,
    currentLabel: "—",
    band: null,
    bandChanged: null,
    percentile: null,
    percentileLabel: null,
    changes: [],
    spark: [],
    high30: null,
    low30: null,
    status: "insufficient",
    materiality: "none",
    summary: "Not enough data yet — this reading fills in as history accumulates.",
    drivers: [],
    asOfLabel: "—",
    fresh: false,
  };
}

// Keep a summary within the spec's 50-word hard cap (never truncate mid-fact —
// the templates are built to fit; this is only a guard).
function clamp(s: string): string {
  const words = s.trim().split(/\s+/);
  return words.length <= 50 ? s : `${words.slice(0, 50).join(" ")}…`;
}

// ── public API ───────────────────────────────────────────────────────────────
// ── Production premium (Market Price vs modelled Cost of Production) ─────────
// The third reference price's relationship to Market Price, in percentage
// points of premium/discount. MODELLED input — the whole metric drops out
// cleanly when the model is unavailable or stale.
function productionPremiumChange(): MetricChange {
  const read = productionCostRead();
  const block = SNAPSHOT.productionCost;
  if (!read.available || read.premiumPct == null || !block) {
    return unavailable("production_premium", "Mining Cost Premium", "pp", "daily");
  }
  // Daily premium series over the window where both Market Price closes and
  // the modelled cost exist (cost is daily in the recent window).
  const costByDate = new Map(block.points.map((p) => [p.date, p.value]));
  const series: Obs[] = [];
  for (const p of PRICE_HISTORY) {
    const iso = new Date(p.ts).toISOString().slice(0, 10);
    const cost = costByDate.get(iso);
    if (cost != null && cost > 0 && p.price > 0) {
      series.push({ ts: p.ts, value: (p.price / cost - 1) * 100 });
    }
  }
  if (series.length < 8) {
    return unavailable("production_premium", "Mining Cost Premium", "pp", "daily");
  }
  const nowObs = series[series.length - 1];
  const cur = read.premiumPct;
  const mk = (period: Period): PeriodChange => {
    const prev = priorAt(series, nowObs.ts - period * 86_400_000);
    if (!prev) {
      return { period, available: false, asOfLabel: null, absChange: 0, pctChange: null, absLabel: "—", pctLabel: null, dir: "flat", good: "neutral" };
    }
    const delta = nowObs.value - prev.value;
    const label = `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)} pp`;
    return {
      period,
      available: true,
      asOfLabel: new Date(prev.ts).toISOString().slice(0, 10),
      absChange: delta,
      pctChange: null,
      absLabel: label,
      pctLabel: null,
      dir: rawDir(delta, 0.1),
      good: semantic("good-up", delta),
    };
  };
  const changes = [mk(1), mk(7), mk(30)];
  const band = classifyPremium(cur);
  const prev7 = priorAt(series, nowObs.ts - 7 * 86_400_000);
  const band7 = prev7 ? classifyPremium(prev7.value) : null;
  const bandChanged =
    band7 && band7.band !== band.band ? { from: band7.label, to: band.label, overDays: 7 } : null;
  const spark = series.slice(-30).map((o) => o.value);
  const values = series.map((o) => o.value);
  const pctile = series.length >= 60 ? rankPercentile(values, cur) : null;
  const move7 = changes[1].available ? Math.abs(changes[1].absChange) : 0;
  const materiality: Materiality = bandChanged ? "band" : move7 < 4 ? "none" : move7 < 10 ? "modest" : "material";
  const rel = cur >= 0 ? "above" : "below";
  const summary = clamp(
    `Bitcoin trades ${Math.abs(cur).toFixed(0)}% ${rel} its estimated mining cost (modelled). ${band.label}${bandChanged ? ` — moved from "${bandChanged.from}" over the last week` : ""}. A network-level electricity estimate — not a guaranteed support level or price floor.`,
  );
  return {
    id: "production_premium",
    name: "Mining Cost Premium",
    unit: "pp",
    frequency: "daily",
    available: true,
    current: cur,
    currentLabel: `${cur >= 0 ? "+" : "−"}${Math.abs(cur).toFixed(0)}%`,
    band: { key: band.band, label: band.label },
    bandChanged,
    percentile: pctile,
    percentileLabel: pctile != null ? `higher than ${pctile}% of tracked days` : null,
    changes,
    spark,
    high30: spark.length ? Math.max(...spark) : null,
    low30: spark.length ? Math.min(...spark) : null,
    status: statusOf(changes, "good-up", materiality),
    materiality,
    summary,
    drivers: ["Market Price moved against the estimated mining cost"],
    asOfLabel: `hashrate observed ${read.hashrateObservedAt ?? "—"}`,
    fresh: true,
  };
}

const BUILDERS: Record<MetricId, () => MetricChange> = {
  price: priceChange,
  market_health: marketHealthChange,
  sentiment: sentimentChangeMetric,
  accumulation: accumulationChange,
  drawdown: drawdownChange,
  etf_flow: etfFlowChange,
  production_premium: productionPremiumChange,
};

export function metricChange(id: MetricId): MetricChange {
  return BUILDERS[id]();
}

export function allMetricChanges(): MetricChange[] {
  return (Object.keys(BUILDERS) as MetricId[]).map((id) => BUILDERS[id]());
}
