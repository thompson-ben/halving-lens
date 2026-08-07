// The Lens client payload (Cycle Dashboard V2, CD2).
//
// Everything the interactive Lens needs, assembled server-side from the CD1
// engine and serialised compactly. The client component INDEXES this data;
// it never recomputes it — every number here was produced by cycleLens, so
// the honesty rules (no interpolation, no current-cycle future, unavailable
// over shortened windows, editorial thresholds) are decided once, in the
// engine, and merely displayed downstream.
//
// Parallel arrays are indexed by cycle day. `null` inside a forward array is
// the engine's "not observable" — the renderer must show that state, never
// skip it where omission could mislead.

import { CYCLES } from "./btcData";
import {
  LENS_CYCLE_IDS,
  LENS_OBSERVATION_VERSION,
  CURRENT_FUTURE_REASON,
  lensSeries,
  lensAtDay,
  lensObservation,
  type LensCycleId,
  type LensLifecycle,
  type LensObservationKind,
} from "./cycleLens";

const r = (v: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

export interface LensPayloadCycle {
  cycleId: LensCycleId;
  /** e.g. "2012" — the halving year the product uses to name cycles. */
  year: string;
  short: string;
  /** House cycle colour (same conventions as every cycle chart). */
  color: string;
  halvingDate: string;
  halvingPrice: number;
  completed: boolean;
  lastDay: number;
  peakDay: number;
  /** Price as a multiple of the halving close, per day 0..lastDay (4dp). */
  multiple: number[];
  /** Percent below the running cycle high, per day (1dp, ≤ 0). */
  drawdown: number[];
  /** Mayer Multiple per day (2dp); null while the 200-day history is not
   *  fully observed. */
  mayer: (number | null)[];
  /** Forward outcomes for COMPLETED cycles (1dp %); null = the engine says
   *  the window is not observable. Absent for the current cycle — its
   *  future is never computed. */
  fwd?: Record<30 | 60 | 90, (number | null)[]>;
}

/** One observation per day, compressed: sentence strings are deduped into
 *  `sentences` and referenced by index. 0 = the engine returned null. */
export type LensPayloadObservation =
  | 0
  | {
      s: number; // index into sentences
      kind: LensObservationKind;
      lifecycle: LensLifecycle;
      sinceDay: number;
    };

export interface LensClientPayload {
  asOfDate: string;
  currentCycleDay: number;
  /** Largest day any cycle reached — the Lens's scrub domain. */
  maxDay: number;
  observationVersion: string;
  currentFutureReason: string;
  cycles: LensPayloadCycle[];
  sentences: string[];
  /** Indexed by day 0..currentCycleDay. */
  observations: LensPayloadObservation[];
}

let cache: LensClientPayload | null = null;

export function lensClientPayload(): LensClientPayload {
  if (cache) return cache;

  const cycleMeta = new Map(CYCLES.map((c) => [c.id, c]));
  const cycles: LensPayloadCycle[] = LENS_CYCLE_IDS.map((id) => {
    const s = lensSeries(id);
    const meta = cycleMeta.get(id);
    const out: LensPayloadCycle = {
      cycleId: id,
      year: s.halvingDate.slice(0, 4),
      short: meta?.short ?? `C${id}`,
      color: meta?.color ?? "#8893a4",
      halvingDate: s.halvingDate,
      halvingPrice: s.halvingPrice,
      completed: s.completed,
      lastDay: s.lastDay,
      peakDay: s.peakDay,
      multiple: s.points.map((p) => r(p.multiple, 4)),
      drawdown: s.points.map((p) => r(p.drawdownPct, 1)),
      mayer: [],
      ...(s.completed ? { fwd: { 30: [], 60: [], 90: [] } } : {}),
    };
    return out;
  });

  // Per-day engine readings: Mayer and (completed cycles only) forwards.
  const maxDay = Math.max(...cycles.map((c) => c.lastDay));
  for (let d = 0; d <= maxDay; d++) {
    const at = lensAtDay(d);
    for (const c of at.cycles) {
      const target = cycles.find((x) => x.cycleId === c.cycleId)!;
      if (d > target.lastDay) continue;
      if (!c.reached) continue;
      target.mayer.push(c.mayer == null ? null : r(c.mayer, 2));
      if (target.fwd) {
        for (const w of [30, 60, 90] as const) {
          const f = c.forward[w];
          target.fwd[w].push(f.available ? r(f.changePct, 1) : null);
        }
      }
    }
  }

  // Per-day observations for the current cycle's record, sentences deduped.
  const anchorDay = lensSeries(5).lastDay;
  const sentences: string[] = [];
  const sentenceIdx = new Map<string, number>();
  const observations: LensPayloadObservation[] = [];
  for (let d = 0; d <= anchorDay; d++) {
    const o = lensObservation(d);
    if (!o) {
      observations.push(0);
      continue;
    }
    let idx = sentenceIdx.get(o.sentence);
    if (idx === undefined) {
      idx = sentences.length;
      sentences.push(o.sentence);
      sentenceIdx.set(o.sentence, idx);
    }
    observations.push({ s: idx, kind: o.kind, lifecycle: o.lifecycle, sinceDay: o.stateSinceDay });
  }

  cache = {
    asOfDate: lensAtDay(0).asOfDate,
    currentCycleDay: anchorDay,
    maxDay,
    observationVersion: LENS_OBSERVATION_VERSION,
    currentFutureReason: CURRENT_FUTURE_REASON,
    cycles,
    sentences,
    observations,
  };
  return cache;
}

/** Parse + clamp a ?day= value to the Lens domain. Anything unparseable
 *  falls back to the current cycle day — the default view. */
export function parseLensDay(raw: string | string[] | undefined, payload: LensClientPayload): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (s === undefined || s === "" || !/^-?\d+$/.test(s)) return payload.currentCycleDay;
  const n = Number(s);
  if (!Number.isFinite(n)) return payload.currentCycleDay;
  return Math.min(Math.max(n, 0), payload.maxDay);
}
