// Market Movers — the metric registry and its data wiring (PR-SB1).
//
// One entry per reading the platform can honestly measure a movement for.
// Every series is either taken from an already-observed source or derived
// from the permanent daily price archive — there is no new data source and
// no second calculation path for anything that already exists.
//
// HONEST-WINDOW DISCIPLINE (audited before implementation):
//   · On-chain STATE readings (MVRV-Z, NUPL, SOPR, RHODL, Reserve Risk,
//     Realised Price) are observed daily only from 2022-07-26. The weekly
//     cycle samples carry pre-2022 values for these, but those are modelled
//     backfill — they are NEVER used here, exactly as the platform's
//     observed-window discipline requires.
//   · PRICE-DERIVED readings (200-day average, Mayer Multiple, Puell
//     Multiple, drawdown from the running high) are computed here from the
//     daily archive, so their long history is real arithmetic on observed
//     prices, not backfill. Their nature is "derived".
//   · Fear & Greed is observed daily from 2018-02-01.
//   · Estimated Mining Cost is a weekly modelled series from 2016-01-04 —
//     nature "estimated".
//   · ETF net flows are observed on trading days over the provider's rolling
//     ~300-trading-day window (the committed start date moves forward as old
//     rows fall off) — a short window that every consumer must disclose.
//   · Market Health exists only as far back as the stored brief archive
//     (~2 months today), which is below the rarity floor: it ranks, but it
//     makes no rarity claim until the archive is deep enough.

import { PRICE_ARCHIVE } from "../data/priceArchiveData";
import { SNAPSHOT } from "../data/snapshot";
import { STORED_BRIEFS } from "../data/briefs";
import { HALVINGS } from "../data/types";
import { accumulationSeries, ACCUMULATION_BANDS } from "../accumulation";
import { bandFor as sentimentBandFor } from "../sentiment";
import { scoreBand as healthScoreBand } from "../cycleSummary";
import type { MetricNature, MovementKind, MovementUnit, MoverPeriod } from "./types";
import { cadenceDays, type Point } from "./distribution";

export interface BandDef {
  /** Label for a value — the metric's own published vocabulary. */
  label: (v: number) => string;
}

export interface MoverMetric {
  id: string;
  label: string;
  what: string;
  nature: MetricNature;
  unit: MovementUnit;
  kind: MovementKind;
  decimals: number;
  href: string;
  /** Ascending, de-duplicated series in the metric's own units. */
  series: () => Point[];
  /** Band vocabulary, where the metric publishes one. */
  band?: BandDef;
  /** Periods the caller may request; derived from cadence at runtime. */
  supports?: (period: MoverPeriod) => boolean;
}

// ── series helpers ───────────────────────────────────────────────────────────

const archive = (): Point[] => PRICE_ARCHIVE.map((p) => ({ date: p.date, value: p.value }));

/** Simple moving average over `n` observations, emitted once warmed up. */
function sma(series: readonly Point[], n: number): Point[] {
  const out: Point[] = [];
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i].value;
    if (i >= n) sum -= series[i - n].value;
    if (i >= n - 1) out.push({ date: series[i].date, value: sum / n });
  }
  return out;
}

let _ma200: Point[] | null = null;
const ma200 = (): Point[] => (_ma200 ??= sma(archive(), 200));

/** Mayer Multiple — price divided by its 200-day average (published
 *  definition), computed daily from the archive. */
let _mayer: Point[] | null = null;
function mayer(): Point[] {
  if (_mayer) return _mayer;
  const byDate = new Map(archive().map((p) => [p.date, p.value]));
  _mayer = ma200()
    .map((m) => {
      const px = byDate.get(m.date);
      return px != null && m.value > 0 ? { date: m.date, value: px / m.value } : null;
    })
    .filter((p): p is Point => p != null);
  return _mayer;
}

