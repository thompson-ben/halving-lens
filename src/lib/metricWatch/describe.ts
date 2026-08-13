// The Metric Watch describe layer (Cycle Dashboard V2, MW1).
//
// Every member-facing string the Watch emits is composed HERE, quoting the
// movers' and gap engine's own formatters — numbers are never re-derived.
// Renderers (Dashboard, social card, captions, admin) print these strings
// verbatim; no renderer recomputes or rephrases a market claim.
//
// The product contract is compression: ONE metric, ONE number, ONE
// movement, ONE context line. Proximity language only ever says
// "approaching / moving toward / moving closer" — never a forecast.
//
// Historical context. Not forecasts.

import {
  metricById,
  formatValue,
  formatMovement,
  rarityLine,
  periodAdjective,
  periodLabel,
  type Movement,
} from "../marketMovers";
import { gapPhrase, gapTrajectoryLine, gapRarity } from "../referenceGaps";
import { lifecycleOf } from "../stateLifecycle";
import type {
  ApproachCandidate,
  MetricWatchCandidate,
  RawCandidate,
  StateRun,
  WatchLifecycle,
} from "./index";
import { METRIC_WATCH_VERSION, WATCH_THRESHOLDS } from "./index";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

const REF_LABEL: Record<string, string> = {
  ma200: "the 200-day average",
  realized_price: "the realised price",
  mining_cost: "the estimated mining cost",
};

/** House number formatting without a full Movement in hand — delegates to
 *  the movers' own formatValue with the registry's unit/decimals, so a
 *  value can never render two different ways on two surfaces. */
function fmtRaw(metricId: string, value: number): string {
  const m = metricById(metricId);
  if (!m) return String(value);
  return formatValue({ unit: m.unit, metricId: m.id, decimals: m.decimals, current: value } as Movement, value);
}

export function lifecycleFromRun(run: StateRun): WatchLifecycle {
  return {
    state: lifecycleOf(run.ageDays),
    sinceDate: run.sinceDate,
    ageDays: run.ageDays,
    sinceIsSeriesStart: run.sinceIsSeriesStart,
  };
}

/** "since 6 Aug 2026" — or the honest "for at least N days (its full
 *  observed record)" when the run is open at the series start. */
const sinceClause = (run: StateRun): string =>
  run.sinceIsSeriesStart
    ? `for at least ${run.ageDays} days — its full observed record`
    : `since ${prettyDate(run.sinceDate)}`;

// ── Most Interesting ────────────────────────────────────────────────────────

export function describeMostInteresting(c: RawCandidate, asOf: string): MetricWatchCandidate {
  const metric = metricById(c.metricId)!;
  const m = c.movement;

  let headline: string;
  let whyNoteworthy: string;
  let historicalContext: string;
  let currentValue: number;
  let currentLabel: string;

  switch (c.kind) {
    case "band_transition": {
      const run = c.run!;
      currentValue = run.value;
      currentLabel = fmtRaw(c.metricId, run.value);
      headline = `${metric.label} has entered ${run.current.label}.`;
      whyNoteworthy = m
        ? `${formatMovement(m)} over the last ${periodLabel(7)}, out of ${run.previous!.label}.`
        : `Moved out of ${run.previous!.label} on ${prettyDate(run.sinceDate)}.`;
      historicalContext = m ? rarityLine(m) : `Its first ${run.current.label} reading of this run.`;
      break;
    }
    case "reference_transition": {
      const run = c.run!;
      const ref = REF_LABEL[c.evidence.referenceId ?? ""] ?? "its reference";
      currentValue = c.gap?.gapNow ?? run.value;
      currentLabel = c.gap ? `${gapPhrase(c.gap.gapNow)} ${ref}` : run.current.label;
      headline = `Market Price has moved ${run.current.label} ${ref}.`;
      whyNoteworthy = `Crossed from ${run.previous!.label} to ${run.current.label} on ${prettyDate(run.sinceDate)} — now ${gapPhrase(c.gap?.gapNow ?? run.value)} ${ref}.`;
      historicalContext = c.gap ? gapTrajectoryLine(c.gap) : `It had been ${run.previous!.label} ${ref}.`;
      break;
    }
    case "movement": {
      // Posture C: only exceptional movements reach the flagship, so the
      // headline is always the record-tier wording.
      currentValue = m!.current;
      currentLabel = formatValue(m!);
      headline = `One of ${metric.label}'s largest ${periodAdjective(m!.period)} moves on record.`;
      whyNoteworthy = `${formatMovement(m!)} over the last ${periodLabel(m!.period)}.`;
      historicalContext = rarityLine(m!);
      break;
    }
    case "gap_shift": {
      const g = c.gap!;
      currentValue = g.gapNow;
      currentLabel = `${gapPhrase(g.gapNow)} the market`;
      headline = `The market's gap to ${metric.label} shifted sharply.`;
      whyNoteworthy = gapTrajectoryLine(g);
      const r = gapRarity(g);
      historicalContext = r ? (r.evidence ? `${r.line} ${r.evidence}` : r.line) : "";
      break;
    }
    default: {
      currentValue = m?.current ?? 0;
      currentLabel = m ? formatValue(m) : String(currentValue);
      headline = `${metric.label} did something noteworthy.`;
      whyNoteworthy = m ? formatMovement(m) : "";
      historicalContext = m ? rarityLine(m) : "";
    }
  }

  return {
    mode: "most_interesting",
    metricId: c.metricId,
    label: metric.label,
    href: metric.href,
    nature: metric.nature,
    currentValue,
    currentLabel,
    comparisonWindow: c.period,
    movementLabel: m ? formatMovement(m) : null,
    significance: {
      value: c.significance,
      band: c.band,
      rarityState: c.rarityState,
      rarityPercentile: c.rarityPercentile,
      observations: c.observations,
    },
    lifecycle: c.run ? lifecycleFromRun(c.run) : null,
    headline,
    whyNoteworthy,
    historicalContext,
    cycleContext: null,
    asOf: m?.asOf ?? c.gap?.asOf ?? c.run?.asOf ?? asOf,
    version: METRIC_WATCH_VERSION,
    evidence: c.evidence,
  };
}

