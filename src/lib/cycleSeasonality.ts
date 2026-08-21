// Cycle-Aligned Seasonality — the data-bound engine (PR-V2A).
//
// Owns everything that touches committed data: cycle spans from the real
// halving dates, cell generation over the permanent daily archive and the
// calendar engine's series sources (one engine, no second calculation path),
// per-cycle coverage, and the month-level configuration detail. The grid
// horizon is derived from the OBSERVED record (the 2020 cycle's partial
// month 47 today) — the projected 2028 halving may label the current
// position, but it never generates cells. Historical cycle comparison,
// not an expected path and not a forecast.

import { PRICE_ARCHIVE } from "./data/priceArchiveData";
import { HALVINGS } from "./data/types";
import { configurationName, weeklyConfigurationTable } from "./fourReferencePrices";
import { defaultSources, seriesFor, type SeasonalitySources } from "./seasonality";
import type { Mode, SeriesKey, ValuationSeries } from "./seasonalityCore";
import {
  agreementFactsFrom,
  cycleMonthGap,
  cycleMonthReturn,
  maxObservedMonth,
  monthBoundaries,
  type AgreementFact,
  type CycleMonthCell,
} from "./cycleSeasonalityCore";

export * from "./cycleSeasonalityCore";

export interface CycleSpan {
  id: number;
  /** "2012 cycle" — the halving year, the site's cycle naming. */
  label: string;
  short: string; // "’12"
  anchor: string; // halving date
  /** Exclusive end: the next halving for completed cycles; the day after the
   *  last archived close for the current one. */
  endExclusive: string;
  completed: boolean;
}

const dayAfter = (iso: string): string => new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/** The four halving-anchored cycles over the observed record. */
export function cycleSpans(todayIso = PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1]?.date ?? ""): CycleSpan[] {
  const anchors: Array<[number, string, string | null]> = [
    [2, HALVINGS[2], HALVINGS[3]],
    [3, HALVINGS[3], HALVINGS[4]],
    [4, HALVINGS[4], HALVINGS[5]],
    [5, HALVINGS[5], null],
  ];
  return anchors
    .filter(([, anchor]) => anchor <= todayIso)
    .map(([id, anchor, next]) => {
      const completed = next != null && next <= todayIso;
      return {
        id,
        label: `${anchor.slice(0, 4)} cycle`,
        short: `’${anchor.slice(2, 4)}`,
        anchor,
        endExclusive: completed ? (next as string) : dayAfter(todayIso),
        completed,
      };
    });
}

/** All cells for one (mode, series): every cycle row is enumerated for every
 *  observed month — a series with no data in a cycle yields null cells
 *  ("not observed in this cycle"), never a missing row. */
export function cycleCells(
  mode: Mode,
  series: SeriesKey,
  src: SeasonalitySources = defaultSources(),
  todayIso = PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1]?.date ?? "",
): Map<number, CycleMonthCell[]> {
  const spans = cycleSpans(todayIso);
  const closes = [...src.closes].sort((a, b) => (a.date < b.date ? -1 : 1));
  const ref = mode === "valuation" ? [...seriesFor(series, src)].sort((a, b) => (a.date < b.date ? -1 : 1)) : null;
  const line = mode === "returns" ? [...seriesFor(series, src)].sort((a, b) => (a.date < b.date ? -1 : 1)) : closes;
  const out = new Map<number, CycleMonthCell[]>();
  for (const s of spans) {
    const cells: CycleMonthCell[] = [];
    for (let k = 0; monthBoundaries(s.anchor, k).from < s.endExclusive; k++) {
      // The current cycle's running month stays partial through its final
      // day (boundary rule in the core): its edge is todayIso itself, while
      // completed cycles keep the halving-cut semantics.
      const runningEdge = s.completed ? undefined : todayIso;
      const cell =
        mode === "returns"
          ? cycleMonthReturn(line, s.anchor, k, s.endExclusive, s.id, runningEdge)
          : cycleMonthGap(closes, ref!, s.anchor, k, s.endExclusive, s.id, runningEdge);
      cells.push(
        cell ?? {
          cycleId: s.id,
          month: k,
          value: null,
          raw: null,
          partial: false,
          from: monthBoundaries(s.anchor, k).from,
          to: monthBoundaries(s.anchor, k).to < s.endExclusive ? monthBoundaries(s.anchor, k).to : s.endExclusive,
        },
      );
    }
    out.set(s.id, cells);
  }
  return out;
}

