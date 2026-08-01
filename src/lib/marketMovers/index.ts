// Market Movers — assembly (PR-SB1).
//
// Turns the registry plus the pure statistics into the ranked, presentation-
// agnostic contract. Every number carries its observation count, its honest
// window and whether a rarity CLAIM is permitted at all. Ranking is by
// significance within each metric's OWN distribution — never by raw
// percentage, because a 3% move means something entirely different to the
// Mayer Multiple than to price.
//
// Historical context. Not forecasts.

import type { Crossing, MoverPeriod, MoversResult, Movement } from "./types";
import { MOVER_METRICS, metricById, type MoverMetric } from "./registry";
import {
  absPercentile,
  bandFor,
  cadenceDays,
  CROSSING_SIGNIFICANCE_FLOOR,
  dayNum,
  flowSum,
  historicalMoves,
  levelMove,
  MATERIAL_SIGNIFICANCE,
  periodSupported,
  RARITY_MIN_OBSERVATIONS,
  valueOn,
  type Point,
} from "./distribution";

export * from "./types";
export { MOVER_METRICS, metricById } from "./registry";
export {
  RARITY_MIN_OBSERVATIONS,
  CROSSING_SIGNIFICANCE_FLOOR,
  MATERIAL_SIGNIFICANCE,
  bandFor,
} from "./distribution";

const isoAt = (n: number): string => new Date(n * 86_400_000).toISOString().slice(0, 10);

/** A band crossing inside the period, expressed in the metric's own
 *  published vocabulary. Only fires when the LABEL actually changed. */
export function bandCrossing(m: MoverMetric, series: readonly Point[], anchor: string, period: MoverPeriod): Crossing | null {
  if (!m.band) return null;
  const now = valueOn(series, anchor);
  const then = valueOn(series, isoAt(dayNum(anchor) - period));
  if (!now || !then || now.date === then.date) return null;
  const from = m.band.label(then.value);
  const to = m.band.label(now.value);
  if (from === to) return null;
  return { kind: "band", label: `${m.label} moved from ${from} to ${to}`, from, to };
}

/** Price crossing one of its reference prices inside the period. Both sides
 *  are compared at their OWN dates (the reference moves too), and every
 *  series comes from this registry — one calculation path. */
export function referenceCrossing(priceSeries: readonly Point[], anchor: string, period: MoverPeriod): Crossing | null {
  const nowP = valueOn(priceSeries, anchor);
  const thenIso = isoAt(dayNum(anchor) - period);
  const thenP = valueOn(priceSeries, thenIso);
  if (!nowP || !thenP || nowP.date === thenP.date) return null;

  const refs: Array<{ id: string; label: string }> = [
    { id: "ma200", label: "the 200-day average" },
    { id: "realized_price", label: "the realised price" },
    { id: "mining_cost", label: "the estimated mining cost" },
  ];
  for (const r of refs) {
    const meta = metricById(r.id);
    if (!meta) continue;
    const s = meta.series();
    const nowR = valueOn(s, anchor);
    const thenR = valueOn(s, thenIso);
    if (!nowR || !thenR || nowR.value <= 0 || thenR.value <= 0) continue;
    const wasAbove = thenP.value >= thenR.value;
    const isAbove = nowP.value >= nowR.value;
    if (wasAbove !== isAbove) {
      // Neutral wording: either side may have moved (a weekly reference can
      // step past a static price), so the label describes the RELATIONSHIP
      // changing, never which side caused it.
      return {
        kind: "reference",
        label: `Market Price moved from ${wasAbove ? "above" : "below"} to ${isAbove ? "above" : "below"} ${r.label}`,
        from: wasAbove ? "above" : "below",
        to: isAbove ? "above" : "below",
      };
    }
  }
  return null;
}

