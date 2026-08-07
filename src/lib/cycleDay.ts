// The cycle-day authority (Cycle Dashboard V2, CD0).
//
// One question, one owner: "what day of the halving cycle are we on?" Every
// production surface answers it from here. The answer is anchored to the
// latest COMMITTED market observation — the last date in the permanent daily
// price archive — never to the wall clock. A snapshot synced today must not
// present a cycle day the market data does not yet cover: the day this module
// reports is the day the newest daily close actually belongs to.
//
// Deliberately clock-free: no Date.now(), no argument-less new Date(). A
// caller that genuinely needs the calendar gap between "now" and the anchored
// observation supplies its own clock to calendarLagDays() — the engine itself
// stays deterministic over committed data, the same discipline the market-
// movers asOf carries.
//
// Historical context, not a prediction.

import { PRICE_ARCHIVE } from "./data/priceArchiveData";
import { HALVINGS } from "./data/types";
import type { OnchainPoint } from "./data/types";

const DAY_MS = 86_400_000;

/** Whole-day number of a UTC ISO date (days since the Unix epoch). */
const dayNum = (iso: string): number => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;

export interface CycleAnchor {
  /** The latest committed daily observation — the date the cycle day is
   *  honestly measured to. */
  asOfDate: string;
  /** Whole days from the current halving to asOfDate. */
  cycleDay: number;
  cycleId: 5;
  halvingDate: string;
}

/** Days from a halving to a given UTC date. Defaults to the current cycle's
 *  halving; pass another halving date to place a historical date in its own
 *  cycle. */
export function cycleDayAt(dateIso: string, halvingIso: string = HALVINGS[5]): number {
  return Math.round(dayNum(dateIso) - dayNum(halvingIso));
}

/** The anchor computed from an explicit archive — fixture-drivable. */
export function cycleAnchorFrom(points: readonly OnchainPoint[]): CycleAnchor | null {
  const last = points[points.length - 1];
  if (!last) return null;
  return {
    asOfDate: last.date,
    cycleDay: cycleDayAt(last.date),
    cycleId: 5,
    halvingDate: HALVINGS[5],
  };
}

let cached: CycleAnchor | null = null;

/** The anchor on live data. The committed archive is never empty, so this
 *  cannot fail in a real build; the throw keeps the contract explicit. */
export function cycleAnchor(): CycleAnchor {
  if (!cached) {
    cached = cycleAnchorFrom(PRICE_ARCHIVE);
    if (!cached) throw new Error("cycleAnchor: PRICE_ARCHIVE is empty");
  }
  return cached;
}

/** Calendar days between the caller's clock and the anchored observation.
 *  The clock is an argument on purpose — this module never reads one. */
export function calendarLagDays(nowUtcMs: number): number {
  return Math.floor(nowUtcMs / DAY_MS) - dayNum(cycleAnchor().asOfDate);
}
