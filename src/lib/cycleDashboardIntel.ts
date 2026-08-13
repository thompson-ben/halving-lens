// Cycle Dashboard intelligence payload (Cycle Dashboard V2, CD3).
//
// A COMPOSITION layer, not an engine: it assembles what the canonical
// engines already say into one serializable payload for /cycle-dashboard,
// and derives NO new market intelligence. Its whole job is selection,
// presentation-level dedupe, cap/count metadata and per-series as-of
// honesty. It defines no thresholds, computes no significance, rewrites
// no Metric Watch claim, and invents no market label — every state word
// below is quoted from the vocabulary that owns it (metric Watch state
// registry, ACCUMULATION_BANDS, sentiment bandFor, the movers' material
// set, the ETF flow streak).
//
// Historical context. Not forecasts.

import {
  marketMovers,
  moversAsOf,
  metricById,
  consideredMovers,
  weekActivity,
  WEEK_ACTIVITY_LABELS,
  type Movement,
  type WeekActivity,
} from "./marketMovers";
import { metricWatch, stateRunFrom, type MetricWatch } from "./metricWatch";
import { watchStateFor } from "./metricWatch/states";
import { etfFlowsRead } from "./etfFlows";
import { fmtUsd } from "./format";

// v2 (V2.1 Phase 1): adds the What Changed? executive summary (canonical
// week-activity classification + considered-population counts).
export const CYCLE_DASHBOARD_INTEL_VERSION = "cycle-dashboard-intel-v2";

// ── State of the Cycle strip ────────────────────────────────────────────────

export interface DashboardStripState {
  id: "accumulation" | "sentiment" | "etf";
  /** Dimension name (page vocabulary, not a market claim). */
  label: string;
  available: boolean;
  /** The canonical state word, verbatim from its owning vocabulary. */
  stateLabel: string | null;
  /** Small factual tail (reading + cadence qualifier), never a claim. */
  detail: string | null;
  /** The numeric reading already printed inside `detail` (banded rows) —
   *  exposed so a renderer can draw a scale of the SAME fact without
   *  re-parsing a string. Presentation metadata, not new intelligence. */
  value: number | null;
  /** The net flow already printed inside `detail` (ETF row only). */
  net: number | null;
  /** Run start for state age, from the Watch's own run computer. */
  sinceDate: string | null;
  sinceIsSeriesStart: boolean;
  /** The series' own latest observation on or before the anchor. */
  asOf: string | null;
  href: string;
  unavailableReason: string | null;
}

/** Accumulation and Sentiment read through the Metric Watch state registry
 *  (the existing binding of series → canonical band vocabulary), so the
 *  strip can never drift from what the Watch itself would call the state. */
function bandedStripState(
  id: "accumulation" | "sentiment",
  moverId: string,
  label: string,
  anchor: string,
  detailFor: (value: number) => string,
): DashboardStripState {
  const metric = metricById(moverId);
  const def = watchStateFor(moverId);
  const base = {
    id,
    label,
    href: metric?.href ?? "/",
    sinceIsSeriesStart: false,
  };
  if (!metric || !def) {
    return { ...base, available: false, stateLabel: null, detail: null, value: null, net: null, sinceDate: null, asOf: null, unavailableReason: "Not tracked in the current registry." };
  }
  const run = stateRunFrom(def, metric.series(), anchor);
  if (!run) {
    return { ...base, available: false, stateLabel: null, detail: null, value: null, net: null, sinceDate: null, asOf: null, unavailableReason: "No observations at this date." };
  }
  return {
    ...base,
    available: true,
    stateLabel: run.current.label,
    detail: detailFor(run.value),
    value: run.value,
    net: null,
    sinceDate: run.sinceDate,
    sinceIsSeriesStart: run.sinceIsSeriesStart,
    asOf: run.asOf,
    unavailableReason: null,
  };
}

