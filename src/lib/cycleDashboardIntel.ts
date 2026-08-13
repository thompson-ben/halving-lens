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
  formatValue,
  type Movement,
  type WeekActivity,
} from "./marketMovers";
import { metricWatch, stateRunFrom, type MetricWatch } from "./metricWatch";
import { watchStateFor } from "./metricWatch/states";
import { etfFlowsRead, windowBreakdown, type FlowBreakdown } from "./etfFlows";
import { fmtUsd } from "./format";

// v2 (V2.1 Phase 1): adds the What Changed? executive summary (canonical
// week-activity classification + considered-population counts).
// v3 (V2.1 Phase 2): the What's Moving rail (cap 5, flagship dedupe) is
// retired in favour of the Market Board — every considered reading, ranked,
// with periods 1/7/30 served by marketBoard().
// v4 (V2.1 Phase 3): State-strip cells gain a deterministic change line and
// the ETF intelligence card joins the payload (NOW → CHANGE → COMPOSITION →
// CONCENTRATION → CONTEXT, all quoted from the flows engine's numbers).
export const CYCLE_DASHBOARD_INTEL_VERSION = "cycle-dashboard-intel-v4";

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
  /** NOW + WHAT CHANGED (V2.1 Phase 3): one deterministic movement line —
   *  "7D: 27 → 24" for banded rows (the movers' own previous/current,
   *  their own formatter), "previous 7 trading days: −$131.5M" for the
   *  flow row. Null when the metric cannot honestly support the
   *  comparison (no prior observation / short prior window). */
  changeLine: string | null;
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
  mover?: Movement,
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
    return { ...base, available: false, stateLabel: null, detail: null, value: null, net: null, sinceDate: null, asOf: null, changeLine: null, unavailableReason: "Not tracked in the current registry." };
  }
  const run = stateRunFrom(def, metric.series(), anchor);
  if (!run) {
    return { ...base, available: false, stateLabel: null, detail: null, value: null, net: null, sinceDate: null, asOf: null, changeLine: null, unavailableReason: "No observations at this date." };
  }
  // The movers' own 7-day then→now, in the movers' own formatting — never a
  // comparison this layer computes itself.
  const changeLine =
    mover && mover.previous != null ? `7D: ${formatValue(mover, mover.previous)} → ${formatValue(mover)}` : null;
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
    changeLine,
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
    return { ...base, available: false, stateLabel: null, detail: null, value: null, net: null, asOf: null, changeLine: null, unavailableReason: "Flow data is not connected." };
  }
  const s = r.streak;
  const stateLabel =
    s.direction === "flat" || s.length === 0
      ? "Flat on the latest trading day"
      : `${s.length}-day ${s.direction} streak`;
  const d7 = r.windows.d7;
  const detail = `${fmtUsd(d7.net, { compact: true, sign: true })} over ${d7.days} trading days`;
  // Previous non-overlapping window — only claimed when it is a FULL window.
  const prev = windowBreakdown(r.points, 7, 7);
  const changeLine = prev.days === 7 ? `previous 7 trading days: ${fmtUsd(prev.net, { compact: true, sign: true })}` : null;
  return {
    ...base,
    available: true,
    stateLabel,
    detail,
    value: null,
    net: d7.net,
    asOf: r.points[r.points.length - 1]?.date ?? null,
    changeLine,
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

  // Phrased as a market finding, not a tally (founder rule): the reader
  // should leave with "I checked the cycle; here is what that check found."
  // Quiet stays first-class and factual — HalvingLens watched, nothing
  // cleared its own ordinary range.
  const countsLine =
    material.length === 0
      ? `All ${analysed} monitored readings held within their own ordinary 7-day ranges.`
      : `${steady} of ${analysed} monitored readings held within their own ordinary 7-day ranges — ${material.length} moved materially.`;

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

// ── ETF intelligence card (V2.1 Phase 3) ────────────────────────────────────
//
// NOW → CHANGE → COMPOSITION → CONCENTRATION → CONTEXT, entirely from the
// flows engine's canonical windows (Phase 0 primitives — no alternate ETF
// calculation exists here). Every sentence is deterministic and templated;
// each claim is made only when the data honestly supports it: the previous
// window must be full, concentration needs a full window with a non-trivial
// net, and a quiet/offsetting week is stated as one.

export interface EtfIntelCard {
  available: boolean;
  unavailableReason: string | null;
  /** The series' own last trading day. */
  asOf: string | null;
  // NOW
  net: number | null;
  netLabel: string | null;
  windowDays: number;
  // CHANGE — null when the prior window is not a full 7 trading days
  prevNet: number | null;
  prevNetLabel: string | null;
  deltaLabel: string | null;
  // COMPOSITION — the constituent trading days, oldest → newest
  bars: Array<{ date: string; netFlow: number }>;
  // CONCENTRATION — one deterministic sentence, null when not claimable
  concentrationLine: string | null;
  // CONTEXT — streak / reversal, null when nothing is honestly claimable
  contextLine: string | null;
}

const pct = (x: number): string => `${Math.round(x * 100)}%`;
const usd = (n: number): string => fmtUsd(n, { compact: true, sign: true });

/** Deterministic concentration sentence over a full window. Rules:
 *  · |net| < 5% of gross → the week offset itself; say so, with the gross.
 *  · no same-sign dominant day → null (nothing honest to single out).
 *  · dominant share > 100% of net (offsetting week) → gross framing with
 *    the dominant day named; a ">100% of the net" fraction is never printed.
 *  · share ≥ 50% → the day carried the week.
 *  · share < 50% → demand was spread; the largest day is still quantified. */
export function concentrationLineFor(b: FlowBreakdown): string | null {
  if (b.days < 7 || b.net === 0) return null;
  const gross = b.grossIn + b.grossOut;
  if (gross === 0) return null;
  const word = b.net > 0 ? "inflow" : "outflow";
  if (Math.abs(b.net) < 0.05 * gross) {
    return `Inflows and outflows largely offset: ${usd(b.grossIn)} in, ${usd(-b.grossOut)} out.`;
  }
  if (!b.dominant) return null;
  const day = prettyIso(b.dominant.date);
  if (b.dominant.share > 1) {
    return `${usd(b.grossIn)} in, ${usd(-b.grossOut)} out — the largest ${word} day (${day}, ${usd(b.dominant.netFlow)}) exceeded the week's whole net.`;
  }
  if (b.dominant.share >= 0.5) {
    return `${pct(b.dominant.share)} of the net ${word} came on ${day} (${usd(b.dominant.netFlow)}).`;
  }
  return `Spread across the week — the largest single day (${day}) contributed ${pct(b.dominant.share)} of the net.`;
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function prettyIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTH_ABBR[m - 1]} ${y}`;
}

/** Context: the streak when it has length, else a full-window reversal. */
export function etfContextLine(streak: { direction: string; length: number }, now: FlowBreakdown, prev: FlowBreakdown): string | null {
  if (streak.length >= 2 && (streak.direction === "inflow" || streak.direction === "outflow")) {
    return `${streak.length} straight trading days of net ${streak.direction}s.`;
  }
  if (now.days === 7 && prev.days === 7 && now.net !== 0 && prev.net !== 0 && Math.sign(now.net) !== Math.sign(prev.net)) {
    return `The week swung from net ${prev.net > 0 ? "inflow" : "outflow"} to net ${now.net > 0 ? "inflow" : "outflow"}.`;
  }
  return null;
}

function buildEtfIntel(): EtfIntelCard {
  const r = etfFlowsRead();
  if (!r.connected || r.points.length === 0) {
    return { available: false, unavailableReason: "Flow data is not connected.", asOf: null, net: null, netLabel: null, windowDays: 0, prevNet: null, prevNetLabel: null, deltaLabel: null, bars: [], concentrationLine: null, contextLine: null };
  }
  const now = windowBreakdown(r.points, 7);
  const prev = windowBreakdown(r.points, 7, 7);
  const fullPrev = prev.days === 7;
  return {
    available: true,
    unavailableReason: null,
    asOf: r.points[r.points.length - 1]?.date ?? null,
    net: now.net,
    netLabel: usd(now.net),
    windowDays: now.days,
    prevNet: fullPrev ? prev.net : null,
    prevNetLabel: fullPrev ? usd(prev.net) : null,
    deltaLabel: fullPrev ? usd(now.net - prev.net) : null,
    bars: now.bars,
    concentrationLine: concentrationLineFor(now),
    contextLine: etfContextLine(r.streak, now, prev),
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
  /** The ETF intelligence card (V2.1 Phase 3). */
  etf: EtfIntelCard;
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
  const rowById = (id: string) => [...considered.movements, ...considered.steady].find((m) => m.metricId === id);
  const strip: DashboardStripState[] = [
    bandedStripState("accumulation", "accumulation", "Accumulation", asOf, (v) => `${Math.round(v)}/100 · weekly`, rowById("accumulation")),
    bandedStripState("sentiment", "fear_greed", "Sentiment", asOf, (v) => `${Math.round(v)}/100`, rowById("fear_greed")),
    etfStripState(),
  ];

  const out: CycleDashboardIntel = {
    asOf,
    watch,
    watchQuietSupport: quietSupportLine(summary),
    summary,
    board: marketBoard(7, asOf),
    etf: buildEtfIntel(),
    strip,
    version: CYCLE_DASHBOARD_INTEL_VERSION,
  };
  cache.set(asOf, out);
  return out;
}
