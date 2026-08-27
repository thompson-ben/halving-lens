// Daily Brief v2 — the shared editorial-significance engine (PR1).
//
// AUTHORITATIVE CONTRACTS (founder/PM, 23 Aug 2026 — "PR1 missing contract
// definitions, authoritative restatement"): four editorial-significance
// ranks, the six-entry v1 divergence registry with D6 explicitly deferred,
// formation/persistence semantics, cohort-safe rarity, the deterministic
// priority fallback with the approved family/quarantine/reserved
// corrections, and the three-day-type classifier.
//
// MATERIAL MOVEMENT and EDITORIAL SIGNIFICANCE are separate concepts: the
// metric-level analytical definitions (marketMovers, metricWatch,
// lifecycle runs, ETF streak) are quoted, never redefined. This module
// decides only WHICH qualifying engine facts earn Brief space, in which
// order — selection is ordering over engine facts, never a new score.
//
// Every candidate class answers "what became NEWLY reportable at today's
// 08:00 Europe/London Brief snapshot" (selection-window contract §6):
// ordinary movement candidates use the 1-day mover window where supported;
// states, streaks and historical-extreme windows keep their native
// analytical windows; a longer-window fact qualifies only on the day it
// becomes newly qualifying, and every evidence line names its window.
//
// Historical context. Not forecasts.

import { marketBoard } from "./cycleDashboardIntel";
import {
  metricById,
  formatMovement,
  formatValue,
  meaningLine,
  rarityLine,
  EXCEPTIONAL_SIGNIFICANCE,
  MATERIAL_SIGNIFICANCE,
  type Movement,
} from "./marketMovers";
import { WATCH_STATES, watchStateFor, type WatchStateDef } from "./metricWatch/states";
import { stateRunFrom, WATCH_THRESHOLDS, type StateRun } from "./metricWatch";
import { etfFlowsRead } from "./etfFlows";
import { ACCUMULATION_BANDS } from "./accumulation";
import { METRICS } from "./metrics";
import { dayNum, type Point } from "./marketMovers/distribution";

export const BRIEF_SIGNIFICANCE_VERSION = "brief-significance-v1";

// ── Ranks & day types (the approved four-rank / three-day-type contract) ────

/** 1 state transitions · 2 historical extremes · 3 streaks/records ·
 *  4 divergences. Discrete-item ranking selects hero/supporting; the
 *  Verdict may still promote a divergence (cross-signal synthesis). */
export type SignificanceRank = 1 | 2 | 3 | 4;

export type BriefDayType = "quiet" | "active" | "major_transition";

/** TIER 2's deterministic boundary — REFERENCES the movers engine's own
 *  exceptional threshold (top ~5% of the metric's equivalent-window move
 *  distribution). Never a second constant. */
export const EXTREME_RARITY_PERCENTILE = EXCEPTIONAL_SIGNIFICANCE;

// ── History cohorts (approved: rarity breaks ties only within a cohort) ────

export type HistoryCohort = "price-structure" | "mining-cost" | "sentiment" | "onchain" | "etf-flows";

/** Every considered mover belongs to exactly one approved cohort. */
export const METRIC_COHORT: Readonly<Record<string, HistoryCohort>> = {
  price: "price-structure",
  ma200: "price-structure",
  mayer: "price-structure",
  drawdown: "price-structure",
  accumulation: "price-structure",
  mining_cost: "mining-cost",
  puell: "mining-cost",
  fear_greed: "sentiment",
  mvrv_z: "onchain",
  nupl: "onchain",
  sopr: "onchain",
  reserve_risk: "onchain",
  rhodl: "onchain",
  realized_price: "onchain",
  etf_flows: "etf-flows",
};

// ── The deterministic priority fallback (approved 14 positions, with the
//    family / quarantine-label / reserved corrections) ──────────────────────

export interface FallbackEntry {
  position: number;
  concept: string;
  /** Registry ids in intra-family precedence order; empty = unreachable
   *  (quarantined composite / reserved-unmonitored) by design. */
  metricIds: readonly string[];
}

