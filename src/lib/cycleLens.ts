// The cycle-lens engine (Cycle Dashboard V2, CD1).
//
// One question, answered from committed daily data: "what did each Bitcoin
// cycle look like at cycle day D?" — plus one deterministic interpretation:
// "what is the single most notable historical comparison at D, if any?"
//
// Built entirely on the permanent daily price archive and the CD0 cycle-day
// authority. Honesty rules, in order:
//   · Daily granularity, no interpolation — a day exists only if the archive
//     observed it. (CI verifies every cycle window is daily-complete; if a
//     gap ever appeared, the day would be absent, never filled.)
//   · The current cycle stops at the latest committed observation; prior
//     cycles stop the day before their next halving.
//   · A cycle that never reached day D says so explicitly — no value is
//     fabricated for it.
//   · Forward windows exist only where the future observations genuinely
//     exist inside that cycle's own record. The current cycle's future is
//     never computed. Windows are never silently shortened.
//   · No synthetic on-chain data — everything here is price-derived.
//   · Cross-cycle comparisons never use percentile/rarity language: with
//     three prior cycles the statistical machinery of the Market Snapshot
//     does not apply. Significance is declared editorial thresholds with
//     transparent names, or rank among the four cycles — nothing else.
//   · When no comparison crosses its threshold, lensObservation is null.
//     A quiet day is a finding, not a failure.
//
// Deliberately presentation-free: no React, no markup. The future Lens
// surface, share images and packs are renderers of this one engine.
//
// Historical context. Not forecasts.

import { PRICE_ARCHIVE } from "./data/priceArchiveData";
import { HALVINGS } from "./data/types";
import type { OnchainPoint } from "./data/types";
import { cycleAnchor, cycleDayAt } from "./cycleDay";
import { sma } from "./data/sma";

export const LENS_CYCLE_IDS = [2, 3, 4, 5] as const;
export type LensCycleId = (typeof LENS_CYCLE_IDS)[number];

export const FORWARD_WINDOWS = [30, 60, 90] as const;
export type ForwardWindowDays = (typeof FORWARD_WINDOWS)[number];

// ── the daily aligned series ────────────────────────────────────────────────

export interface LensPoint {
  /** Days since this cycle's halving. */
  day: number;
  date: string;
  price: number;
  /** Price as a multiple of this cycle's halving-day close. */
  multiple: number;
  /** Percent below the running cycle high at this day (0 at a new high). */
  drawdownPct: number;
}

export interface LensCycleSeries {
  cycleId: LensCycleId;
  halvingDate: string;
  halvingPrice: number;
  /** Next halving date for completed cycles; null while the cycle is live. */
  endExclusive: string | null;
  completed: boolean;
  lastDay: number;
  /** Daily-derived peak — the highest close inside the cycle window. */
  peakDay: number;
  peakPrice: number;
  points: LensPoint[];
}

/** The aligned series for one cycle, from an explicit archive — fixture-
 *  drivable. Only dates the archive actually observed become points. */
export function lensSeriesFrom(
  archive: readonly OnchainPoint[],
  cycleId: LensCycleId,
): LensCycleSeries | null {
  const halvingDate = HALVINGS[cycleId];
  const endExclusive = cycleId < 5 ? HALVINGS[(cycleId + 1) as 3 | 4 | 5 | 6] : null;

  const points: LensPoint[] = [];
  let halvingPrice = 0;
  let runningHigh = 0;
  let peakDay = 0;
  let peakPrice = 0;
  for (const p of archive) {
    if (p.date < halvingDate) continue;
    if (endExclusive && p.date >= endExclusive) break;
    if (!Number.isFinite(p.value) || p.value <= 0) continue;
    if (halvingPrice === 0) {
      // The first observed day at-or-after the halving anchors the multiple.
      // On live data this IS the halving day (CI verifies the close exists).
      halvingPrice = p.value;
    }
    if (p.value > runningHigh) runningHigh = p.value;
    if (p.value > peakPrice) {
      peakPrice = p.value;
      peakDay = cycleDayAt(p.date, halvingDate);
    }
    points.push({
      day: cycleDayAt(p.date, halvingDate),
      date: p.date,
      price: p.value,
      multiple: p.value / halvingPrice,
      drawdownPct: (p.value / runningHigh - 1) * 100,
    });
  }
  if (points.length === 0) return null;

  return {
    cycleId,
    halvingDate,
    halvingPrice,
    endExclusive,
    completed: cycleId < 5,
    lastDay: points[points.length - 1].day,
    peakDay,
    peakPrice,
    points,
  };
}

