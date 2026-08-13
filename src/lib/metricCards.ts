// MW2-A — the Metric Content Pack's canonical card payloads.
//
// The social renderer tier the Metric Watch engine was designed for
// (metricWatch/index.ts: "Renderers (Dashboard, social card, captions,
// admin — CD3/MW2) quote the describe layer and never recompute a claim").
//
// A COMPOSITION layer in the cycleDashboardIntel mould: it derives NO new
// market intelligence, defines NO thresholds, and computes NO movement of
// its own. Every number and sentence is quoted from the canonical V2.1
// authorities — marketBoard/consideredMovers (population + ranking), the
// Movement contract and describe layer (facts + strings), the Watch state
// registry (current band words), ChangeSummary (the gallery verdict and
// grouping rule) and the EtfIntelCard payload (the flow card's grammar).
// The dashboard and the content pack therefore cannot disagree about
// whether a metric moved — guarded by scripts/test-metric-cards.ts.
//
// Founder amendments (MW2 review) encoded here:
//  · The HERO is the selected-period movement — the story that made the
//    card deserve attention — never automatically the current value. The
//    value + state word are the support block. No new hero-selection
//    intelligence: hero = the canonical movement for the selected period,
//    full stop. (ETF's hero is its trading-day net, per Route B.)
//  · Routine cards carry only engine language ("An ordinary move within
//    this reading's own record.") — no interpretation is invented to fill
//    a template slot.
//  · reasonForAttention composes existing describe outputs (meaningLine +
//    rarityLine) and exists ONLY where the engine permits the rarity
//    claim; maturing states carry the maturing sentence instead.
//
// Historical context. Not forecasts.

import {
  metricById,
  formatValue,
  formatMovement,
  meaningLine,
  rarityLine,
  periodLabel,
  type Movement,
} from "./marketMovers";
import {
  marketBoard,
  isUnusualRow,
  cycleDashboardIntel,
  type MarketBoard,
  type EtfIntelCard,
  type ChangeSummary,
} from "./cycleDashboardIntel";
import { metricWatch, stateRunFrom, type MetricWatch } from "./metricWatch";
import { watchStateFor } from "./metricWatch/states";

export const METRIC_CARDS_VERSION = "metric-cards-v1";

export type CardPeriod = 1 | 7 | 30;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

// ── one metric card ─────────────────────────────────────────────────────────

export interface MetricCardPayload {
  kind: "metric";
  metricId: string;
  /** Metric name + the registry's one-line WHAT-IS-IT. */
  label: string;
  what: string;
  period: CardPeriod;
  // HERO — the story (founder amendment: movement first, always).
  heroMovement: string; // formatMovement, the engine's own signed string
  heroPeriodLabel: string; // "in 7 days" / "in 24 hours" — from periodLabel
  /** Band word beside the hero — ONLY when the engine permits the rarity
   *  claim; capitalised exactly like every V2.1 band chip. */
  bandWord: string | null;
  /** Gold at unusual/exceptional; rest otherwise. Emphasis follows
   *  significance, never direction. */
  bandTone: "gold" | "rest" | null;
  // SUPPORT — where it is now.
  valueLabel: string; // formatValue
  /** Canonical current band/state word (Watch state registry → Movement
   *  .state fallback). Null for metrics that deliberately have none. */
  stateWord: string | null;
  // WHY it surfaced (founder amendment 4) — describe-layer composition only.
  reasonForAttention: { meaning: string; evidence: string } | null;
  /** The maturing sentence when the rarity claim is withheld. */
  maturingNote: string | null;
  /** The other honest periods' movements, for the meta context line. Cells
   *  the engine refuses (weekly series at 1 day) are absent, never zero. */
  otherPeriods: Array<{ period: CardPeriod; movement: string }>;
  spark: readonly number[];
  /** Cadence/as-of honesty tail, identical wording to the Market Board:
   *  weekly tag, calendar-day flow labelling, measured-to disclosure. */
  honestyTail: string | null;
  asOf: string;
  href: string;
}

/** The ETF card — Route B: the Phase 3 intelligence grammar, quoted from
 *  the EtfIntelCard payload. Trading-day language throughout; no band word
 *  (no invented flow thresholds — the V2.1 rule). */
export interface EtfCardPayload {
  kind: "etf";
  metricId: "etf_flows";
  label: string;
  what: string;
  // HERO — the story is the trading-day net.
  heroNetLabel: string; // e.g. "+$482.5M"
  heroPeriodLabel: string; // "in 7 trading days"
  // CHANGE
  prevNetLabel: string | null;
  deltaLabel: string | null;
  // COMPOSITION / CONCENTRATION / CONTEXT — verbatim from the canonical card.
  bars: Array<{ date: string; netFlow: number }>;
  concentrationLine: string | null;
  contextLine: string | null;
  asOf: string | null;
  href: string;
}

export type AnyCardPayload = MetricCardPayload | EtfCardPayload;

/** Current canonical state word: the Watch state registry first (the same
 *  binding the dashboard strip reads), Movement.state as the fallback for
 *  movers-banded metrics, null where no vocabulary exists by design. */
function stateWordFor(m: Movement, anchor: string): string | null {
  const def = watchStateFor(m.metricId);
  const metric = metricById(m.metricId);
  if (def && metric) {
    const run = stateRunFrom(def, metric.series(), anchor);
    if (run) return run.current.label;
  }
  return m.state ?? null;
}

