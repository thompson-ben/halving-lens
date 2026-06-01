// Historical Intelligence Warehouse — record builder.
//
// Turns one day's deterministic engine output into the structured rows that the
// daily sync permanently appends to the Supabase warehouse (see
// supabase/warehouse.sql and scripts/warehouse.ts). Principle: store too much
// rather than too little. Every metric, score, signal, state change, narrative,
// brief and content artefact generated today is captured here so the archive
// compounds in value for research, backtesting and future products.
//
// No fabricated numbers: every value traces to the live snapshot/engine. Fields
// we cannot stand behind are written as null, never guessed.

import { format } from "date-fns";
import { SOURCE, TODAY, CHAIN } from "./btcData";
import { cycleSummary, cycleScorecard, scoreBand } from "./cycleSummary";
import { buildBrief, contentPack, cycleInsight, etfInsight, sentimentInsight } from "./brief";
import { etfStats, ETF } from "./etf";
import { currentSentiment, sentimentRead, bandFor, SENTIMENT_AVAILABLE } from "./sentiment";
import { STORED_BRIEFS } from "./data/briefs";
import type { StoredBrief } from "./brief";

export interface WarehouseRecord {
  date: string; // YYYY-MM-DD (UTC snapshot day)
  dailyCycle: Record<string, unknown>;
  dailyMetrics: Record<string, unknown>[];
  dailyIntelligence: Record<string, unknown>;
  scoreComponents: Record<string, unknown>[];
  etfHistory: Record<string, unknown>[];
  stateChanges: Record<string, unknown>[];
}

// Source string for a given engine metric, used to decide live vs modelled.
function metricSource(key: string): string {
  const s = SOURCE.sources as Record<string, string | undefined>;
  return s[key] ?? "";
}
function isLive(source: string): boolean {
  return source !== "" && !/modelled|synthetic|fallback/i.test(source);
}

// Most recent persisted brief strictly before today — the baseline for
// detecting state transitions (Phase 4) without fabricating a prior value.
function priorBrief(todaySlug: string): StoredBrief | null {
  const earlier = STORED_BRIEFS.filter((b) => b.slug < todaySlug).sort((a, b) =>
    a.slug < b.slug ? 1 : -1,
  );
  return earlier[0] ?? null;
}

function etfTrend(weekly: number): "inflow" | "outflow" | "flat" {
  if (weekly > 5e7) return "inflow";
  if (weekly < -5e7) return "outflow";
  return "flat";
}

