// The Metric Watch state registry (Cycle Dashboard V2, MW1).
//
// Which declared, historically meaningful states can each watched metric be
// IN — and where do their thresholds live? This module MAPS to the existing
// threshold sources; it never re-declares a number:
//
//   · metrics.ts METRICS bands (via zoneFor)  — MVRV-Z, NUPL, SOPR,
//     Reserve Risk, RHODL, Mayer, Puell
//   · sentiment.ts bandFor                    — Fear & Greed
//   · accumulation.ts ACCUMULATION_BANDS      — Accumulation Index
//
// The Market Movers registry's own band defs are deliberately NOT extended
// here: lighting up crossings for more metrics would change Market
// Snapshot / State of Bitcoin output, which belongs to its own approved
// change (recorded as potential architecture cleanup, not MW1).
//
// Eligibility discipline: a state is watchable only when the metric's
// series is honest observed/derived data for the current cycle (the
// observed-windows rules). market_health is excluded on structural grounds
// — see the exclusion note at the bottom. rainbow has no series at all.

import { METRICS, zoneFor, type MetricDef } from "../metrics";
import { bandFor as sentimentBandFor } from "../sentiment";
import { ACCUMULATION_BANDS } from "../accumulation";

export interface WatchStateInfo {
  /** Stable machine key for the state (future Pro alert identity). */
  key: string;
  label: string;
}

export interface WatchBoundary {
  /** The numeric threshold, from its existing source. */
  value: number;
  /** State entered when the value moves across this boundary. */
  targetKey: string;
  targetLabel: string;
  /** Crossing direction that enters the target: "up" | "down". */
  entersOn: "up" | "down";
}

export interface WatchStateDef {
  /** Market Movers registry id — the series and label authority. */
  moverId: string;
  /** Where the thresholds live (member-facing provenance). */
  thresholdSource: string;
  /** Series cadence granularity for trajectory windows. */
  cadence: "daily" | "weekly";
  stateOf: (value: number) => WatchStateInfo;
  /** The finite boundaries adjacent to the current value's band —
   *  [toward lower, toward upper], either may be null (±Infinity). */
  boundariesFor: (value: number) => { lower: WatchBoundary | null; upper: WatchBoundary | null };
  /** Width of the band containing `value`; null when unbounded. */
  bandWidth: (value: number) => number | null;
}

// ── metrics.ts-banded metrics ───────────────────────────────────────────────

const SLUG_BY_MOVER: Record<string, string> = {
  mvrv_z: "mvrv-z-score",
  nupl: "nupl",
  sopr: "sopr",
  reserve_risk: "reserve-risk",
  rhodl: "rhodl",
  mayer: "mayer-multiple",
  puell: "puell-multiple",
};

function metricDef(slug: string): MetricDef {
  const def = METRICS.find((m) => m.slug === slug);
  if (!def) throw new Error(`metricWatch: no METRICS def for ${slug}`);
  return def;
}

// Watch-surface display aliases for source labels that collide with the
// programme's language rules ("buy"/"bullish" never appear in Metric Watch
// output). DISPLAY ONLY: state keys, thresholds and the metric pages'
// own labels are untouched — this renames nothing upstream.
const WATCH_LABEL_ALIASES: Record<string, string> = {
  "Generational buy": "Deep value",
  Bullish: "Expansion",
};
const watchLabel = (label: string): string => WATCH_LABEL_ALIASES[label] ?? label;

function bandsDef(moverId: string, def: MetricDef): WatchStateDef {
  const bandAt = (value: number) => def.bands.find((b) => value >= b.min && value < b.max) ?? def.bands[def.bands.length - 1];
  return {
    moverId,
    thresholdSource: `metrics.ts · ${def.slug}`,
    cadence: "daily",
    stateOf: (value) => {
      const z = zoneFor(def, value);
      return { key: z.zone, label: watchLabel(z.label) };
    },
    boundariesFor: (value) => {
      const idx = def.bands.indexOf(bandAt(value));
      const band = def.bands[idx];
      const below = def.bands[idx - 1];
      const above = def.bands[idx + 1];
      return {
        lower:
          below && Number.isFinite(band.min)
            ? { value: band.min, targetKey: below.zone, targetLabel: watchLabel(below.label), entersOn: "down" }
            : null,
        upper:
          above && Number.isFinite(band.max)
            ? { value: band.max, targetKey: above.zone, targetLabel: watchLabel(above.label), entersOn: "up" }
            : null,
      };
    },
    bandWidth: (value) => {
      const band = bandAt(value);
      return Number.isFinite(band.min) && Number.isFinite(band.max) ? band.max - band.min : null;
    },
  };
}