let seriesCache: Map<LensCycleId, LensCycleSeries> | null = null;

/** The aligned series on live data, cached per cycle. */
export function lensSeries(cycleId: LensCycleId): LensCycleSeries {
  seriesCache ??= new Map();
  let s = seriesCache.get(cycleId);
  if (!s) {
    const built = lensSeriesFrom(PRICE_ARCHIVE, cycleId);
    if (!built) throw new Error(`lensSeries: no archive coverage for cycle ${cycleId}`);
    seriesCache.set(cycleId, built);
    s = built;
  }
  return s;
}

export function allLensSeries(): LensCycleSeries[] {
  return LENS_CYCLE_IDS.map((id) => lensSeries(id));
}

// ── Mayer Multiple at a date (one methodology, shared with the sync) ────────

let mayerIndex: Map<string, number> | null = null;

/** Mayer Multiple (price / 200-day SMA) at an archive date, or null when the
 *  200 daily observations do not fully exist. Uses the SAME sma() the
 *  snapshot generation uses — one methodology, two callers. */
export function mayerAt(date: string, archive: readonly OnchainPoint[] = PRICE_ARCHIVE): number | null {
  let idx: number;
  if (archive === PRICE_ARCHIVE) {
    if (!mayerIndex) {
      mayerIndex = new Map();
      PRICE_ARCHIVE.forEach((p, i) => mayerIndex!.set(p.date, i));
    }
    const found = mayerIndex.get(date);
    if (found === undefined) return null;
    idx = found;
  } else {
    idx = archive.findIndex((p) => p.date === date);
    if (idx < 0) return null;
  }
  const ma = sma(
    archive === PRICE_ARCHIVE ? mayerPrices() : archive.map((p) => p.value),
    idx,
    200,
  );
  if (ma === undefined || ma <= 0) return null;
  return archive[idx].value / ma;
}

let pricesCache: number[] | null = null;
function mayerPrices(): number[] {
  pricesCache ??= PRICE_ARCHIVE.map((p) => p.value);
  return pricesCache;
}

// ── lensAtDay ───────────────────────────────────────────────────────────────

export type LensForwardWindow =
  | { available: true; changePct: number }
  | { available: false; reason: string };

export type LensCycleAtDay =
  | {
      cycleId: LensCycleId;
      reached: true;
      completed: boolean;
      date: string;
      halvingPrice: number;
      price: number;
      multiple: number;
      returnFromHalvingPct: number;
      drawdownFromHighPct: number;
      /** Null when the 200-day history is not fully observed. */
      mayer: number | null;
      /** Days from D to this cycle's eventual daily peak (negative = the
       *  peak was already behind it). Null for the current cycle — its peak
       *  is not yet knowable. */
      daysToEventualPeak: number | null;
      forward: Record<ForwardWindowDays, LensForwardWindow>;
    }
  | { cycleId: LensCycleId; reached: false; reason: string };

export interface LensAtDay {
  day: number;
  /** The latest committed market observation the current cycle is read to. */
  asOfDate: string;
  currentCycleDay: number;
  cycles: LensCycleAtDay[];
}

const CURRENT_FUTURE_REASON = "The current cycle's future has not happened yet.";

function forwardFor(s: LensCycleSeries, byDay: Map<number, LensPoint>, day: number, w: ForwardWindowDays): LensForwardWindow {
  if (!s.completed) return { available: false, reason: CURRENT_FUTURE_REASON };
  const base = byDay.get(day);
  const future = byDay.get(day + w);
  if (!base || !future) {
    return {
      available: false,
      reason: `Cycle ${s.cycleId}'s record ends at day ${s.lastDay} — a full ${w}-day window from day ${day} is not observable.`,
    };
  }
  return { available: true, changePct: (future.price / base.price - 1) * 100 };
}

const byDayCache = new Map<LensCycleId, Map<number, LensPoint>>();
function pointsByDay(s: LensCycleSeries): Map<number, LensPoint> {
  let m = byDayCache.get(s.cycleId);
  if (!m || m.size !== s.points.length) {
    m = new Map(s.points.map((p) => [p.day, p]));
    byDayCache.set(s.cycleId, m);
  }
  return m;
}

/** Every cycle's equivalent state at cycle day D. A cycle that never reached
 *  D (or hasn't yet) is explicit about it — never a fabricated value. */