export const PRIORITY_FALLBACK: readonly FallbackEntry[] = [
  { position: 1, concept: "Cycle composite state — Verdict/day-type input; never a board candidate", metricIds: [] },
  { position: 2, concept: "Accumulation", metricIds: ["accumulation"] },
  { position: 3, concept: "NUPL", metricIds: ["nupl"] },
  { position: 4, concept: "MVRV Z-Score", metricIds: ["mvrv_z"] },
  { position: 5, concept: "Realized Price", metricIds: ["realized_price"] },
  { position: 6, concept: "Sentiment / Fear & Greed", metricIds: ["fear_greed"] },
  { position: 7, concept: "Price structure (price / 200-day relationship / Mayer / drawdown)", metricIds: ["price", "ma200", "mayer", "drawdown"] },
  { position: 8, concept: "ETF demand", metricIds: ["etf_flows"] },
  { position: 9, concept: "SOPR", metricIds: ["sopr"] },
  { position: 10, concept: "Reserve Risk", metricIds: ["reserve_risk"] },
  { position: 11, concept: "RHODL", metricIds: ["rhodl"] },
  { position: 12, concept: "LTH supply — reserved; unmonitored in v1", metricIds: [] },
  { position: 13, concept: "Addresses / network activity — reserved; unmonitored in v1", metricIds: [] },
  { position: 14, concept: "Mining economics (Est. Mining Cost; Puell Multiple)", metricIds: ["mining_cost", "puell"] },
];

/** [position, intra-family index] — unmapped ids sort last, loudly. */
export function fallbackOrder(metricId: string): [number, number] {
  for (const f of PRIORITY_FALLBACK) {
    const i = f.metricIds.indexOf(metricId);
    if (i >= 0) return [f.position, i];
  }
  return [PRIORITY_FALLBACK.length + 1, 0];
}

// ── The development contract ────────────────────────────────────────────────

export type DevelopmentKind = "state_transition" | "historical_extreme" | "streak_record" | "divergence";

export interface Development {
  rank: SignificanceRank;
  kind: DevelopmentKind;
  /** Primary signal (a divergence's first leg — its fallback anchor). */
  metricId: string;
  metricIds: string[];
  label: string;
  /** Plain-English lead, built from engine facts only. */
  headline: string;
  /** Supporting evidence lines; each names its actual window honestly. */
  evidence: string[];
  /** The analytical window that makes this significant ("24h", "7 days",
   *  "state entry", "trading days"…) — the honest window word. */
  windowLabel: string;
  cohort: HistoryCohort | null;
  /** Set only when the engine permits the claim (rarityState available). */
  rarityPercentile: number | null;
  /** Closest EXISTING dashboard section anchor (launch constraint). */
  href: string;
  divergenceId?: DivergenceId;
  asOf: string;
}

// ── Divergence registry (approved leg conditions, verbatim mapping) ─────────

export type DivergenceId = "D1" | "D2" | "D3" | "D4" | "D5" | "D7";

/** D6 (LTH supply ↔ Price) is DEFERRED to v1.1 by founder decision:
 *  lthSupply is not a registered mover, so no direction/materiality/rarity
 *  semantics exist for its leg. Do not implement without a new commission. */
export const DEFERRED_DIVERGENCES = ["D6"] as const;

/** The engine facts a leg predicate may consult — extracted per anchor so
 *  the evaluation itself is pure and fixture-drivable. */
export interface LegFacts {
  /** sentiment band key: extreme-fear | fear | neutral | greed | extreme-greed */
  sentimentKey: string | null;
  /** accumulation band key: deep_value | attractive | neutral | elevated | overheated */
  accumulationKey: string | null;
  /** NUPL ladder index relative to the "Optimism" band (0 = Optimism). */
  nuplIdxFromOptimism: number | null;
  /** Price movement over 7 days (the honest span against weekly/streak legs). */
  priceMaterialUp7: boolean;
  priceMaterialDown7: boolean;
  /** SOPR level + the "sustained" reading of its >1-side state run. */
  soprValue: number | null;
  soprAbove1SustainedDays: number | null;
  soprMaterialUp7: boolean;
  /** ETF flow streak — the card's own claimable categorical (length ≥ 2). */
  etfStreak: { direction: "inflow" | "outflow" | "flat"; length: number };
  /** Per-leg "active today" facts (registry-wide rule B). */
  activeToday: Readonly<Record<string, boolean>>;
}

