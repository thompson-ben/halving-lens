// The Metric Watch engine (Cycle Dashboard V2, MW1).
//
// Two independent, daily, nullable intelligence outputs over the existing
// evidence engines — never a new statistics model:
//
//   MOST INTERESTING  "what actually did something noteworthy?"
//   ONE TO WATCH      "what is near a historically meaningful state AND
//                      moving toward it?"  (proximity, never prediction)
//
// Foundations, reused not re-implemented:
//   · Market Movers own movement, significance, rarity floors, per-metric
//     asOf and the describe layer (the significance vocabulary is theirs);
//   · reference-gap engine owns the market-vs-reference relationship;
//   · metrics.ts / sentiment / accumulation own every state threshold
//     (mapped by states.ts — no number is re-declared);
//   · stateLifecycle.ts owns the shared transition/recent/standing
//     vocabulary; this engine computes its OWN contiguous-state runs over
//     each metric's committed series (exact, per-observation — not the
//     week-quantised streak the movers' context line uses).
//
// Honesty rules:
//   · A movement-rarity claim requires the movers' observation floor
//     (rarityClaimAllowed) — a young series can never be "unusual".
//   · A state run that is still open at the series' first observation says
//     "at least" — never an invented start date.
//   · Every claim is dated to ITS metric's asOf; the quiet line only says
//     "today" when every watched series is current to the global anchor.
//   · Either output may be null. Both may be null. A quiet day is a
//     finding — nothing is manufactured to fill a slot.
//
// Deliberately presentation-free and clock-free. Renderers (Dashboard,
// social card, captions, admin — CD3/MW2) quote the describe layer and
// never recompute a claim.

import {
  marketMovers,
  moversAsOf,
  metricById,
  MOVER_METRICS,
  CROSSING_SIGNIFICANCE_FLOOR,
  bandFor,
  type Movement,
  type MoverPeriod,
  type SignificanceBand,
} from "../marketMovers";
import { valueOn, dayNum, type Point } from "../marketMovers/distribution";
import {
  REFERENCE_IDS,
  gapReadingFrom,
  LEVEL_PP,
  type ReferenceId,
  type GapReading,
} from "../referenceGaps";
import type { Lifecycle } from "../stateLifecycle";
import { WATCH_STATES, watchStateFor, type WatchStateDef, type WatchStateInfo } from "./states";
import { describeMostInteresting, describeOneToWatch, quietLineFor } from "./describe";

export const METRIC_WATCH_VERSION = "metric-watch-v1";

export const WATCH_THRESHOLDS = {
  /** A state transition is only NEWS if it ended a state that had actually
   *  stood: the prior contiguous run must have lasted at least this many
   *  days (the shared "recent" window — a month of standing gives the
   *  change somewhere to change FROM). Without this, daily oscillators
   *  that wobble across a boundary (SOPR around 1.0, sentiment around its
   *  cutoffs) would report a "transition" most weeks — measured: 297 of
   *  365 backtest days produced a band transition ungated; the gate cuts
   *  churn without touching genuine regime changes. */
  TRANSITION_MIN_PRIOR_DAYS: 30,
  /** One to Watch proximity: the value must sit within this fraction of
   *  the relevant band's width from a FINITE boundary. Scale-free, so one
   *  gate serves band ladders whose absolute scales differ by orders of
   *  magnitude (SOPR ~0.05-wide bands vs RHODL ~10,000-wide). 0.05 = the
   *  outer twentieth — genuinely at the doorstep, the same "last stretch"
   *  idea as the talking-points near-extreme rule (within 3% of a yearly
   *  extreme). Backtested over 365 days of committed history: fires on
   *  25% of days (46 distinct watches/year); at 0.2 it fired on 69% of
   *  days, which is a permanent fixture, not a watch. */
  PROXIMITY_BAND_FRACTION: 0.05,
  /** One to Watch gap-to-zero proximity, in percentage points of the
   *  market-vs-reference gap. Measured over each gap's full history, the
   *  median |7-day| gap change is ≈5.5pp for ma200 and the realised price
   *  — so 5pp is about ONE ordinary week of movement from the crossing:
   *  near by the gaps' own behaviour, not by decree. (The mining-cost gap
   *  is excluded from approaches entirely: its median weekly wobble is
   *  ≈14.5pp, so being "within 5pp" of that model is noise, not news.) */
  GAP_NEAR_PP: 5,
} as const;

