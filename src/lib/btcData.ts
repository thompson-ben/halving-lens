// Public data API. Consumers across the app import everything from here.
// The shape of CYCLES, TODAY, etc. is fed by `data/snapshot.ts`, which is
// either the synthetic default or a sync-generated live snapshot.

import { SNAPSHOT } from "./data/snapshot";
import { cycleAnchor, type CycleAnchor } from "./cycleDay";
import {
  DAYS_PER_CYCLE,
  HALVINGS,
  NEXT_HALVING_DATE,
  type Cycle,
  type CycleId,
  type CycleSample,
  type Snapshot,
  type SnapshotSource,
} from "./data/types";

export type { Cycle, CycleId, CycleSample, Snapshot, SnapshotSource, CycleAnchor };
export { HALVINGS, NEXT_HALVING_DATE, DAYS_PER_CYCLE };

export const SOURCE: SnapshotSource = SNAPSHOT.source;
export const SENTIMENT = SNAPSHOT.sentiment ?? null;
export const CHAIN = SNAPSHOT.chain ?? null;
export const SPOT = SNAPSHOT.spot ?? null;
export const PRICE_HISTORY = SNAPSHOT.priceHistory ?? [];
export const ETF_FLOWS = SNAPSHOT.etf ?? null;
export const ONCHAIN = SNAPSHOT.onchain ?? null;
export const HODL_WAVES = SNAPSHOT.hodlWaves ?? null;
// Newest-sample provenance for feed-joined metrics (PR133); null on snapshots
// generated before provenance existed.
export const TODAY_PROVENANCE = SNAPSHOT.todayProvenance ?? null;
export const CYCLES: Cycle[] = SNAPSHOT.cycles;
// The cycle day is anchored to the latest COMMITTED market observation (the
// last date in the permanent price archive), never the wall clock — a
// snapshot synced today must not present a day the data does not yet cover.
// The snapshot's own clock-derived `todayDayInCycle` scalar is retained in
// the data only as a pipeline cross-check (see scripts/test-cycle-day.ts).
export const CYCLE_ANCHOR: CycleAnchor = cycleAnchor();
export const TODAY_DAY_IN_CYCLE: number = CYCLE_ANCHOR.cycleDay;
export const CURRENT_CYCLE = CYCLES[CYCLES.length - 1];
export const TODAY: CycleSample =
  CURRENT_CYCLE.samples[CURRENT_CYCLE.samples.length - 1];
export const DAYS_TO_NEXT_HALVING = DAYS_PER_CYCLE - TODAY_DAY_IN_CYCLE;
export const CYCLE_PROGRESS_PCT = TODAY_DAY_IN_CYCLE / DAYS_PER_CYCLE;

export function getCycle(id: CycleId): Cycle | undefined {
  return CYCLES.find((c) => c.id === id);
}

// "Where each prior cycle was at the same day-in-cycle as today" — used as
// the cycle-comparison snapshot.
export function comparativeSnapshot() {
  return CYCLES.filter((c) => c.id !== 5).map((c) => {
    const sample = c.samples.reduce((closest, s) =>
      Math.abs(s.day - TODAY_DAY_IN_CYCLE) < Math.abs(closest.day - TODAY_DAY_IN_CYCLE) ? s : closest,
    );
    const halvingPrice = c.samples[0].price;
    return {
      cycle: c,
      sample,
      gainFromHalving: (sample.price / halvingPrice - 1) * 100,
      gainToCyclePeak: (c.peakPrice / halvingPrice - 1) * 100,
      daysFromHereToPeak: c.peakDay - TODAY_DAY_IN_CYCLE,
    };
  });
}

// "Today most closely resembles ___" — compare current cycle's normalised
// metric signature against every prior cycle, at every day, and return the
// closest match. Reports what happened in the analog cycle's *forward* window.
export interface CycleAnalog {
  cycle: Cycle;
  day: number;
  similarity: number;
  sample: CycleSample;
  peakAfter: { price: number; daysAhead: number; gainPct: number } | null;
  troughAfter: { price: number; daysAhead: number; drawdownPct: number } | null;
  endOfCycle: { price: number; daysAhead: number; returnPct: number };
}

function normalise(s: CycleSample, cycle: Cycle) {
  return [
    s.mvrvZ / 12,
    s.nupl,
    Math.log(s.mayer) / Math.log(4),
    s.rainbow / 8,
    s.price / cycle.peakPrice,
  ];
}

export function cycleAnalog(): CycleAnalog {
  const today = TODAY;
  const todayVec = normalise(today, CURRENT_CYCLE);
  let best: CycleAnalog | null = null;
  for (const cycle of CYCLES) {
    if (cycle.id === 5) continue;
    for (const sample of cycle.samples) {
      if (sample.day > 1100) continue;
      const vec = normalise(sample, cycle);
      let sumSq = 0;
      for (let i = 0; i < vec.length; i++) {
        const d = vec[i] - todayVec[i];
        sumSq += d * d;
      }
      const distance = Math.sqrt(sumSq / vec.length);
      const similarity = Math.max(0, 1 - distance);
      if (!best || similarity > best.similarity) {
        const future = cycle.samples.filter((s) => s.day > sample.day);
        const peakSample =
          future.length > 0
            ? future.reduce((acc, s) => (s.price > acc.price ? s : acc))
            : null;
        const troughSample =
          future.length > 0
            ? future.reduce((acc, s) => (s.price < acc.price ? s : acc))
            : null;
        const endSample = future[future.length - 1] ?? sample;
        best = {
          cycle,
          day: sample.day,
          similarity,
          sample,
          peakAfter: peakSample
            ? {
                price: peakSample.price,
                daysAhead: peakSample.day - sample.day,
                gainPct: (peakSample.price / sample.price - 1) * 100,
              }
            : null,
          troughAfter: troughSample
            ? {
                price: troughSample.price,
                daysAhead: troughSample.day - sample.day,
                drawdownPct: (troughSample.price / sample.price - 1) * 100,
              }
            : null,
          endOfCycle: {
            price: endSample.price,
            daysAhead: endSample.day - sample.day,
            returnPct: (endSample.price / sample.price - 1) * 100,
          },
        };
      }
    }
  }
  return best!;
}

// Parameterised (CD1): callers may ask for any equivalent cycle day; the
// default preserves the original "today" behaviour exactly.
export function cyclesAtSameDay(day: number = TODAY_DAY_IN_CYCLE) {
  return CYCLES.filter((c) => c.id !== 5).map((c) => {
    const sample = c.samples.reduce((closest, s) =>
      Math.abs(s.day - day) < Math.abs(closest.day - day) ? s : closest,
    );
    return { cycle: c, sample };
  });
}