export interface DivergenceDef {
  id: DivergenceId;
  label: string;
  legs: [string, string]; // metric ids; legs[0] = fallback anchor
  /** Joint observable window start (window-disclosure rule D). */
  jointHistoryFrom: string;
  /** Short-record wording restriction (D3/D7): no long-record rarity claims. */
  shortRecord: boolean;
  /** Returns the orientation satisfied today, or null. `legKeys` snapshots
   *  each leg's qualifying state so a leg STATE CHANGE is detectable. */
  evaluate: (f: LegFacts) => { orientation: "primary" | "inverse"; legKeys: [string, string]; interpretation: string } | null;
}

const GREED_SIDE = new Set(["greed", "extreme-greed"]);
const FEAR_SIDE = new Set(["fear", "extreme-fear"]);
/** "Historically Attractive" read as the attractive side of the ladder
 *  (Deep Value or Attractive — "the accumulation window remains open");
 *  the NOT-attractive side is neutral and above. Definitional mapping
 *  disclosed in the PR. */
const ATTRACTIVE_SIDE = new Set(["deep_value", "attractive"]);

export const DIVERGENCE_REGISTRY: readonly DivergenceDef[] = [
  {
    id: "D1",
    label: "Sentiment ↔ Accumulation",
    legs: ["fear_greed", "accumulation"],
    jointHistoryFrom: "2022-07",
    shortRecord: false,
    evaluate: (f) => {
      if (f.sentimentKey == null || f.accumulationKey == null) return null;
      if (GREED_SIDE.has(f.sentimentKey) && ATTRACTIVE_SIDE.has(f.accumulationKey)) {
        return {
          orientation: "primary",
          legKeys: [f.sentimentKey, f.accumulationKey],
          interpretation: "Crowd enthusiasm is heating up while the accumulation window remains open.",
        };
      }
      if (FEAR_SIDE.has(f.sentimentKey) && !ATTRACTIVE_SIDE.has(f.accumulationKey)) {
        return {
          orientation: "inverse",
          legKeys: [f.sentimentKey, f.accumulationKey],
          interpretation: "Fear without value conditions emerging.",
        };
      }
      return null;
    },
  },
  {
    id: "D2",
    label: "Price ↔ Accumulation",
    legs: ["price", "accumulation"],
    jointHistoryFrom: "2022-07",
    shortRecord: false,
    evaluate: (f) => {
      if (f.accumulationKey == null) return null;
      if (f.priceMaterialUp7 && ATTRACTIVE_SIDE.has(f.accumulationKey)) {
        return {
          orientation: "primary",
          legKeys: ["rising-7d", f.accumulationKey],
          interpretation: "Price strength has not yet closed the accumulation window.",
        };
      }
      if (f.priceMaterialDown7 && !ATTRACTIVE_SIDE.has(f.accumulationKey)) {
        return {
          orientation: "inverse",
          legKeys: ["falling-7d", f.accumulationKey],
          interpretation: "Drawdown without value conditions yet being restored.",
        };
      }
      return null;
    },
  },
  {
    id: "D3",
    label: "ETF demand ↔ Price",
    legs: ["etf_flows", "price"],
    jointHistoryFrom: "2025-06",
    shortRecord: true,
    evaluate: (f) => {
      const s = f.etfStreak;
      if (s.direction === "inflow" && s.length >= 2 && !f.priceMaterialUp7) {
        return {
          orientation: "primary",
          legKeys: [`inflow-${s.length}`, f.priceMaterialDown7 ? "falling-7d" : "flat-7d"],
          interpretation: "Institutional demand is being absorbed without corresponding price response.",
        };
      }
      if (s.direction === "outflow" && s.length >= 2 && f.priceMaterialUp7) {
        return {
          orientation: "inverse",
          legKeys: [`outflow-${s.length}`, "rising-7d"],
          interpretation: "Market strength despite ETF selling.",
        };
      }
      return null;
    },
  },
  {
    id: "D4",
    label: "NUPL ↔ Accumulation",
    legs: ["nupl", "accumulation"],
    jointHistoryFrom: "2022-07",
    shortRecord: false,
    evaluate: (f) => {
      if (f.nuplIdxFromOptimism == null || f.accumulationKey == null) return null;
      if (f.nuplIdxFromOptimism >= 0 && ATTRACTIVE_SIDE.has(f.accumulationKey)) {
        return {
          orientation: "primary",
          legKeys: [`nupl+${f.nuplIdxFromOptimism}`, f.accumulationKey],
          interpretation: "Holder paper profits are building while value conditions persist.",
        };
      }
      // "Anxiety/Capitulation" = the ladder below Optimism (Hope/fear and
      // Capitulation zones — metrics.ts's own bands, mapped by label).
      if (f.nuplIdxFromOptimism < 0 && !ATTRACTIVE_SIDE.has(f.accumulationKey)) {
        return {
          orientation: "inverse",
          legKeys: [`nupl${f.nuplIdxFromOptimism}`, f.accumulationKey],
          interpretation: "Profit erosion without value conditions emerging.",
        };
      }
      return null;
    },
  },
  {
    id: "D5",
    label: "SOPR ↔ Price",
    legs: ["sopr", "price"],
    jointHistoryFrom: "2022-07",
    shortRecord: false,
    evaluate: (f) => {
      if (f.soprValue == null) return null;
      const elevated = f.soprValue > 1 && (f.soprMaterialUp7 || (f.soprAbove1SustainedDays ?? 0) >= 7);
      if (elevated && f.priceMaterialUp7) {
        return {
          orientation: "primary",
          legKeys: ["above-1-elevated", "rising-7d"],
          interpretation: "Sellers are realising profits while buyers continue absorbing supply.",
        };
      }
      if (f.soprValue < 1 && !f.priceMaterialDown7) {
        return {
          orientation: "inverse",
          legKeys: ["below-1", f.priceMaterialUp7 ? "rising-7d" : "holding-7d"],
          interpretation: "Capitulation and loss realisation being absorbed.",
        };
      }
      return null;
    },
  },
  {
    id: "D7",
    label: "ETF demand ↔ Sentiment",
    legs: ["etf_flows", "fear_greed"],
    jointHistoryFrom: "2025-06",
    shortRecord: true,
    evaluate: (f) => {
      const s = f.etfStreak;
      if (f.sentimentKey == null) return null;
      if (s.direction === "inflow" && s.length >= 2 && FEAR_SIDE.has(f.sentimentKey)) {
        return {
          orientation: "primary",
          legKeys: [`inflow-${s.length}`, f.sentimentKey],
          interpretation: "Institutions are buying while crowd sentiment remains fearful.",
        };
      }
      if (s.direction === "outflow" && s.length >= 2 && GREED_SIDE.has(f.sentimentKey)) {
        return {
          orientation: "inverse",
          legKeys: [`outflow-${s.length}`, f.sentimentKey],
          interpretation: "Institutional selling into elevated crowd enthusiasm.",
        };
      }
      return null;
    },
  },
];