/** References whose gap may NEVER produce an approach claim, with the
 *  member-facing reason — the FRP excluded-periods pattern. */
export const WATCH_EXCLUDED_GAP_APPROACHES: Partial<Record<ReferenceId, string>> = {
  mining_cost:
    "Approach claims for the estimated mining cost are intentionally omitted — the model's weekly movement is larger than any honest definition of 'near'.",
};

// ── evidence identity (stable, machine-readable — future Pro mapping) ──────

export type WatchEvidenceKind =
  | "band_transition"
  | "reference_transition"
  | "movement"
  | "gap_shift"
  | "approach";

export interface WatchEvidence {
  kind: WatchEvidenceKind;
  metricId: string;
  period: MoverPeriod | null;
  /** Current state key (band ladders / above-below), when stateful. */
  stateKey: string | null;
  fromStateKey: string | null;
  /** One to Watch: the state being approached and its numeric boundary. */
  boundaryKey: string | null;
  boundaryValue: number | null;
  direction: "up" | "down" | null;
  referenceId: ReferenceId | null;
  threshold: { name: string; value: number };
  /** Stable identity, e.g. "band_transition:mvrv_z:accumulation->neutral",
   *  "movement:etf_flows:7d:down", "approach:puell:neutral". A future
   *  alert system distinguishes conditions by this key, never by prose. */
  eventKey: string;
}

// ── the output contract ─────────────────────────────────────────────────────

export interface WatchLifecycle {
  state: Lifecycle;
  sinceDate: string;
  ageDays: number;
  /** The run is still open at the series' first observation — the honest
   *  claim is "at least this long", never an exact start. */
  sinceIsSeriesStart: boolean;
}

export interface MetricWatchCandidate {
  mode: "most_interesting" | "one_to_watch";
  metricId: string;
  label: string;
  href: string;
  nature: "observed" | "derived" | "estimated";
  currentValue: number;
  /** Pre-rendered by the describe layer — renderers never re-format. */
  currentLabel: string;
  comparisonWindow: MoverPeriod | null;
  movementLabel: string | null;
  significance: {
    value: number;
    band: SignificanceBand;
    rarityState: "available" | "maturing" | "unavailable";
    rarityPercentile: number | null;
    observations: number;
  } | null;
  lifecycle: WatchLifecycle | null;
  headline: string;
  whyNoteworthy: string;
  historicalContext: string;
  cycleContext: string | null;
  asOf: string;
  version: string;
  evidence: WatchEvidence;
}

export interface MetricWatch {
  asOf: string;
  version: string;
  mostInteresting: MetricWatchCandidate | null;
  oneToWatch: MetricWatchCandidate | null;
  /** Engine-owned quiet sentence when BOTH outputs are null; wording
   *  depends on whether every watched series is current to `asOf`. */
  quietLine: string | null;
}

// ── contiguous state runs (this engine's own run computer) ─────────────────

export interface StateRun {
  def: WatchStateDef;
  current: WatchStateInfo;
  value: number;
  asOf: string;
  sinceDate: string;
  ageDays: number;
  sinceIsSeriesStart: boolean;
  previous: WatchStateInfo | null;
  /** Calendar span of the run immediately BEFORE this one (at least this
   *  long when that run was itself open at the series start); null when
   *  the current run reaches the series start. Anti-churn evidence: a
   *  transition is news only when this stood ≥ TRANSITION_MIN_PRIOR_DAYS. */
  previousRunDays: number | null;
}

/** The contiguous run of the CURRENT state, walked per observation back
 *  from the metric's own anchor. Exact dates, no week quantisation. */