/** Block subsidy in force on a date (the protocol's own schedule). */
function subsidyOn(iso: string): number {
  let reward = 50;
  for (const k of [2, 3, 4, 5, 6] as const) {
    if (iso >= HALVINGS[k]) reward /= 2;
  }
  return reward;
}

/** Puell Multiple — daily issuance value divided by its own 365-day
 *  average (published definition), computed daily from the archive. */
let _puell: Point[] | null = null;
function puell(): Point[] {
  if (_puell) return _puell;
  const issuance = archive().map((p) => ({ date: p.date, value: subsidyOn(p.date) * 144 * p.value }));
  const avg = sma(issuance, 365);
  const byDate = new Map(issuance.map((p) => [p.date, p.value]));
  _puell = avg
    .map((a) => {
      const v = byDate.get(a.date);
      return v != null && a.value > 0 ? { date: a.date, value: v / a.value } : null;
    })
    .filter((p): p is Point => p != null);
  return _puell;
}

/** Drawdown from the running all-time high, in percentage points (≤ 0). */
let _drawdown: Point[] | null = null;
function drawdown(): Point[] {
  if (_drawdown) return _drawdown;
  let peak = 0;
  _drawdown = archive().map((p) => {
    if (p.value > peak) peak = p.value;
    return { date: p.date, value: peak > 0 ? (p.value / peak - 1) * 100 : 0 };
  });
  return _drawdown;
}

const onchain = (key: "mvrvZscore" | "nupl" | "sopr" | "realizedPrice" | "reserveRisk" | "rhodl"): Point[] =>
  ((SNAPSHOT.onchain?.series as Record<string, Array<{ date: string; value: number }>> | undefined)?.[key] ?? []).map(
    (p) => ({ date: p.date, value: p.value }),
  );