export interface DivergenceStatus {
  id: DivergenceId;
  label: string;
  legs: [string, string];
  orientation: "primary" | "inverse";
  interpretation: string;
  /** Reportable today: formed today, or a qualifying leg changed state.
   *  A merely persisting divergence shapes the Verdict only. */
  reportable: boolean;
  formedToday: boolean;
  legChangedToday: boolean;
  /** Registry-wide rule B: at least one leg materially moved or entered a
   *  state today. Without it, even a formation is not a development. */
  activeLegToday: boolean;
  jointHistoryFrom: string;
  shortRecord: boolean;
}

/** Pure formation/persistence evaluation over today's and yesterday's leg
 *  facts (fixture-drivable — the deterministic heart of rule A/B). */
export function divergenceStatus(def: DivergenceDef, today: LegFacts, prev: LegFacts | null): DivergenceStatus | null {
  const now = def.evaluate(today);
  if (!now) return null;
  const before = prev ? def.evaluate(prev) : null;
  const formedToday = before == null;
  const legChangedToday =
    before != null && (before.legKeys[0] !== now.legKeys[0] || before.legKeys[1] !== now.legKeys[1] || before.orientation !== now.orientation);
  const activeLegToday = def.legs.some((id) => today.activeToday[id] === true);
  return {
    id: def.id,
    label: def.label,
    legs: def.legs,
    orientation: now.orientation,
    interpretation: now.interpretation,
    reportable: (formedToday || legChangedToday) && activeLegToday,
    formedToday,
    legChangedToday,
    activeLegToday,
    jointHistoryFrom: def.jointHistoryFrom,
    shortRecord: def.shortRecord,
  };
}