export function stateRunFrom(def: WatchStateDef, series: readonly Point[], anchorIso: string): StateRun | null {
  if (series.length === 0) return null;
  let idx = -1;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].date <= anchorIso) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return null;
  const value = series[idx].value;
  const current = def.stateOf(value);
  let start = idx;
  while (start > 0 && def.stateOf(series[start - 1].value).key === current.key) start--;
  const sinceIsSeriesStart = start === 0;
  const previous = sinceIsSeriesStart ? null : def.stateOf(series[start - 1].value);
  let previousRunDays: number | null = null;
  if (!sinceIsSeriesStart) {
    let prevStart = start - 1;
    const prevKey = previous!.key;
    while (prevStart > 0 && def.stateOf(series[prevStart - 1].value).key === prevKey) prevStart--;
    previousRunDays = dayNum(series[start - 1].date) - dayNum(series[prevStart].date);
  }
  const sinceDate = series[start].date;
  return {
    def,
    current,
    value,
    asOf: series[idx].date,
    sinceDate,
    ageDays: dayNum(series[idx].date) - dayNum(sinceDate),
    sinceIsSeriesStart,
    previous,
    previousRunDays,
  };
}

// Reference side-of-market runs share the machinery: the "series" is the
// signed gap, the "state" is which side of the reference the market sits.
const GAP_SIDE: WatchStateDef = {
  moverId: "price",
  thresholdSource: "referenceGaps.ts · sign of the gap",
  cadence: "daily",
  stateOf: (v) => (v >= 0 ? { key: "above", label: "above" } : { key: "below", label: "below" }),
  boundariesFor: () => ({ lower: null, upper: null }),
  bandWidth: () => null,
};

function gapPoints(refId: ReferenceId): Point[] {
  const market = metricById("price")!.series();
  const ref = metricById(refId)!.series();
  const out: Point[] = [];
  for (const p of ref) {
    if (!Number.isFinite(p.value) || p.value <= 0) continue;
    const m = valueOn(market, p.date);
    if (!m || m.date !== p.date || m.value <= 0) continue;
    out.push({ date: p.date, value: (m.value / p.value - 1) * 100 });
  }
  return out;
}

function gapReadingAt(refId: ReferenceId, period: MoverPeriod, anchor: string): GapReading | null {
  const market = metricById("price")!.series();
  const m = metricById(refId)!;
  const g = gapReadingFrom(market, m.series(), period, { referenceId: refId, label: m.label, nature: m.nature }, anchor);
  return g.available ? g : null;
}

// ── internal candidate assembly ─────────────────────────────────────────────

interface RawCandidate {
  kind: WatchEvidenceKind;
  metricId: string;
  isTransition: boolean;
  significance: number;
  band: SignificanceBand;
  rarityState: "available" | "maturing" | "unavailable";
  rarityPercentile: number | null;
  observations: number;
  period: MoverPeriod | null;
  movement: Movement | null;
  gap: GapReading | null;
  run: StateRun | null;
  registryOrder: number;
  evidence: WatchEvidence;
}

const registryOrder = (metricId: string): number => {
  const i = MOVER_METRICS.findIndex((m) => m.id === metricId);
  return i < 0 ? MOVER_METRICS.length : i;
};

function movementByMetric(all: { movements: Movement[]; steady: Movement[] }): Map<string, Movement> {
  const m = new Map<string, Movement>();
  for (const x of [...all.movements, ...all.steady]) m.set(x.metricId, x);
  return m;
}

/** Every qualifying Most Interesting candidate at the anchor. Exported for
 *  tests and the historical-frequency probes; the selection is separate. */