// ── One to Watch ────────────────────────────────────────────────────────────

export function describeOneToWatch(a: ApproachCandidate, asOf: string): MetricWatchCandidate {
  const metricId = a.referenceId ?? a.def.moverId;
  const metric = metricById(metricId)!;

  let headline: string;
  let whyNoteworthy: string;
  let historicalContext: string;
  let currentValue: number;
  let currentLabel: string;

  if (a.gap && a.referenceId) {
    const ref = REF_LABEL[a.referenceId];
    currentValue = a.gap.gapNow;
    currentLabel = `${gapPhrase(a.gap.gapNow)} ${ref}`;
    headline = `Market Price is moving closer to ${ref}.`;
    whyNoteworthy = gapTrajectoryLine(a.gap);
    historicalContext = `The market has been ${a.run.current.label} ${ref} ${sinceClause(a.run)}.`;
  } else {
    currentValue = a.run.value;
    currentLabel = fmtRaw(metricId, a.run.value);
    headline = `${metric.label} is approaching its ${a.targetLabel} range.`;
    whyNoteworthy = `Now ${currentLabel}, moving toward the ${a.targetLabel} boundary at ${fmtRaw(metricId, a.boundaryValue)}${a.toward30 ? " — the 30-day trajectory agrees" : ""}.`;
    historicalContext = `It has read ${a.run.current.label} ${sinceClause(a.run)}.`;
  }

  return {
    mode: "one_to_watch",
    metricId,
    label: metric.label,
    href: metric.href,
    nature: metric.nature,
    currentValue,
    currentLabel,
    comparisonWindow: 7,
    movementLabel: null,
    significance: null,
    lifecycle: lifecycleFromRun(a.run),
    headline,
    whyNoteworthy,
    historicalContext,
    cycleContext: null,
    asOf: a.gap?.asOf ?? a.run.asOf,
    version: METRIC_WATCH_VERSION,
    evidence: {
      kind: "approach",
      metricId,
      period: 7,
      stateKey: a.run.current.key,
      fromStateKey: null,
      boundaryKey: a.targetKey,
      boundaryValue: a.boundaryValue,
      direction: a.direction,
      referenceId: a.referenceId,
      threshold: a.gap
        ? { name: "GAP_NEAR_PP", value: WATCH_THRESHOLDS.GAP_NEAR_PP }
        : { name: "PROXIMITY_BAND_FRACTION", value: WATCH_THRESHOLDS.PROXIMITY_BAND_FRACTION },
      eventKey: a.gap
        ? `approach:price:${a.referenceId}:${a.targetKey}`
        : `approach:${metricId}:${a.targetKey}`,
    },
  };
}

// ── quiet days ──────────────────────────────────────────────────────────────

/** Engine-owned quiet wording. "Today" is claimed only when every watched
 *  series is current to the global anchor; otherwise the claim is scoped
 *  honestly to the readings actually available.
 *
 *  Wording (V2.1 Phase 1 founder correction): the Watch's quiet claim
 *  describes its own higher bar — the Exceptional threshold and fresh
 *  state changes — and deliberately avoids the word "unusual", which is a
 *  formal significance band the movement summary may be displaying on the
 *  same screen. "RHODL moved unusually" and "nothing cleared the Watch's
 *  stronger bar" must be able to coexist without reading as contradiction. */
export function quietLineFor(allCurrent: boolean): string {
  return allCurrent
    ? "No exceptional movement or fresh state change is showing today."
    : "No exceptional movement or fresh state change is showing in the latest available readings.";
}