/** Identical wording to the Market Board's honesty tail — one honesty
 *  vocabulary across surfaces. */
function honestyTailFor(m: Movement, anchor: string, period: CardPeriod): string | null {
  const parts: string[] = [];
  if (m.kind === "flow") parts.push(`net over ${period} calendar days · trading-day series`);
  else if (m.window.cadenceDays >= 7) parts.push("weekly series");
  if (m.asOf < anchor) parts.push(`measured to ${prettyDate(m.asOf)}`);
  return parts.length ? parts.join(" · ") : null;
}

function metricCardFrom(m: Movement, board: MarketBoard, others: MarketBoard[]): MetricCardPayload {
  const rarityOk = m.rarityState === "available";
  const bandWord = rarityOk ? m.band.charAt(0).toUpperCase() + m.band.slice(1) : null;
  const otherPeriods = others
    .map((b) => ({ b, row: b.rows.find((x) => x.metricId === m.metricId) }))
    .filter((x): x is { b: MarketBoard; row: Movement } => x.row != null)
    .map((x) => ({ period: x.b.period as CardPeriod, movement: formatMovement(x.row) }));
  return {
    kind: "metric",
    metricId: m.metricId,
    label: m.label,
    what: m.what,
    period: board.period as CardPeriod,
    heroMovement: formatMovement(m),
    heroPeriodLabel: `in ${periodLabel(board.period)}`,
    bandWord,
    bandTone: bandWord ? (m.band === "unusual" || m.band === "exceptional" ? "gold" : "rest") : null,
    valueLabel: formatValue(m),
    stateWord: stateWordFor(m, board.asOf),
    reasonForAttention: rarityOk ? { meaning: meaningLine(m), evidence: rarityLine(m) } : null,
    maturingNote: rarityOk ? null : rarityLine(m),
    otherPeriods,
    spark: m.spark,
    honestyTail: honestyTailFor(m, board.asOf, board.period as CardPeriod),
    asOf: m.asOf,
    href: m.href,
  };
}

function etfCardFrom(etf: EtfIntelCard, m: Movement): EtfCardPayload {
  return {
    kind: "etf",
    metricId: "etf_flows",
    label: m.label,
    what: m.what,
    heroNetLabel: etf.netLabel ?? "—",
    heroPeriodLabel: `in ${etf.windowDays} trading days`,
    prevNetLabel: etf.prevNetLabel,
    deltaLabel: etf.deltaLabel,
    bars: etf.bars,
    concentrationLine: etf.concentrationLine,
    contextLine: etf.contextLine,
    asOf: etf.asOf,
    href: m.href,
  };
}

// ── the gallery ─────────────────────────────────────────────────────────────

export interface MetricCardsGallery {
  version: string;
  period: CardPeriod;
  asOf: string;
  /** The canonical 7-day week verdict, verbatim from ChangeSummary —
   *  regardless of the gallery's selected period, the week's verdict is
   *  the week's verdict. */
  verdict: Pick<ChangeSummary, "activity" | "activityLabel" | "countsLine">;
  /** The Watch's own claims, by reference — Most Interesting and One to
   *  Watch stay distinct from the movers grouping (V2.1 §12 rule). */
  watch: MetricWatch;
  /** Grouping at the SELECTED period, by the exported dashboard rule
   *  (isUnusualRow) over the same considered population as the board —
   *  at 7 days these groups are exactly ChangeSummary's sets. */
  worthLookingAt: AnyCardPayload[];
  alsoMoving: AnyCardPayload[];
  routine: AnyCardPayload[];
  maturing: AnyCardPayload[];
  /** The engine's own not-observable entries (weekly series at 1 day). */
  unavailable: MarketBoard["unavailable"];
}

const galleryCache = new Map<string, MetricCardsGallery>();

export function metricCardsGallery(period: CardPeriod = 7, anchor?: string): MetricCardsGallery {
  const board = marketBoard(period, anchor);
  const key = `${period}@${board.asOf}`;
  const hit = galleryCache.get(key);
  if (hit) return hit;

  const intel = cycleDashboardIntel(anchor);
  const otherBoards = ([1, 7, 30] as const).filter((p) => p !== period).map((p) => marketBoard(p, anchor));

  const toCard = (m: Movement): AnyCardPayload =>
    m.metricId === "etf_flows" && intel.etf.available ? etfCardFrom(intel.etf, m) : metricCardFrom(m, board, otherBoards);

  const material = board.rows.slice(0, board.materialCount);
  const steady = board.rows.slice(board.materialCount);
  const worth = material.filter(isUnusualRow);
  const also = material.filter((m) => !isUnusualRow(m));
  const maturingRows = steady.filter((m) => m.rarityState !== "available");
  const routineRows = steady.filter((m) => m.rarityState === "available");

  const out: MetricCardsGallery = {
    version: METRIC_CARDS_VERSION,
    period,
    asOf: board.asOf,
    verdict: {
      activity: intel.summary.activity,
      activityLabel: intel.summary.activityLabel,
      countsLine: intel.summary.countsLine,
    },
    watch: intel.watch,
    worthLookingAt: worth.map(toCard),
    alsoMoving: also.map(toCard),
    routine: routineRows.map(toCard),
    maturing: maturingRows.map(toCard),
    unavailable: board.unavailable,
  };
  galleryCache.set(key, out);
  return out;
}