export function mostInterestingCandidates(anchor: string): RawCandidate[] {
  const movers7 = marketMovers(7, anchor);
  const movers1 = marketMovers(1, anchor);
  const by7 = movementByMetric(movers7);
  const out: RawCandidate[] = [];

  // a · band-state transitions — the run computer over every watch state.
  for (const def of WATCH_STATES) {
    const metric = metricById(def.moverId);
    if (!metric) continue;
    const run = stateRunFrom(def, metric.series(), anchor);
    if (!run || run.previous == null) continue; // unknown prior state = no claim
    if (run.ageDays > 7) continue; // transitions are this week's news
    if ((run.previousRunDays ?? 0) < WATCH_THRESHOLDS.TRANSITION_MIN_PRIOR_DAYS) continue; // churn, not news
    const m7 = by7.get(def.moverId) ?? null;
    // A categorical transition floors at the movers' crossing floor — the
    // same one rule, never an addition.
    const base = m7?.significance ?? 50;
    const significance = Math.max(base, CROSSING_SIGNIFICANCE_FLOOR);
    out.push({
      kind: "band_transition",
      metricId: def.moverId,
      isTransition: true,
      significance,
      band: bandFor(significance),
      rarityState: m7?.rarityState ?? "unavailable",
      rarityPercentile: m7?.rarityPercentile ?? null,
      observations: m7?.observations ?? 0,
      period: 7,
      movement: m7,
      gap: null,
      run,
      registryOrder: registryOrder(def.moverId),
      evidence: {
        kind: "band_transition",
        metricId: def.moverId,
        period: 7,
        stateKey: run.current.key,
        fromStateKey: run.previous.key,
        boundaryKey: null,
        boundaryValue: null,
        direction: null,
        referenceId: null,
        threshold: { name: "CROSSING_SIGNIFICANCE_FLOOR", value: CROSSING_SIGNIFICANCE_FLOOR },
        eventKey: `band_transition:${def.moverId}:${run.previous.key}->${run.current.key}`,
      },
    });
  }

  // b · reference-side transitions — the market crossing a reference price.
  for (const refId of REFERENCE_IDS) {
    const run = stateRunFrom(GAP_SIDE, gapPoints(refId), anchor);
    if (!run || run.previous == null || run.ageDays > 7) continue;
    if ((run.previousRunDays ?? 0) < WATCH_THRESHOLDS.TRANSITION_MIN_PRIOR_DAYS) continue; // churn, not news
    const m7 = by7.get("price") ?? null;
    const base = m7?.significance ?? 50;
    const significance = Math.max(base, CROSSING_SIGNIFICANCE_FLOOR);
    out.push({
      kind: "reference_transition",
      metricId: "price",
      isTransition: true,
      significance,
      band: bandFor(significance),
      rarityState: m7?.rarityState ?? "unavailable",
      rarityPercentile: m7?.rarityPercentile ?? null,
      observations: m7?.observations ?? 0,
      period: 7,
      movement: m7,
      gap: gapReadingAt(refId, 7, anchor),
      run,
      registryOrder: registryOrder(refId),
      evidence: {
        kind: "reference_transition",
        metricId: "price",
        period: 7,
        stateKey: run.current.key,
        fromStateKey: run.previous.key,
        boundaryKey: null,
        boundaryValue: null,
        direction: run.current.key === "above" ? "up" : "down",
        referenceId: refId,
        threshold: { name: "CROSSING_SIGNIFICANCE_FLOOR", value: CROSSING_SIGNIFICANCE_FLOOR },
        eventKey: `reference_transition:price:${refId}:${run.previous.key}->${run.current.key}`,
      },
    });
  }

  // c · extreme movements — a rarity claim, so the observation floor is a
  //     hard gate (a young series can never be "unusual").
  const seen = new Set(out.map((c) => c.metricId));
  const movementCandidate = (m: Movement, period: MoverPeriod): RawCandidate => ({
    kind: "movement",
    metricId: m.metricId,
    isTransition: false,
    significance: m.significance,
    band: m.band,
    rarityState: m.rarityState,
    rarityPercentile: m.rarityPercentile,
    observations: m.observations,
    period,
    movement: m,
    gap: null,
    run: (() => {
      const def = watchStateFor(m.metricId);
      return def ? stateRunFrom(def, metricById(m.metricId)!.series(), anchor) : null;
    })(),
    registryOrder: registryOrder(m.metricId),
    evidence: {
      kind: "movement",
      metricId: m.metricId,
      period,
      stateKey: null,
      fromStateKey: null,
      boundaryKey: null,
      boundaryValue: null,
      direction: m.direction === "flat" ? null : m.direction,
      referenceId: null,
      threshold: { name: "UNUSUAL_SIGNIFICANCE", value: 80 },
      eventKey: `movement:${m.metricId}:${period}d:${m.direction}`,
    },
  });
  const best = new Map<string, RawCandidate>();
  for (const [movers, period] of [
    [movers7, 7],
    [movers1, 1],
  ] as const) {
    for (const m of movers.movements) {
      if (m.metricId === "market_health") continue; // excluded — see states.ts
      if (seen.has(m.metricId)) continue; // its transition already speaks
      if (!m.rarityClaimAllowed || m.significance < 80 || m.crossing) continue;
      const cand = movementCandidate(m, period);
      const prev = best.get(m.metricId);
      if (!prev || cand.significance > prev.significance) best.set(m.metricId, cand);
    }
  }
  out.push(...best.values());

  // d · reference-gap shifts — the gap engine's own adaptive rarity, only
  //     at the unusual/exceptional tiers.
  for (const refId of REFERENCE_IDS) {
    if (out.some((c) => c.kind === "reference_transition" && c.evidence.referenceId === refId)) continue;
    const g = gapReadingAt(refId, 7, anchor);
    if (!g || g.rarityState !== "available" || g.rarityPercentile == null) continue;
    if (g.rarityPercentile < 80) continue;
    out.push({
      kind: "gap_shift",
      metricId: refId,
      isTransition: false,
      significance: g.rarityPercentile,
      band: bandFor(g.rarityPercentile),
      rarityState: g.rarityState,
      rarityPercentile: g.rarityPercentile,
      observations: g.observations,
      period: 7,
      movement: null,
      gap: g,
      run: null,
      registryOrder: registryOrder(refId),
      evidence: {
        kind: "gap_shift",
        metricId: refId,
        period: 7,
        stateKey: null,
        fromStateKey: null,
        boundaryKey: null,
        boundaryValue: null,
        direction: g.changePp > 0 ? "up" : "down",
        referenceId: refId,
        threshold: { name: "UNUSUAL_SIGNIFICANCE", value: 80 },
        eventKey: `gap_shift:${refId}:7d:${g.changePp > 0 ? "up" : "down"}`,
      },
    });
  }

  return out;
}