export function lensAtDay(day: number): LensAtDay {
  const anchor = cycleAnchor();
  const cycles: LensCycleAtDay[] = LENS_CYCLE_IDS.map((id) => {
    const s = lensSeries(id);
    if (day < 0) {
      return { cycleId: id, reached: false, reason: "Cycle days start at 0 — the halving itself." };
    }
    const p = pointsByDay(s).get(day);
    if (!p) {
      return {
        cycleId: id,
        reached: false,
        reason: s.completed
          ? `Cycle ${id} ended at day ${s.lastDay} — day ${day} does not exist in this cycle.`
          : `The current cycle has not reached day ${day} yet — its record ends at day ${s.lastDay} (${anchor.asOfDate}).`,
      };
    }
    return {
      cycleId: id,
      reached: true,
      completed: s.completed,
      date: p.date,
      halvingPrice: s.halvingPrice,
      price: p.price,
      multiple: p.multiple,
      returnFromHalvingPct: (p.multiple - 1) * 100,
      drawdownFromHighPct: p.drawdownPct,
      mayer: mayerAt(p.date),
      daysToEventualPeak: s.completed ? s.peakDay - day : null,
      forward: {
        30: forwardFor(s, pointsByDay(s), day, 30),
        60: forwardFor(s, pointsByDay(s), day, 60),
        90: forwardFor(s, pointsByDay(s), day, 90),
      },
    };
  });

  return { day, asOfDate: anchor.asOfDate, currentCycleDay: anchor.cycleDay, cycles };
}

// ── lensObservation — the deterministic interpretation layer ────────────────
//
// One most notable historical comparison at day D, or null. Three rules,
// each with an explicit editorial threshold. No percentiles, no rarity
// vocabulary — with n=3 prior cycles the Market Snapshot's distribution
// machinery does not apply here.
//
// Every observation carries LIFECYCLE metadata computed from the Lens's own
// historical state (never a calendar clock): the first day of the
// contiguous run over which the same condition — same kind, same direction
// — has qualified, its age in cycle days, and a class derived from the
// house comparison windows. A condition that lapses and later re-qualifies
// starts a new run: in between, it genuinely was not true.
//
// Selection is lifecycle-first: a condition that just became true at D is
// more notable AT D than one that has held for hundreds of days; the kind
// order breaks ties inside a class. Standing context is still returned —
// classified, never suppressed. What each surface does with a standing
// versus a fresh observation is presentation policy and lives with the
// surfaces, not here.

export const LENS_THRESHOLDS = {
  /** A rank claim ("strongest/weakest of the four cycles") fires only when
   *  the current cycle's multiple is at least this far (relative) from the
   *  NEAREST prior cycle's. Bitcoin's median |7-day| move across the whole
   *  archive is ~5%; requiring a 10% separation means one ordinary week of
   *  movement cannot create or destroy the claim. */
  EXTREME_MARGIN_RATIO: 0.1,
  /** Drawdown divergence vs the prior-cycle median, in percentage points.
   *  The house floor for merely DIRECTIONAL drawdown wording is 3pp
   *  (drawdownAnalysis); "materially" demands a different regime, not a
   *  different word — 15pp is five times that floor and on the scale of the
   *  20–40% pullback range the product itself quotes as ordinary. */
  DRAWDOWN_DIVERGENCE_PP: 15,
  /** Mayer divergence vs the prior-cycle median. 0.5 is one full width of
   *  the product's own Mayer "Above trend" band (1.0–1.5, metrics.ts) — a
   *  divergence of at least a band class, not a wobble inside one. */
  MAYER_DIVERGENCE: 0.5,
} as const;

/** Stable identifier of the Lens interpretation methodology. Changes ONLY
 *  when the methodology changes — thresholds, comparison families, kind
 *  priority, or lifecycle-selection semantics — never on a data refresh.
 *  Pinning it means a future threshold change cannot silently rewrite what
 *  HalvingLens claimed was notable at a historical day. */
export const LENS_OBSERVATION_VERSION = "lens-observation-v1";

/** Lifecycle class boundaries, in cycle days, derived from the house
 *  comparison windows (1/7/30 everywhere movement is compared): a state is
 *  a TRANSITION within its first week, RECENT within its first 30 days,
 *  STANDING beyond that. */
export const LENS_LIFECYCLE = {
  TRANSITION_MAX_AGE_DAYS: 7,
  RECENT_MAX_AGE_DAYS: 30,
} as const;