/** ETF demand has deliberately NO invented band state — the flow streak is
 *  its only canonical categorical, and the window is trading days, never
 *  calendar days. The ETF read is not anchor-parameterised upstream, so
 *  this row always reflects the latest committed series and carries that
 *  series' own last date as its asOf. */
function etfStripState(): DashboardStripState {
  const metric = metricById("etf_flows");
  const base = { id: "etf" as const, label: "ETF demand", href: metric?.href ?? "/etf", sinceIsSeriesStart: false, sinceDate: null };
  const r = etfFlowsRead();
  if (!r.connected || r.points.length === 0) {
    return { ...base, available: false, stateLabel: null, detail: null, value: null, net: null, asOf: null, unavailableReason: "Flow data is not connected." };
  }
  const s = r.streak;
  const stateLabel =
    s.direction === "flat" || s.length === 0
      ? "Flat on the latest trading day"
      : `${s.length}-day ${s.direction} streak`;
  const d7 = r.windows.d7;
  const detail = `${fmtUsd(d7.net, { compact: true, sign: true })} over ${d7.days} trading days`;
  return {
    ...base,
    available: true,
    stateLabel,
    detail,
    value: null,
    net: d7.net,
    asOf: r.points[r.points.length - 1]?.date ?? null,
    unavailableReason: null,
  };
}

// ── What's Moving rail ──────────────────────────────────────────────────────

export interface WhatsMovingRail {
  /** Material movers in the engine's own order, after the composite
   *  exclusion and the Most Interesting dedupe, capped for scanning. */
  rows: Movement[];
  /** Readings the rail considers (the movers' set minus the composite). */
  analysed: number;
  /** How many of those moved materially, dedupe included. */
  material: number;
  /** Material rows not shown (dedupe + cap) — reachable via the snapshot. */
  overflow: number;
  /** The metric whose movement story the flagship already owns today. */
  dedupedMetricId: string | null;
  /** The engine-count scope sentence printed under the rail. */
  scopeLine: string;
}

/** Rows the rail may show, before dedupe/cap. Material movers only —
 *  the rail never reaches into steady[]; a quiet rail is reported, not
 *  filled. The composite exclusion now lives in the engine's
 *  consideredMovers filter (V2.1 Phase 1) — the same population feeds the
 *  What Changed summary above, so the two can never disagree. */
const RAIL_CAP = 5;

function buildRail(
  considered: ReturnType<typeof consideredMovers>,
  watch: MetricWatch,
): WhatsMovingRail {
  const analysed = considered.analysed;
  const material = considered.movements;

  // Presentation dedupe (CD3 rule): when Most Interesting is itself a
  // movement or gap event, the flagship already owns that metric's
  // movement story today — repeating it as the first rail row says the
  // same thing twice. Fresh regime TRANSITIONS are not deduped: the
  // flagship's claim there is categorical ("entered X") while the rail
  // row reports magnitude — different facts, both worth having.
  const ev = watch.mostInteresting?.evidence;
  const dedupedMetricId = ev && (ev.kind === "movement" || ev.kind === "gap_shift") ? ev.metricId : null;
  const eligible = material.filter((m) => m.metricId !== dedupedMetricId);

  const rows = eligible.slice(0, RAIL_CAP);
  const overflow = material.length - rows.length;

  const scopeLine =
    material.length === 0
      ? `${analysed} readings analysed · none moved materially over the last 7 days. All held within their own ordinary range.`
      : rows.length === 0
        ? `${analysed} readings analysed · every material movement is covered above.`
        : `${analysed} readings analysed · ${material.length} moved materially over the last 7 days.`;

  return { rows, analysed, material: material.length, overflow, dedupedMetricId, scopeLine };
}

// ── What Changed? executive summary (V2.1 Phase 1) ──────────────────────────