// The final hierarchy (MW1 review refinement 1): newness matters but never
// automatically beats materiality — significance tiers interleave with
// transition freshness. Within a tier: significance, then rarity, then
// registry order. Nothing below "unusual" (80) ever qualifies; movements
// at 60–79 belong to the What's-Moving rail (CD3), not Metric Watch.
const tierOf = (c: RawCandidate): number =>
  c.isTransition ? (c.significance >= 95 ? 0 : 2) : c.significance >= 95 ? 1 : 3;

export function selectMostInteresting(anchor: string): RawCandidate | null {
  const cands = mostInterestingCandidates(anchor);
  if (cands.length === 0) return null;
  cands.sort(
    (a, b) =>
      tierOf(a) - tierOf(b) ||
      b.significance - a.significance ||
      (b.rarityPercentile ?? -1) - (a.rarityPercentile ?? -1) ||
      a.registryOrder - b.registryOrder,
  );
  return cands[0];
}

// ── One to Watch ────────────────────────────────────────────────────────────

export interface ApproachCandidate {
  def: WatchStateDef;
  run: StateRun;
  boundaryValue: number;
  targetKey: string;
  targetLabel: string;
  direction: "up" | "down";
  /** Fraction of the band's width remaining to the boundary (0..0.2]. */
  fractionRemaining: number;
  toward7: boolean;
  toward30: boolean;
  registryOrder: number;
  /** Gap approaches carry their reading instead of a band geometry. */
  gap: GapReading | null;
  referenceId: ReferenceId | null;
}

/** All qualifying approaches at the anchor under the SHIPPED rule:
 *  7-day movement toward the boundary is REQUIRED; 30-day agreement is
 *  CONFIRMATION that ranks a candidate above unconfirmed ones. Chosen
 *  empirically: with proximity at 0.05 the two rules fire almost
 *  identically (25% vs 23% of backtest days), so tight proximity does
 *  the filtering and the 30-day window can stay a confirmation rather
 *  than a gate — a genuinely NEW turn can surface in its first week,
 *  which is exactly when watching begins to matter. */