export type LensLifecycle = "transition" | "recent" | "standing";

export type LensObservationKind = "return_extreme" | "drawdown_divergence" | "mayer_divergence";

export type LensDirection = "strongest" | "weakest" | "shallower" | "deeper" | "above" | "below";

export interface LensObservation {
  kind: LensObservationKind;
  /** The side of the claim — part of the state's identity: "weakest" and
   *  "strongest" are different conditions, not one condition flipping. */
  direction: LensDirection;
  /** The one sentence a renderer quotes. Historical, never predictive. */
  sentence: string;
  day: number;
  asOfDate: string;
  nature: "price-derived";
  version: string;
  /** Whether this condition just became true, became true recently, or has
   *  persisted — so a surface can tell a new development from standing
   *  context. The engine classifies; surfaces set publication policy. */
  lifecycle: LensLifecycle;
  /** First day of the contiguous run over which this same condition (kind +
   *  direction) has qualified, up to and including `day`. */
  stateSinceDay: number;
  /** day − stateSinceDay: 0 means it became true at the selected day. */
  stateAgeDays: number;
  /** The current cycle's value for this comparison. */
  currentValue: number;
  /** The equivalent prior-cycle values the claim was judged against. */
  comparators: { cycleId: LensCycleId; value: number }[];
  priorMedian: number;
  /** 1 = strongest/highest among rankedOf cycles; only on rank claims. */
  rank: number | null;
  rankedOf: number | null;
  /** Signed distance behind the claim: relative ratio for return_extreme,
   *  percentage points for drawdown, Mayer units for mayer. */
  difference: number;
  threshold: { name: keyof typeof LENS_THRESHOLDS; value: number };
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};

type Reached = Extract<LensCycleAtDay, { reached: true }>;

/** A qualifying condition at one day — an observation minus its lifecycle. */
type LensCandidate = Omit<LensObservation, "lifecycle" | "stateSinceDay" | "stateAgeDays">;

const stateKey = (c: { kind: LensObservationKind; direction: LensDirection }): string =>
  `${c.kind}:${c.direction}`;

/** Every rule evaluated independently — ALL conditions that qualify at D,
 *  in kind-priority order. Empty on quiet, unreached and invalid days. */
function candidatesAt(day: number): LensCandidate[] {
  const at = lensAtDay(day);
  // Interpretation compares the CURRENT cycle's observed state — a day the
  // current cycle has not reached has no current state to compare.
  const current = at.cycles.find((c) => c.cycleId === 5);
  if (!current || !current.reached) return [];
  const priors = at.cycles.filter((c): c is Reached => c.cycleId !== 5 && c.reached);
  // Rank-of-four language needs all four cycles present at D.
  if (priors.length !== 3) return [];

  const base = {
    day,
    asOfDate: at.asOfDate,
    nature: "price-derived" as const,
    version: LENS_OBSERVATION_VERSION,
  };
  const out: LensCandidate[] = [];

  // 1 · Return-from-halving extreme (rank among the four cycles + margin).
  {
    const priorMults = priors.map((p) => ({ cycleId: p.cycleId, value: p.multiple }));
    const values = priorMults.map((p) => p.value);
    const strongest = current.multiple > Math.max(...values);
    const weakest = current.multiple < Math.min(...values);
    if (strongest || weakest) {
      const nearest = strongest ? Math.max(...values) : Math.min(...values);
      const margin = Math.abs(current.multiple - nearest) / nearest;
      if (margin >= LENS_THRESHOLDS.EXTREME_MARGIN_RATIO) {
        out.push({
          ...base,
          kind: "return_extreme",
          direction: strongest ? "strongest" : "weakest",
          sentence: `The current cycle has the ${strongest ? "strongest" : "weakest"} return from halving of the four cycles at this stage.`,
          currentValue: current.multiple,
          comparators: priorMults,
          priorMedian: median(values),
          rank: strongest ? 1 : 4,
          rankedOf: 4,
          difference: margin,
          threshold: { name: "EXTREME_MARGIN_RATIO", value: LENS_THRESHOLDS.EXTREME_MARGIN_RATIO },
        });
      }
    }
  }

  // 2 · Drawdown divergence vs the prior-cycle median (magnitudes, pp).
  {
    const priorDds = priors.map((p) => ({ cycleId: p.cycleId, value: p.drawdownFromHighPct }));
    const med = median(priorDds.map((p) => Math.abs(p.value)));
    const cur = Math.abs(current.drawdownFromHighPct);
    const diff = cur - med;
    if (Math.abs(diff) >= LENS_THRESHOLDS.DRAWDOWN_DIVERGENCE_PP) {
      out.push({
        ...base,
        kind: "drawdown_divergence",
        direction: diff < 0 ? "shallower" : "deeper",
        sentence: `At this point, the current cycle's drawdown is materially ${diff < 0 ? "shallower" : "deeper"} than the prior-cycle median.`,
        currentValue: current.drawdownFromHighPct,
        comparators: priorDds,
        priorMedian: -med,
        rank: null,
        rankedOf: null,
        difference: diff,
        threshold: { name: "DRAWDOWN_DIVERGENCE_PP", value: LENS_THRESHOLDS.DRAWDOWN_DIVERGENCE_PP },
      });
    }
  }

  // 3 · Mayer divergence vs the prior-cycle median (only when every cycle's
  //     200-day history is genuinely observed).
  {
    if (current.mayer != null && priors.every((p) => p.mayer != null)) {
      const priorMayers = priors.map((p) => ({ cycleId: p.cycleId, value: p.mayer as number }));
      const med = median(priorMayers.map((p) => p.value));
      const diff = current.mayer - med;
      if (Math.abs(diff) >= LENS_THRESHOLDS.MAYER_DIVERGENCE) {
        out.push({
          ...base,
          kind: "mayer_divergence",
          direction: diff < 0 ? "below" : "above",
          sentence: `The current cycle's Mayer Multiple is materially ${diff < 0 ? "below" : "above"} the prior-cycle median at the same stage.`,
          currentValue: current.mayer,
          comparators: priorMayers,
          priorMedian: med,
          rank: null,
          rankedOf: null,
          difference: diff,
          threshold: { name: "MAYER_DIVERGENCE", value: LENS_THRESHOLDS.MAYER_DIVERGENCE },
        });
      }
    }
  }

  return out;
}