// ── Selection (pure): ordering, day type, hero + supporting ────────────────

/** Within a rank: cohorts ordered by their best fallback position; inside a
 *  cohort, rarity (desc, claims only) breaks ties; cross-cohort raw rarity
 *  is never compared (the approved cohort-comparability rule). Transitive
 *  and deterministic by construction. */
export function orderDevelopments(devs: readonly Development[]): Development[] {
  const key = (d: Development) => fallbackOrder(d.metricId);
  const byRank = new Map<number, Development[]>();
  for (const d of devs) {
    const list = byRank.get(d.rank) ?? [];
    list.push(d);
    byRank.set(d.rank, list);
  }
  const out: Development[] = [];
  for (const rank of [1, 2, 3, 4]) {
    const list = byRank.get(rank);
    if (!list) continue;
    const cohorts = new Map<string, Development[]>();
    for (const d of list) {
      const c = d.cohort ?? `#${d.metricId}`;
      const g = cohorts.get(c) ?? [];
      g.push(d);
      cohorts.set(c, g);
    }
    const groups = [...cohorts.values()].map((g) => ({
      g,
      best: g.reduce((min, d) => {
        const k = key(d);
        return k[0] * 100 + k[1] < min ? k[0] * 100 + k[1] : min;
      }, Infinity),
    }));
    groups.sort((a, b) => a.best - b.best);
    for (const { g } of groups) {
      g.sort((a, b) => {
        const ra = a.rarityPercentile;
        const rb = b.rarityPercentile;
        if (ra != null && rb != null && ra !== rb) return rb - ra; // same cohort — rarity may break the tie
        const ka = key(a);
        const kb = key(b);
        return ka[0] !== kb[0] ? ka[0] - kb[0] : ka[1] - kb[1];
      });
      out.push(...g);
    }
  }
  return out;
}

export function classifyDayType(devs: readonly Development[]): BriefDayType {
  if (devs.some((d) => d.rank === 1)) return "major_transition";
  return devs.length > 0 ? "active" : "quiet";
}

export interface BriefSelectionResult {
  dayType: BriefDayType;
  hero: Development | null;
  /** 0–3 supporting (≤2 under the major-transition treatment). No padding. */
  supporting: Development[];
  ordered: Development[];
}

export function selectDevelopments(devs: readonly Development[]): BriefSelectionResult {
  const ordered = orderDevelopments(devs);
  const dayType = classifyDayType(ordered);
  if (ordered.length === 0) return { dayType, hero: null, supporting: [], ordered };
  const cap = dayType === "major_transition" ? 2 : 3;
  return { dayType, hero: ordered[0], supporting: ordered.slice(1, 1 + cap), ordered };
}

// ── Live candidate discovery (anchored to today's Brief snapshot) ───────────

const isoAt = (n: number): string => new Date(n * 86_400_000).toISOString().slice(0, 10);
const prevDayIso = (iso: string): string => isoAt(dayNum(iso) - 1);