export function oneToWatchCandidates(anchor: string): ApproachCandidate[] {
  const out: ApproachCandidate[] = [];

  for (const def of WATCH_STATES) {
    const metric = metricById(def.moverId);
    if (!metric) continue;
    const series = metric.series();
    const run = stateRunFrom(def, series, anchor);
    if (!run) continue;
    // A metric that changed state this week is Most Interesting's story —
    // let it settle before calling it "approaching" anything.
    if (run.ageDays <= 7 && run.previous != null) continue;
    const bounds = def.boundariesFor(run.value);
    for (const b of [bounds.lower, bounds.upper]) {
      if (!b) continue;
      const dist = Math.abs(run.value - b.value);
      const scale =
        def.bandWidth(run.value) ??
        def.bandWidth(b.entersOn === "up" ? b.value + Math.abs(b.value) * 1e-9 + 1e-9 : b.value - Math.abs(b.value) * 1e-9 - 1e-9);
      if (scale == null || scale <= 0) continue;
      const frac = dist / scale;
      if (frac > WATCH_THRESHOLDS.PROXIMITY_BAND_FRACTION) continue;
      const v7 = valueOn(series, isoAt(dayNum(run.asOf) - 7));
      const v30 = valueOn(series, isoAt(dayNum(run.asOf) - 30));
      if (!v7 || v7.date === run.asOf) continue;
      const toward7 = Math.abs(run.value - b.value) < Math.abs(v7.value - b.value);
      if (!toward7) continue;
      const toward30 = v30 != null && v30.date !== run.asOf ? Math.abs(run.value - b.value) < Math.abs(v30.value - b.value) : false;
      out.push({
        def,
        run,
        boundaryValue: b.value,
        targetKey: b.targetKey,
        targetLabel: b.targetLabel,
        direction: b.entersOn,
        fractionRemaining: frac,
        toward7,
        toward30,
        registryOrder: registryOrder(def.moverId),
        gap: null,
        referenceId: null,
      });
    }
  }

  // Gap-to-zero approaches: near the crossing and closing.
  for (const refId of REFERENCE_IDS) {
    if (WATCH_EXCLUDED_GAP_APPROACHES[refId]) continue;
    const g7 = gapReadingAt(refId, 7, anchor);
    if (!g7) continue;
    const now = Math.abs(g7.gapNow);
    if (now < LEVEL_PP || now > WATCH_THRESHOLDS.GAP_NEAR_PP) continue;
    if (now >= Math.abs(g7.gapThen)) continue; // must be closing over 7d
    const g30 = gapReadingAt(refId, 30, anchor);
    const toward30 = g30 != null && Math.abs(g30.gapNow) < Math.abs(g30.gapThen);
    const run = stateRunFrom(GAP_SIDE, gapPoints(refId), anchor);
    if (!run || (run.ageDays <= 7 && run.previous != null)) continue; // just crossed = news, not a watch
    out.push({
      def: GAP_SIDE,
      run,
      boundaryValue: 0,
      targetKey: run.current.key === "above" ? "below" : "above",
      targetLabel: run.current.key === "above" ? "below" : "above",
      direction: run.current.key === "above" ? "down" : "up",
      fractionRemaining: now / WATCH_THRESHOLDS.GAP_NEAR_PP,
      toward7: true,
      toward30,
      registryOrder: registryOrder(refId),
      gap: g7,
      referenceId: refId,
    });
  }

  return out;
}

export function selectOneToWatch(anchor: string): ApproachCandidate | null {
  const cands = oneToWatchCandidates(anchor);
  if (cands.length === 0) return null;
  cands.sort(
    (a, b) =>
      Number(b.toward30) - Number(a.toward30) ||
      a.fractionRemaining - b.fractionRemaining ||
      a.registryOrder - b.registryOrder,
  );
  return cands[0];
}

const isoAt = (n: number): string => new Date(n * 86_400_000).toISOString().slice(0, 10);

// ── the engine entry point ──────────────────────────────────────────────────

let cache: Map<string, MetricWatch> | null = null;

export function metricWatch(anchor?: string): MetricWatch {
  const asOf = anchor ?? moversAsOf();
  cache ??= new Map();
  const hit = cache.get(asOf);
  if (hit) return hit;

  const mi = selectMostInteresting(asOf);
  const otw = selectOneToWatch(asOf);

  // "today" is honest only when every watched series both EXISTS at the
  // anchor and is current to it; otherwise the quiet claim is scoped to
  // the readings actually available.
  const allCurrent = WATCH_STATES.every((def) => {
    const s = metricById(def.moverId)?.series() ?? [];
    return s.length > 0 && s[0].date <= asOf && s[s.length - 1].date >= asOf;
  });

  const out: MetricWatch = {
    asOf,
    version: METRIC_WATCH_VERSION,
    mostInteresting: mi ? describeMostInteresting(mi, asOf) : null,
    oneToWatch: otw ? describeOneToWatch(otw, asOf) : null,
    quietLine: mi || otw ? null : quietLineFor(allCurrent),
  };
  cache.set(asOf, out);
  return out;
}

export type { RawCandidate };