/** The only generated cross-cycle claims: market-return agreement months
 *  across ALL completed cycles (strict unrounded sign, display-zero neutral,
 *  partial and unobserved months never qualify). */
export function agreementFacts(todayIso = PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1]?.date ?? ""): AgreementFact[] {
  const spans = cycleSpans(todayIso);
  const cells = cycleCells("returns", "market", defaultSources(), todayIso);
  return agreementFactsFrom(cells, spans.filter((s) => s.completed).map(({ id, label }) => ({ id, label })));
}

export interface CycleCoverage {
  id: number;
  label: string;
  completed: boolean;
  spanDays: number;
  completeMonths: number;
  /** The clipped final month's index (a completed cycle's stub, or the
   *  current cycle's running month) — null only if none exists. */
  partialMonth: number | null;
  /** First month index where each reference is observable in this cycle —
   *  null when the reference never overlaps the cycle. */
  referenceFrom: Record<ValuationSeries, number | null>;
}

export function cycleCoverage(todayIso = PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1]?.date ?? ""): CycleCoverage[] {
  const spans = cycleSpans(todayIso);
  const src = defaultSources();
  const byMode: Record<ValuationSeries, Map<number, CycleMonthCell[]>> = {
    trend: cycleCells("valuation", "trend", src, todayIso),
    holders: cycleCells("valuation", "holders", src, todayIso),
    miners: cycleCells("valuation", "miners", src, todayIso),
  };
  const market = cycleCells("returns", "market", src, todayIso);
  return spans.map((s) => {
    const cells = market.get(s.id) ?? [];
    const complete = cells.filter((c) => c.value != null && !c.partial).length;
    const partial = cells.find((c) => c.partial && c.value != null);
    const referenceFrom = (Object.keys(byMode) as ValuationSeries[]).reduce(
      (acc, key) => {
        const first = (byMode[key].get(s.id) ?? []).find((c) => c.value != null);
        acc[key] = first ? first.month : null;
        return acc;
      },
      {} as Record<ValuationSeries, number | null>,
    );
    return {
      id: s.id,
      label: s.label,
      completed: s.completed,
      spanDays: Math.round((Date.parse(s.endExclusive) - Date.parse(s.anchor)) / 86_400_000) - (s.completed ? 0 : 1),
      completeMonths: complete,
      partialMonth: partial ? partial.month : null,
      referenceFrom,
    };
  });
}

/** Configuration context for one anchored cycle month: the LATEST weekly
 *  configuration row observed INSIDE the (clipped) month — the staleness
 *  limit is the month itself, so weekly data is never presented with false
 *  daily precision and a month with no weekly row has no configuration. */
export function monthConfigDetail(
  cycleId: number,
  month: number,
  todayIso = PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1]?.date ?? "",
): { config: string; asOf: string } | null {
  const span = cycleSpans(todayIso).find((s) => s.id === cycleId);
  if (!span) return null;
  const { from, to } = monthBoundaries(span.anchor, month);
  const clippedTo = to < span.endExclusive ? to : span.endExclusive;
  const rows = weeklyConfigurationTable().filter((r) => r.date >= from && r.date < clippedTo);
  if (rows.length === 0) return null;
  const last = rows[rows.length - 1];
  // The framework's own naming helper — this engine can never drift from
  // the FRP vocabulary.
  return { config: configurationName(last.aboveTrend, last.aboveHolders, last.aboveMiners), asOf: last.date };
}

/** Where the current cycle stands — the projected next halving may LABEL the
 *  position (always "(projected)"), but generates no cells. */
export function currentCyclePosition(todayIso = PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1]?.date ?? ""): {
  cycleId: number;
  month: number;
  day: number;
  projectedNextHalving: string;
} | null {
  const current = cycleSpans(todayIso).find((s) => !s.completed);
  if (!current) return null;
  let k = 0;
  while (monthBoundaries(current.anchor, k + 1).from <= todayIso) k++;
  return {
    cycleId: current.id,
    month: k,
    day: Math.round((Date.parse(todayIso) - Date.parse(current.anchor)) / 86_400_000),
    projectedNextHalving: HALVINGS[6],
  };
}

export function gridHorizon(todayIso = PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1]?.date ?? ""): number {
  return maxObservedMonth(cycleCells("returns", "market", defaultSources(), todayIso));
}