const seriesOf = (metricId: string): Point[] => metricById(metricId)?.series() ?? [];

function runFor(metricId: string, anchor: string): StateRun | null {
  const def = watchStateFor(metricId);
  if (!def) return null;
  const series = seriesOf(metricId);
  return series.length ? stateRunFrom(def, series, anchor) : null;
}

/** A leg is "active today" (registry rule B): its 1-day movement is
 *  material under the existing mover flag, or it entered a state today.
 *  ETF demand: a new trading-day observation landed in today's snapshot. */
function activeTodayMap(asOf: string, board1: ReturnType<typeof marketBoard>): Record<string, boolean> {
  const prev = prevDayIso(asOf);
  const out: Record<string, boolean> = {};
  for (const m of [...board1.rows]) {
    const entered = (() => {
      const r = runFor(m.metricId, asOf);
      return r != null && !r.sinceIsSeriesStart && r.sinceDate > prev;
    })();
    out[m.metricId] = (m.significance >= MATERIAL_SIGNIFICANCE && m.movement != null) || entered;
  }
  const etf = etfFlowsRead();
  const lastEtf = etf.points[etf.points.length - 1]?.date ?? null;
  out.etf_flows = out.etf_flows === true || (lastEtf != null && lastEtf > prev);
  return out;
}

/** Extract the divergence leg facts at an anchor — every input an existing
 *  engine fact; windows chosen per the selection-window contract (7-day
 *  price/SOPR spans against weekly-cadence and streak legs, disclosed). */
export function legFactsAt(asOf: string): LegFacts {
  const board1 = marketBoard(1, asOf);
  const board7 = marketBoard(7, asOf);
  const row7 = (id: string) => board7.rows.find((m) => m.metricId === id);

  const sentRun = runFor("fear_greed", asOf);
  const accRun = runFor("accumulation", asOf);
  const nuplRun = runFor("nupl", asOf);
  const nuplDef = METRICS.find((m) => m.slug === "nupl");
  const optimismIdx = nuplDef ? nuplDef.bands.findIndex((b) => b.label === "Optimism") : -1;
  const nuplIdx =
    nuplRun && nuplDef && optimismIdx >= 0
      ? nuplDef.bands.findIndex((b) => nuplRun.value >= b.min && nuplRun.value < b.max) - optimismIdx
      : null;

  const price7 = row7("price");
  const sopr7 = row7("sopr");
  const soprRun = runFor("sopr", asOf);

  return {
    sentimentKey: sentRun?.current.key ?? null,
    accumulationKey: accRun?.current.key ?? null,
    nuplIdxFromOptimism: nuplIdx,
    priceMaterialUp7: price7 != null && price7.significance >= MATERIAL_SIGNIFICANCE && price7.direction === "up",
    priceMaterialDown7: price7 != null && price7.significance >= MATERIAL_SIGNIFICANCE && price7.direction === "down",
    soprValue: soprRun?.value ?? null,
    soprAbove1SustainedDays: soprRun && soprRun.value > 1 ? soprRun.ageDays : null,
    soprMaterialUp7: sopr7 != null && sopr7.significance >= MATERIAL_SIGNIFICANCE && sopr7.direction === "up",
    etfStreak: (() => {
      const s = etfFlowsRead().streak;
      return { direction: s.direction as "inflow" | "outflow" | "flat", length: s.length };
    })(),
    activeToday: activeTodayMap(asOf, board1),
  };
}