export function buildWarehouseRecord(): WarehouseRecord {
  const s = cycleSummary();
  const card = cycleScorecard();
  const brief = buildBrief();
  const day = SOURCE.fetchedAt ? new Date(SOURCE.fetchedAt) : new Date();
  const date = format(day, "yyyy-MM-dd");

  const sentiment = SENTIMENT_AVAILABLE ? currentSentiment() : null;
  const sRead = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const etf = ETF.connected ? etfStats() : null;
  const band = scoreBand(card.overall);

  // ── Phase 1 — daily cycle row ──────────────────────────────────────────────
  const dailyCycle: Record<string, unknown> = {
    date,
    btc_price: s.price ?? null,
    market_cap: null, // circulating supply not surfaced through the snapshot yet
    cycle_day: s.cycleDay,
    cycle_progress: s.progressPct,
    cycle_phase: s.phaseLabel,
    cycle_score: card.overall,
    cycle_score_label: band.label,
    risk_level: s.heat,
    heat_level: s.heat,
    confidence: s.confidence,
    historical_position: s.heatPercentile,
    price_change_24h: s.change24h,
    price_change_7d: s.change7d,
    gain_from_halving: s.gainFromHalving,
    drawdown_from_ath: s.drawdownFromAth,
    fear_greed: sentiment?.value ?? null,
    sentiment_state: sRead?.band.label ?? null,
    etf_flow_daily: etf?.latest?.netFlow ?? null,
    etf_flow_weekly: etf?.trailingWeek ?? null,
    etf_cumulative: etf?.cumulative ?? null,
    etf_trend: etf ? etfTrend(etf.trailingWeek) : null,
  };

  // ── Phase 2 — raw metrics (long form) ──────────────────────────────────────
  const m = (
    metric: string,
    value: number | null | undefined,
    unit: string,
    sourceKey?: string,
  ): Record<string, unknown> | null => {
    if (value == null || !Number.isFinite(value)) return null;
    const source = sourceKey ? metricSource(sourceKey) : "";
    return { date, metric, value, unit, is_live: isLive(source), source: source || null };
  };
  const dailyMetrics = [
    m("price", s.price, "usd", "price"),
    m("mvrv", TODAY.mvrv, "ratio", "mvrv"),
    m("mvrv_z", TODAY.mvrvZ, "zscore", "mvrv"),
    m("nupl", TODAY.nupl, "ratio", "nupl"),
    m("sopr", TODAY.sopr, "ratio", "sopr"),
    m("mayer", TODAY.mayer, "ratio", "mayer"),
    m("puell", TODAY.puell, "ratio", "puell"),
    m("reserve_risk", TODAY.reserveRisk, "ratio", "reserveRisk"),
    m("rhodl", TODAY.rhodl, "ratio", "rhodl"),
    m("rainbow_band", TODAY.rainbow, "band", "rainbow"),
    m("realized_price", TODAY.realizedPrice, "usd", "realizedPrice"),
    m("hashrate", CHAIN?.hashrate, "hps"),
    m("block_height", CHAIN?.blockHeight, "blocks"),
    m("fear_greed", sentiment?.value, "index"),
    m("heat_percentile", s.heatPercentile, "pct"),
    m("cycle_score", card.overall, "score"),
    m("etf_flow_weekly", etf?.trailingWeek, "usd"),
    m("etf_cumulative", etf?.cumulative, "usd"),
  ].filter((x): x is Record<string, unknown> => x !== null);

  // ── Phases 3 & 6 — derived intelligence + brief ────────────────────────────
  const dailyIntelligence: Record<string, unknown> = {
    date,
    headline: brief.headline,
    summary: s.summary,
    support: s.support,
    whats_different: s.whatsDifferent,
    what_to_watch: s.whatToWatch,
    conclusion: brief.conclusion,
    insights: [cycleInsight(), etfInsight(), sentimentInsight()].map((i) => ({
      title: i.title,
      body: i.body,
    })),
    watch_signals: s.watchSignals.map((w) => ({
      signal: w.signal,
      status: w.status,
      level: w.level,
      confidence: w.confidence,
    })),
    scorecard: {
      overall: card.overall,
      label: card.overallLabel,
      interpretation: card.interpretation,
      factors: card.factors,
    },
    content: contentPack(), // Phase 7 — cross-channel generated content
  };

  // ── Phase 5 — engine score components ──────────────────────────────────────
  const scoreComponents = card.factors.map((f) => ({
    date,
    factor: f.factor,
    status: f.status,
    score: f.score,
    explanation: f.explanation,
    confidence: f.confidence,
  }));

  // ── Phase 12 — ETF history archive (recent slice, self-healing) ────────────
  // Upsert the trailing window each run so the archive backfills any gaps and
  // stays complete without re-writing the whole series daily.
  const etfHistory: Record<string, unknown>[] = ETF.connected
    ? ETF.points.slice(-30).map((p, i, arr) => {
        const upto = ETF.points.slice(0, ETF.points.length - arr.length + i + 1);
        const last7 = upto.slice(-7);
        const last30 = upto.slice(-30);
        const avg = (xs: typeof last7) =>
          xs.length ? xs.reduce((a, b) => a + b.netFlow, 0) / xs.length : null;
        return {
          date: p.date,
          issuer: "ALL",
          net_flow: p.netFlow,
          cumulative: p.cumulative,
          avg_7d: avg(last7),
          avg_30d: avg(last30),
        };
      })
    : [];

  // ── Phase 4 — state transitions vs the most recent prior brief ─────────────
  const stateChanges: Record<string, unknown>[] = [];
  const prior = priorBrief(date);
  if (prior) {
    // Risk / heat level
    if (prior.heat && prior.heat !== s.heat) {
      stateChanges.push({
        date,
        dimension: "risk_level",
        previous_state: prior.heat,
        current_state: s.heat,
        change_reason: `Heat moved from ${prior.heat} to ${s.heat} as price stretch vs the 200-day average shifted.`,
      });
    }
    // Cycle phase
    if (prior.phaseLabel && prior.phaseLabel !== s.phaseLabel) {
      stateChanges.push({
        date,
        dimension: "cycle_phase",
        previous_state: prior.phaseLabel,
        current_state: s.phaseLabel,
        change_reason: "Calendar position / divergence read advanced the cycle phase label.",
      });
    }
    // Sentiment band
    if (prior.sentimentValue != null && sentiment) {
      const prevBand = bandFor(prior.sentimentValue).label;
      const curBand = bandFor(sentiment.value).label;
      if (prevBand !== curBand) {
        stateChanges.push({
          date,
          dimension: "sentiment",
          previous_state: prevBand,
          current_state: curBand,
          change_reason: `Fear & Greed moved from ${prior.sentimentValue} to ${sentiment.value}.`,
        });
      }
    }
    // ETF trend
    if (prior.etfTrailingWeek != null && etf) {
      const prevTrend = etfTrend(prior.etfTrailingWeek);
      const curTrend = etfTrend(etf.trailingWeek);
      if (prevTrend !== curTrend) {
        stateChanges.push({
          date,
          dimension: "etf_trend",
          previous_state: prevTrend,
          current_state: curTrend,
          change_reason: `Trailing-week ETF flow flipped from ${prevTrend} to ${curTrend}.`,
        });
      }
    }
  }

  return {
    date,
    dailyCycle,
    dailyMetrics,
    dailyIntelligence,
    scoreComponents,
    etfHistory,
    stateChanges,
  };
}