function build(m: MoverMetric, globalAnchor: string, period: MoverPeriod): Movement | { reason: string } {
  const series = m.series();
  if (series.length < 2) return { reason: "no observations" };
  const cadence = cadenceDays(series);
  if (!periodSupported(series, period)) {
    return { reason: `series resolves every ${cadence} days — a ${period}-day movement is not observable` };
  }

  // Each metric is measured to ITS OWN latest observation when that sits
  // before the reporting anchor. A series that lags by a day must not have
  // its period silently truncated (which would understate a flow and make a
  // one-day level move uncomputable) — instead it reports honestly as of its
  // own last observation, and carries that date for the caller to disclose.
  const last = series[series.length - 1].date;
  const anchor = last < globalAnchor ? last : globalAnchor;

  const pct = m.unit === "pct";
  let current: number;
  let previous: number | null = null;
  let previousPeriodFlow: number | null = null;
  let movement: number;

  if (m.kind === "flow") {
    const net = flowSum(series, anchor, period);
    if (net == null) return { reason: "no flows in the period" };
    const prior = flowSum(series, isoAt(dayNum(anchor) - period), period);
    current = net;
    movement = net;
    previousPeriodFlow = prior;
  } else {
    const mv = levelMove(series, anchor, period, pct);
    if (!mv) return { reason: "no comparable earlier observation" };
    current = mv.current;
    previous = mv.previous;
    movement = mv.movement;
  }

  const moves = historicalMoves(series, period, m.kind, pct);
  const observations = moves.length;
  const rarityClaimAllowed = observations >= RARITY_MIN_OBSERVATIONS;
  const pctile = absPercentile(moves, movement);
  const rarityPercentile = rarityClaimAllowed ? pctile : null;

  const crossing =
    bandCrossing(m, series, anchor, period) ?? (m.id === "price" ? referenceCrossing(series, anchor, period) : null);

  // Significance ranks every metric even when a rarity claim is withheld:
  // without a permitted claim we fall back to the raw percentile if one
  // exists (descriptive only, never rendered as a claim), else neutral 50.
  const base = pctile ?? 50;
  const significance = crossing ? Math.max(base, CROSSING_SIGNIFICANCE_FLOOR) : base;

  return {
    metricId: m.id,
    label: m.label,
    what: m.what,
    nature: m.nature,
    period,
    current,
    previous,
    previousPeriodFlow,
    movement,
    unit: m.unit,
    kind: m.kind,
    direction: movement > 0 ? "up" : movement < 0 ? "down" : "flat",
    decimals: m.decimals,
    rarityPercentile,
    significance,
    band: bandFor(significance),
    observations,
    window: {
      first: series[0].date,
      last: series[series.length - 1].date,
      points: series.length,
      cadenceDays: cadence,
    },
    rarityClaimAllowed,
    crossing,
    state: m.band ? m.band.label(current) : null,
    href: m.href,
    asOf: anchor,
  };
}

/** The anchor every movement is measured to: the latest date any registered
 *  series carries (deterministic against the committed data, never the
 *  wall clock). */
export function moversAsOf(): string {
  let latest = "";
  for (const m of MOVER_METRICS) {
    const s = m.series();
    const d = s.length ? s[s.length - 1].date : "";
    if (d > latest) latest = d;
  }
  return latest;
}

const cache = new Map<string, MoversResult>();

export function marketMovers(period: MoverPeriod = 7, anchor?: string): MoversResult {
  const asOf = anchor ?? moversAsOf();
  const key = `${period}:${asOf}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const movements: Movement[] = [];
  const steady: Movement[] = [];
  const unavailable: MoversResult["unavailable"] = [];

  for (const m of MOVER_METRICS) {
    const r = build(m, asOf, period);
    if ("reason" in r) {
      unavailable.push({ metricId: m.id, label: m.label, reason: r.reason });
      continue;
    }
    (r.significance >= MATERIAL_SIGNIFICANCE ? movements : steady).push(r);
  }

  // Rank by significance; ties (common when several crossings share the
  // floor) break on the underlying move percentile, then registry order.
  const byRank = (a: Movement, b: Movement) =>
    b.significance - a.significance || (b.rarityPercentile ?? 0) - (a.rarityPercentile ?? 0);
  movements.sort(byRank);
  steady.sort(byRank);

  const result: MoversResult = { period, asOf, movements, steady, unavailable };
  cache.set(key, result);
  return result;
}