// Launch-constraint anchor map: the closest EXISTING dashboard section per
// development kind (no per-signal pages in PR1).
export const DASHBOARD_ANCHORS = {
  state_transition: "/cycle-dashboard#dashboard-state-strip",
  historical_extreme: "/cycle-dashboard#dashboard-market-board",
  streak_record: "/cycle-dashboard#dashboard-etf-intel",
  divergence: "/cycle-dashboard#dashboard-state-strip",
  board: "/cycle-dashboard#dashboard-market-board",
} as const;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** All qualifying developments at the anchor, unordered. */
export function discoverDevelopments(asOf: string): Development[] {
  const prev = prevDayIso(asOf);
  const out: Development[] = [];
  const taken = new Set<string>(); // ranks 1–3: one development per metric, highest rank wins

  // ── Rank 1 · state transitions (existing state engines + anti-churn) ─────
  for (const def of WATCH_STATES) {
    const run = runFor(def.moverId, asOf);
    if (!run || run.sinceIsSeriesStart || run.sinceDate <= prev) continue;
    if ((run.previousRunDays ?? 0) < WATCH_THRESHOLDS.TRANSITION_MIN_PRIOR_DAYS) continue; // the Watch's own gate
    const meta = metricById(def.moverId);
    const label = meta?.label ?? def.moverId;
    out.push({
      rank: 1,
      kind: "state_transition",
      metricId: def.moverId,
      metricIds: [def.moverId],
      label,
      headline: `${label} entered ${run.current.label}`,
      evidence: [
        `Now ${run.value.toFixed(meta?.decimals ?? 2)} · crossed from ${run.previous?.label ?? "the prior state"} on ${prettyDate(run.sinceDate)} (state entry).`,
        run.previousRunDays != null ? `The prior state had stood ${run.previousRunDays} days.` : "",
      ].filter(Boolean),
      windowLabel: "state entry",
      cohort: METRIC_COHORT[def.moverId] ?? null,
      rarityPercentile: null,
      href: DASHBOARD_ANCHORS.state_transition,
      asOf: run.asOf,
    });
    taken.add(def.moverId);
  }

  // ── Rank 2 · historical extremes (top ~5% of the metric's own move
  //    distribution at its native window; newly qualifying today only) ─────
  const extremeAt = (period: 1 | 7 | 30, id: string): Movement | null => {
    const row = marketBoard(period, asOf).rows.find((m) => m.metricId === id);
    return row &&
      row.rarityState === "available" &&
      row.rarityPercentile != null &&
      row.rarityPercentile >= EXTREME_RARITY_PERCENTILE &&
      row.movement != null
      ? row
      : null;
  };
  for (const id of marketBoard(7, asOf).rows.map((m) => m.metricId)) {
    if (taken.has(id)) continue;
    let best: { m: Movement; period: 1 | 7 | 30 } | null = null;
    for (const period of [1, 7, 30] as const) {
      const now = extremeAt(period, id);
      if (!now) continue;
      const before = (() => {
        const row = marketBoard(period, prev).rows.find((m) => m.metricId === id);
        return row != null && row.rarityState === "available" && (row.rarityPercentile ?? 0) >= EXTREME_RARITY_PERCENTILE;
      })();
      if (before) continue; // persisting extreme — not newly reportable (rule D)
      if (!best || (now.rarityPercentile ?? 0) > (best.m.rarityPercentile ?? 0)) best = { m: now, period };
    }
    if (!best) continue;
    const { m } = best;
    const windowWord = best.period === 1 ? "24h" : `${best.period}-day`;
    out.push({
      rank: 2,
      kind: "historical_extreme",
      metricId: id,
      metricIds: [id],
      label: m.label,
      // Plain-English interpretation leads; the numbers support it below.
      headline: `${m.label} just made a top-5% ${windowWord} move for its own record`,
      evidence: [
        `${formatMovement(m)} — ${rarityLine(m)}.`,
        meaningLine(m),
        `Now ${formatValue(m)}${m.state ? ` · ${m.state}` : ""}.`,
      ],
      windowLabel: best.period === 1 ? "24h" : `${best.period} days`,
      cohort: METRIC_COHORT[id] ?? null,
      rarityPercentile: m.rarityPercentile,
      href: DASHBOARD_ANCHORS.historical_extreme,
      asOf: m.asOf,
    });
    taken.add(id);
  }

  // ── Rank 3 · streaks / records (existing engine vocabulary only) ─────────
  const etf = etfFlowsRead();
  const lastEtfDay = etf.points[etf.points.length - 1]?.date ?? null;
  if (!taken.has("etf_flows") && lastEtfDay != null && lastEtfDay > prev && etf.streak.length >= 2 && etf.streak.direction !== "flat") {
    const d7 = etf.windows.d7;
    out.push({
      rank: 3,
      kind: "streak_record",
      metricId: "etf_flows",
      metricIds: ["etf_flows"],
      label: "ETF Net Flows",
      headline: `ETF demand ${etf.streak.length === 2 ? "begins" : "extends to"} a ${etf.streak.length}-day ${etf.streak.direction} streak`,
      evidence: [
        `Net ${fmtUsdCompact(d7.net)} over the past ${d7.days} trading days · latest trading day ${prettyDate(lastEtfDay)}.`,
        `US spot ETF flow data begins Jun 2025 — a short record; no long-history claims.`,
      ],
      windowLabel: "trading days",
      cohort: "etf-flows",
      rarityPercentile: null,
      href: DASHBOARD_ANCHORS.streak_record,
      asOf: lastEtfDay,
    });
    taken.add("etf_flows");
  }
  // New all-time high — the drawdown series' own record fact (0 = at the
  // running high), reportable only on the day it is newly set.
  const dd = seriesOf("drawdown");
  if (!taken.has("price") && dd.length >= 2) {
    const today = dd[dd.length - 1];
    const yesterday = dd[dd.length - 2];
    if (today.date === asOf && today.value === 0 && yesterday.value < 0) {
      out.push({
        rank: 3,
        kind: "streak_record",
        metricId: "price",
        metricIds: ["price"],
        label: "Market Price",
        headline: "Price set a new all-time high",
        evidence: [`The drawdown-from-high series returned to 0 on ${prettyDate(today.date)} (daily close record).`],
        windowLabel: "daily close",
        cohort: "price-structure",
        rarityPercentile: null,
        href: DASHBOARD_ANCHORS.historical_extreme,
        asOf: today.date,
      });
      taken.add("price");
    }
  }

  // ── Rank 4 · divergences (registry only; formation/persistence rules) ────
  const factsNow = legFactsAt(asOf);
  const factsPrev = legFactsAt(prev);
  for (const def of DIVERGENCE_REGISTRY) {
    const st = divergenceStatus(def, factsNow, factsPrev);
    if (!st || !st.reportable) continue;
    out.push(developmentFromDivergence(st, asOf));
  }

  return out;
}