export interface ChangeSummary {
  /** The canonical activity classification and its member-facing label —
   *  both quoted from the engine's vocabulary, never minted here. */
  activity: WeekActivity;
  activityLabel: string;
  /** Counts over the SAME considered population as the rail — printed
   *  counts and visible rows can never disagree. */
  analysed: number;
  material: number;
  /** Material rows whose movement is unusual/exceptional AND whose rarity
   *  claim is engine-permitted — the summary never claims rarity where a
   *  renderer would refuse the chip. */
  unusual: number;
  steady: number;
  /** One deterministic counts sentence, templated from the numbers above. */
  countsLine: string;
  /** Unusual/exceptional material rows, engine order — "worth looking at". */
  needsAttention: Movement[];
  /** Remaining material rows, engine order. */
  alsoMoving: Movement[];
}

/** A row counts as unusual only when the engine both bands it so AND permits
 *  the rarity claim — same honesty gate as every band chip renderer. */
const isUnusualRow = (m: Movement) =>
  m.rarityState === "available" && (m.band === "unusual" || m.band === "exceptional");

function buildChangeSummary(considered: ReturnType<typeof consideredMovers>): ChangeSummary {
  const material = considered.movements;
  const analysed = considered.analysed;
  const needsAttention = material.filter(isUnusualRow);
  const alsoMoving = material.filter((m) => !isUnusualRow(m));
  const steady = analysed - material.length;
  const activity = weekActivity([...material, ...considered.steady].map((m) => m.significance));

  const countsLine =
    material.length === 0
      ? `${analysed} readings analysed · none moved materially over the last 7 days.`
      : `${analysed} readings analysed · ${material.length} moved materially · ${steady} stayed within their own ordinary range.`;

  return {
    activity,
    activityLabel: WEEK_ACTIVITY_LABELS[activity],
    analysed,
    material: material.length,
    unusual: needsAttention.length,
    steady,
    countsLine,
    needsAttention,
    alsoMoving,
  };
}

// ── quiet-day support line ──────────────────────────────────────────────────

/** The static line beneath the engine-owned quiet sentence. The majority
 *  claim is only made when the movers' own counts support it; otherwise a
 *  general product-trust line that makes no market claim at all. */
function quietSupportLine(rail: WhatsMovingRail): string {
  const steady = rail.analysed - rail.material;
  return steady * 2 > rail.analysed
    ? "Most readings moved within their own ordinary range over the last 7 days."
    : "Quiet days are shown as quiet — HalvingLens does not manufacture a signal.";
}

// ── the payload ─────────────────────────────────────────────────────────────

export interface CycleDashboardIntel {
  /** The movers' committed anchor — the whole payload is clock-free. */
  asOf: string;
  /** The Metric Watch result, passed through by identity — its claims,
   *  quiet line and as-of semantics are the engine's alone. */
  watch: MetricWatch;
  watchQuietSupport: string;
  /** The What Changed? executive summary (V2.1 Phase 1). */
  summary: ChangeSummary;
  moving: WhatsMovingRail;
  strip: DashboardStripState[];
  version: string;
}

const cache = new Map<string, CycleDashboardIntel>();

export function cycleDashboardIntel(anchor?: string): CycleDashboardIntel {
  const asOf = anchor ?? moversAsOf();
  const hit = cache.get(asOf);
  if (hit) return hit;

  const watch = metricWatch(asOf);
  const considered = consideredMovers(marketMovers(7, asOf));
  const summary = buildChangeSummary(considered);
  const moving = buildRail(considered, watch);
  const strip: DashboardStripState[] = [
    bandedStripState("accumulation", "accumulation", "Accumulation", asOf, (v) => `${Math.round(v)}/100 · weekly`),
    bandedStripState("sentiment", "fear_greed", "Sentiment", asOf, (v) => `${Math.round(v)}/100`),
    etfStripState(),
  ];

  const out: CycleDashboardIntel = {
    asOf,
    watch,
    watchQuietSupport: quietSupportLine(moving),
    summary,
    moving,
    strip,
    version: CYCLE_DASHBOARD_INTEL_VERSION,
  };
  cache.set(asOf, out);
  return out;
}