// Per-day contiguous-run starts for every state, over the current cycle's
// whole record — computed once from the Lens's own history (clock-free) and
// derived purely from committed data, so it is deterministic and cacheable.
let runStarts: Map<string, number>[] | null = null;

function runStartsUpTo(maxDay: number): Map<string, number>[] {
  if (!runStarts || runStarts.length <= maxDay) {
    const table: Map<string, number>[] = [];
    let prev = new Map<string, number>();
    for (let d = 0; d <= Math.max(maxDay, cycleAnchor().cycleDay); d++) {
      const m = new Map<string, number>();
      for (const c of candidatesAt(d)) {
        const key = stateKey(c);
        // Contiguous with yesterday's run keeps its start; else a new run.
        m.set(key, prev.has(key) ? (prev.get(key) as number) : d);
      }
      table.push(m);
      prev = m;
    }
    runStarts = table;
  }
  return runStarts;
}

const lifecycleOf = (age: number): LensLifecycle =>
  age <= LENS_LIFECYCLE.TRANSITION_MAX_AGE_DAYS ? "transition" : age <= LENS_LIFECYCLE.RECENT_MAX_AGE_DAYS ? "recent" : "standing";

const LIFECYCLE_RANK: Record<LensLifecycle, number> = { transition: 0, recent: 1, standing: 2 };

/** The single most notable historical comparison at day D, or null. Null is
 *  a valid, desirable outcome: no manufactured finding.
 *
 *  Selection hierarchy (deterministic, no scoring):
 *    1 · lifecycle class — transition, then recent, then standing: what just
 *        became true at D outranks what has held for hundreds of days;
 *    2 · kind order inside a class — return_extreme > drawdown_divergence >
 *        mayer_divergence (candidatesAt emits in this order).
 *  Standing context is classified, never suppressed. */
export function lensObservation(day: number): LensObservation | null {
  if (day < 0 || day > cycleAnchor().cycleDay) return null;
  const cands = candidatesAt(day);
  if (cands.length === 0) return null;

  const starts = runStartsUpTo(day)[day];
  const enriched = cands.map((c) => {
    const since = starts.get(stateKey(c)) ?? day;
    const age = day - since;
    return { ...c, stateSinceDay: since, stateAgeDays: age, lifecycle: lifecycleOf(age) };
  });
  // Stable sort on lifecycle class only — candidate order IS the kind order.
  enriched.sort((a, b) => LIFECYCLE_RANK[a.lifecycle] - LIFECYCLE_RANK[b.lifecycle]);
  return enriched[0];
}
