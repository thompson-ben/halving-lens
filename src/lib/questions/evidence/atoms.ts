// AtomicValueTokens — values whose insertion cannot invalidate the sentence
// around them. Only CLOCK/ARCHIVAL atoms exist here: everything is computed
// from dates, protocol constants and the committed daily archive, so no atom
// can ever be stale-wrong. Feed-derived current values (latest price, distance
// from peak, live scores) are deliberately NOT atoms — they exist only inside
// EngineSentence formatters, which own their staleness fallbacks.

import { PRICE_ARCHIVE } from "../../data/priceArchiveData";
import { CURRENT_CYCLE, TODAY_DAY_IN_CYCLE, NEXT_HALVING_DATE } from "../../btcData";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2024-04-20" → "April 2024". */
export function monthYearLabel(iso: string): string {
  return `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

/** "2025-10-06" → "6 October 2025" (house prose date). */
export function proseDate(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}

/** Share of archive days that set a new running all-time high, one decimal. */
export function athDaySharePct(points = PRICE_ARCHIVE): number {
  let peak = 0;
  let n = 0;
  for (const p of points) {
    if (p.value > peak) {
      peak = p.value;
      n += 1;
    }
  }
  return points.length ? Math.round((n / points.length) * 1000) / 10 : 0;
}

/** Every atom id, resolved. All clock/archival — safe in editorial prose. */
export function atomValues(): Record<string, string> {
  const first = PRICE_ARCHIVE[0]?.date ?? "";
  return {
    "cycle.n": String(CURRENT_CYCLE.id),
    "cycle.day": TODAY_DAY_IN_CYCLE.toLocaleString("en-US"),
    "record.days": PRICE_ARCHIVE.length.toLocaleString("en-US"),
    "record.fromYear": first.slice(0, 4),
    "record.athSharePct": String(athDaySharePct()),
    "halving.lastLabel": monthYearLabel(CURRENT_CYCLE.halvingDate),
    "halving.nextLabel": `${monthYearLabel(NEXT_HALVING_DATE)} (projected)`,
  };
}