const sentimentSeries = (): Point[] =>
  ((SNAPSHOT.sentiment?.points ?? []) as Array<{ ts: number; value: number }>)
    .map((p) => ({ date: new Date(p.ts).toISOString().slice(0, 10), value: p.value }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

const etfSeries = (): Point[] =>
  ((SNAPSHOT.etf?.points ?? []) as Array<{ date: string; netFlow: number }>)
    .map((p) => ({ date: p.date, value: p.netFlow }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

const miningCostSeries = (): Point[] =>
  ((SNAPSHOT.productionCost?.points ?? []) as Array<{ date: string; value: number }>).map((p) => ({
    date: p.date,
    value: p.value,
  }));

const accumulationPoints = (): Point[] => accumulationSeries().map((p) => ({ date: p.date, value: p.score }));

/** Market Health's only real history is the stored brief archive. */
const marketHealthSeries = (): Point[] =>
  STORED_BRIEFS.filter((b) => typeof b.cycleScore === "number")
    .map((b) => ({ date: b.slug, value: b.cycleScore as number }))
    .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

// ── the registry ─────────────────────────────────────────────────────────────

export const MOVER_METRICS: MoverMetric[] = [
  {
    id: "price",
    label: "Market Price",
    what: "What one Bitcoin trades for",
    nature: "observed",
    unit: "pct",
    kind: "level",
    decimals: 0,
    href: "/price",
    series: archive,
  },
  {
    id: "ma200",
    label: "200-Day Average",
    what: "The long-term price trend",
    nature: "derived",
    unit: "pct",
    kind: "level",
    decimals: 0,
    href: "/four-reference-prices",
    series: ma200,
  },
  {
    id: "mayer",
    label: "Mayer Multiple",
    what: "Price relative to its 200-day average",
    nature: "derived",
    unit: "points",
    kind: "level",
    decimals: 2,
    href: "/metrics/mayer-multiple",
    series: mayer,
  },
  {
    id: "realized_price",
    label: "Realised Price",
    what: "The average holder's cost basis",
    nature: "observed",
    unit: "pct",
    kind: "level",
    decimals: 0,
    href: "/metrics/realized-price",
    series: () => onchain("realizedPrice"),
  },
  {
    id: "mining_cost",
    label: "Est. Mining Cost",
    what: "Modelled electricity cost to mine one Bitcoin",
    nature: "estimated",
    unit: "pct",
    kind: "level",
    decimals: 0,
    href: "/metrics/estimated-mining-cost",
    series: miningCostSeries,
  },
  {
    id: "mvrv_z",
    label: "MVRV Z-Score",
    what: "Market value against realised value, standardised",
    nature: "observed",
    unit: "points",
    kind: "level",
    decimals: 2,
    href: "/metrics/mvrv-z-score",
    series: () => onchain("mvrvZscore"),
  },
  {
    id: "puell",
    label: "Puell Multiple",
    what: "Daily issuance value against its yearly average",
    nature: "derived",
    unit: "points",
    kind: "level",
    decimals: 2,
    href: "/metrics/puell-multiple",
    series: puell,
  },
  {
    id: "nupl",
    label: "NUPL",
    what: "Net unrealised profit or loss across the network",
    nature: "observed",
    unit: "points",
    kind: "level",
    decimals: 3,
    href: "/metrics/nupl",
    series: () => onchain("nupl"),
  },
  {
    id: "sopr",
    label: "SOPR",
    what: "Whether coins move at a profit or a loss",
    nature: "observed",
    unit: "points",
    kind: "level",
    decimals: 3,
    href: "/metrics/sopr",
    series: () => onchain("sopr"),
  },
  {
    id: "reserve_risk",
    label: "Reserve Risk",
    what: "Long-term holder conviction against price",
    nature: "observed",
    unit: "pct",
    kind: "level",
    decimals: 5,
    href: "/metrics/reserve-risk",
    series: () => onchain("reserveRisk"),
  },
  {
    id: "rhodl",
    label: "RHODL Ratio",
    what: "Recent against older holder activity",
    nature: "observed",
    unit: "pct",
    kind: "level",
    decimals: 0,
    href: "/metrics/rhodl",
    series: () => onchain("rhodl"),
  },
  {
    id: "fear_greed",
    label: "Fear & Greed",
    what: "The market's prevailing mood, 0–100",
    nature: "observed",
    unit: "points",
    kind: "level",
    decimals: 0,
    href: "/sentiment",
    series: sentimentSeries,
    band: { label: (v) => sentimentBandFor(v).label },
  },
  {
    id: "accumulation",
    label: "Accumulation Index",
    what: "How stretched or depressed price is versus its own history",
    nature: "derived",
    unit: "points",
    kind: "level",
    decimals: 0,
    href: "/accumulation",
    series: accumulationPoints,
    band: {
      label: (v) => (ACCUMULATION_BANDS.find((b) => v >= b.range[0] && v < b.range[1]) ?? ACCUMULATION_BANDS[ACCUMULATION_BANDS.length - 1]).label,
    },
  },
  {
    id: "market_health",
    label: "Market Health",
    what: "The composite read across cycle conditions",
    nature: "derived",
    unit: "points",
    kind: "level",
    decimals: 0,
    href: "/market-health",
    series: marketHealthSeries,
    band: { label: (v) => healthScoreBand(v).label },
  },
  {
    id: "drawdown",
    label: "Drawdown from High",
    what: "How far price sits below its running all-time high",
    nature: "derived",
    unit: "points",
    kind: "level",
    decimals: 0,
    href: "/historical-price-paths",
    series: drawdown,
  },
  {
    id: "etf_flows",
    label: "ETF Net Flows",
    what: "Net demand through the US spot ETFs",
    nature: "observed",
    unit: "usd",
    kind: "flow",
    decimals: 0,
    href: "/etf",
    series: etfSeries,
  },
];

export function metricById(id: string): MoverMetric | undefined {
  return MOVER_METRICS.find((m) => m.id === id);
}

/** Effective cadence of a registered metric's series, from its own data. */
export function metricCadence(m: MoverMetric): number {
  return cadenceDays(m.series());
}
