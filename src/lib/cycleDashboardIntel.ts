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
  type Movement,
} from "./marketMovers";
import { metricWatch, stateRunFrom, type MetricWatch } from "./metricWatch";
import { watchStateFor } from "./metricWatch/states";
import { etfFlowsRead } from "./etfFlows";
import { fmtUsd } from "./format";

export const CYCLE_DASHBOARD_INTEL_VERSION = "cycle-dashboard-intel-v1";

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
    return { ...base, available: false, stateLabel: null, detail: null, sinceDate: null, asOf: null, unavailableReason: "Not tracked in the current registry." };
  }
  const run = stateRunFrom(def, metric.series(), anchor);
  if (!run) {
    return { ...base, available: false, stateLabel: null, detail: null, sinceDate: null, asOf: null, unavailableReason: "No observations at this date." };
  }
  return {
    ...base,
    available: true,
    stateLabel: run.current.label,
    detail: detailFor(run.value),
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
    return { ...base, available: false, stateLabel: null, detail: null, asOf: null, unavailableReason: "Flow data is not connected." };
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
 *  filled. market_health is excluded on the same recorded grounds as its
 *  Metric Watch exclusion: it is a composite of readings shown elsewhere
 *  on this page (the header score, the strip's sentiment and ETF rows),
 *  and a composite ranking above its own inputs double-counts them. */
const RAIL_CAP = 5;
const RAIL_EXCLUDED = new Set(["market_health"]);

function buildRail(anchor: string, watch: MetricWatch): WhatsMovingRail {
  const r = marketMovers(7, anchor);
  const considered = (m: Movement) => !RAIL_EXCLUDED.has(m.metricId);
  const analysed = [...r.movements, ...r.steady].filter(considered).length;
  const material = r.movements.filter(considered);

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
  const moving = buildRail(asOf, watch);
  const strip: DashboardStripState[] = [
    bandedStripState("accumulation", "accumulation", "Accumulation", asOf, (v) => `${Math.round(v)}/100 · weekly`),
    bandedStripState("sentiment", "fear_greed", "Sentiment", asOf, (v) => `${Math.round(v)}/100`),
    etfStripState(),
  ];

  const out: CycleDashboardIntel = {
    asOf,
    watch,
    watchQuietSupport: quietSupportLine(moving),
    moving,
    strip,
    version: CYCLE_DASHBOARD_INTEL_VERSION,
  };
  cache.set(asOf, out);
  return out;
}