/** Every divergence currently ACTIVE at the anchor (reportable or merely
 *  persisting) — persistence feeds the Verdict, never the hero/supporting
 *  slots. */
export function activeDivergences(asOf: string): DivergenceStatus[] {
  const factsNow = legFactsAt(asOf);
  const factsPrev = legFactsAt(prevDayIso(asOf));
  const out: DivergenceStatus[] = [];
  for (const def of DIVERGENCE_REGISTRY) {
    const st = divergenceStatus(def, factsNow, factsPrev);
    if (st) out.push(st);
  }
  return out;
}

export function developmentFromDivergence(st: DivergenceStatus, asOf: string): Development {
  const [a, b] = st.legs;
  const labelA = metricById(a)?.label ?? a;
  const labelB = metricById(b)?.label ?? b;
  return {
    rank: 4,
    kind: "divergence",
    metricId: a,
    metricIds: [a, b],
    label: `${labelA} ↔ ${labelB}`,
    headline: st.interpretation.replace(/\.$/, ""),
    evidence: [
      `${st.label} (${st.id}) ${st.formedToday ? "formed today" : "shifted today — a qualifying leg changed state"}.`,
      `Joint observable record begins ${st.jointHistoryFrom}${st.shortRecord ? " — a short record; no long-history claims" : ""}.`,
    ],
    windowLabel: "today",
    cohort: null, // cross-cohort by construction — rarity never ranks it
    rarityPercentile: null,
    href: DASHBOARD_ANCHORS.divergence,
    divergenceId: st.id,
    asOf,
  };
}

function fmtUsdCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "+";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  return `${sign}$${abs.toFixed(0)}`;
}