// ── sentiment ───────────────────────────────────────────────────────────────

const SENTIMENT_CUTS = [25, 45, 55, 75];
const sentimentInfo = (v: number): WatchStateInfo => {
  const b = sentimentBandFor(v);
  return { key: b.band, label: b.label };
};

const sentimentDef: WatchStateDef = {
  moverId: "fear_greed",
  thresholdSource: "sentiment.ts · bandFor",
  cadence: "daily",
  stateOf: sentimentInfo,
  boundariesFor: (value) => {
    const lower = [...SENTIMENT_CUTS].reverse().find((c) => c <= value);
    const upper = SENTIMENT_CUTS.find((c) => c > value);
    return {
      lower:
        lower !== undefined
          ? { value: lower, ...targetOf(sentimentInfo, lower, "down"), entersOn: "down" }
          : null,
      upper:
        upper !== undefined
          ? { value: upper, ...targetOf(sentimentInfo, upper, "up"), entersOn: "up" }
          : null,
    };
  },
  bandWidth: (value) => {
    const lower = [...SENTIMENT_CUTS].reverse().find((c) => c <= value) ?? 0;
    const upper = SENTIMENT_CUTS.find((c) => c > value) ?? 100;
    return upper - lower;
  },
};

// ── accumulation ────────────────────────────────────────────────────────────

const accumulationInfo = (v: number): WatchStateInfo => {
  const b = ACCUMULATION_BANDS.find((x) => v >= x.range[0] && v < x.range[1]) ?? ACCUMULATION_BANDS[ACCUMULATION_BANDS.length - 1];
  return { key: b.key, label: b.label };
};

const accumulationDef: WatchStateDef = {
  moverId: "accumulation",
  thresholdSource: "accumulation.ts · ACCUMULATION_BANDS",
  cadence: "weekly",
  stateOf: accumulationInfo,
  boundariesFor: (value) => {
    const cuts = ACCUMULATION_BANDS.map((b) => b.range[0]).filter((c) => c > 0);
    const lower = [...cuts].reverse().find((c) => c <= value);
    const upper = cuts.find((c) => c > value);
    return {
      lower:
        lower !== undefined
          ? { value: lower, ...targetOf(accumulationInfo, lower, "down"), entersOn: "down" }
          : null,
      upper:
        upper !== undefined
          ? { value: upper, ...targetOf(accumulationInfo, upper, "up"), entersOn: "up" }
          : null,
    };
  },
  bandWidth: (value) => {
    const b = ACCUMULATION_BANDS.find((x) => value >= x.range[0] && value < x.range[1]) ?? ACCUMULATION_BANDS[ACCUMULATION_BANDS.length - 1];
    return b.range[1] - b.range[0];
  },
};

/** The state just past a boundary in the given direction — the state a move
 *  across it would ENTER (nudged one ulp-ish step past the cutoff). */
function targetOf(info: (v: number) => WatchStateInfo, cut: number, dir: "up" | "down"): { targetKey: string; targetLabel: string } {
  const eps = Math.max(Math.abs(cut) * 1e-9, 1e-9);
  const t = info(dir === "up" ? cut + eps : cut - eps);
  return { targetKey: t.key, targetLabel: t.label };
}

// ── the registry ────────────────────────────────────────────────────────────

export const WATCH_STATES: WatchStateDef[] = [
  ...Object.entries(SLUG_BY_MOVER).map(([moverId, slug]) => bandsDef(moverId, metricDef(slug))),
  sentimentDef,
  accumulationDef,
];

export function watchStateFor(moverId: string): WatchStateDef | undefined {
  return WATCH_STATES.find((s) => s.moverId === moverId);
}

// ── exclusions, recorded where the decision lives ───────────────────────────
//
// market_health — EXCLUDED from both Metric Watch modes:
//   1. Structural self-reference: it is a composite OF metrics the Watch
//      already observes directly, so a band change in it re-reports the
//      underlying moves as a second, derivative finding.
//   2. Surface duplication: the Dashboard orientation and the CD3 State of
//      the Cycle strip already present Market Health and its band; Metric
//      Watch re-announcing it would say the same thing twice on one page.
//   3. Evidence: 66 stored observations with gaps — too short for honest
//      lifecycle runs (nearly every run would be open at the series start),
//      and far below every rarity floor. Not solvable by lowering floors.
// rainbow — no series exists in the snapshot (the stored value is a
//   per-cycle band index, not the power-law rainbow); nothing to watch.
// realized_price — no declared bands (METRICS bands: []); it participates
//   through its market-gap state instead (see the engine's gap states).
// etf_flows — no declared meaningful state; flows speak through movement
//   and rarity in Most Interesting, never through invented thresholds.
