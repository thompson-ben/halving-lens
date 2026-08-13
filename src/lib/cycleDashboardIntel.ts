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
// v3 (V2.1 Phase 2): the What's Moving rail (cap 5, flagship dedupe) is
// retired in favour of the Market Board — every considered reading, ranked,
// with periods 1/7/30 served by marketBoard().
export const CYCLE_DASHBOARD_INTEL_VERSION = "cycle-dashboard-intel-v3";

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

// ── Market Board (V2.1 Phase 2) ─────────────────────────────────────────────
//
// The whole considered market in one ranked list — the What's Moving rail's
// successor. The rail capped at five material rows and hid the steady set;
// the board shows every considered reading precisely because "14 ordinary,
// 1 interesting" is itself the intelligence. No cap, no dedupe against the
// Watch flagship (the board is the full market, not a movers digest), and
// the ordering IS the engine's own ranking: significance descending, rarity
// tie-break, registry order — stated on the page, never re-sorted here.

export interface MarketBoard {
  period: 1 | 7 | 30;
  /** The movers' committed anchor for this period read. */
  asOf: string;
  /** Every considered reading — material first, then steady — in the
   *  engine's own ranked order. Movement objects by identity. */
  rows: Movement[];
  /** How many of rows are material (the board's emphasis split). */
  materialCount: number;
  analysed: number;
  /** Readings with no observable movement at this period, with the
   *  engine's own reason sentence (weekly series at 1 day, etc.). */
  unavailable: Array<{ metricId: string; label: string; reason: string }>;
  /** The deterministic ordering, stated for the reader. */
  orderNote: string;
}

const boardCache = new Map<string, MarketBoard>();

/** The board for a period — separate from the 7-day summary payload so the
 *  page can serve ?period=1|30 without recomputing the week verdict (the
 *  What Changed? summary always describes the 7-day week). */
export function marketBoard(period: 1 | 7 | 30 = 7, anchor?: string): MarketBoard {
  const asOf = anchor ?? moversAsOf();
  const key = `${period}@${asOf}`;
  const hit = boardCache.get(key);
  if (hit) return hit;

  const r = marketMovers(period, asOf);
  const considered = consideredMovers(r);
  const out: MarketBoard = {
    period,
    asOf,
    rows: [...considered.movements, ...considered.steady],
    materialCount: considered.movements.length,
    analysed: considered.analysed,
    unavailable: r.unavailable,
    orderNote: "Ranked by the size of each move against that reading's own history.",
  };
  boardCache.set(key, out);
  return out;
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
function quietSupportLine(summary: ChangeSummary): string {
  return summary.steady * 2 > summary.analysed
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
  /** The 7-day Market Board (V2.1 Phase 2) — the whole considered market.
   *  Other periods are served by marketBoard(period) directly. */
  board: MarketBoard;
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
  const strip: DashboardStripState[] = [
    bandedStripState("accumulation", "accumulation", "Accumulation", asOf, (v) => `${Math.round(v)}/100 · weekly`),
    bandedStripState("sentiment", "fear_greed", "Sentiment", asOf, (v) => `${Math.round(v)}/100`),
    etfStripState(),
  ];

  const out: CycleDashboardIntel = {
    asOf,
    watch,
    watchQuietSupport: quietSupportLine(summary),
    summary,
    board: marketBoard(7, asOf),
    strip,
    version: CYCLE_DASHBOARD_INTEL_VERSION,
  };
  cache.set(asOf, out);
  return out;
}
