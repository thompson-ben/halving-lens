// Honest social proof (P6.1). Turns the REAL active-subscriber count into a
// rounded-DOWN "N+" figure, and only above a configurable threshold. Never
// inflates, never shows a tiny number, never exposes identities. Below the
// threshold (or when the count is unknown) it returns null and the component
// renders nothing.

export const SOCIAL_PROOF_MIN_DEFAULT = 100;

// Rounded-down bands — we only ever claim a number we've genuinely passed.
// Fine steps of 10 through the low hundreds so the figure tracks the real count
// (e.g. 112 → "110+", not a floor-looking "100+"), then coarser as it grows.
const BANDS = [
  100, 110, 120, 130, 140, 150, 160, 170, 180, 190,
  200, 225, 250, 300, 350, 400, 450, 500, 600, 750,
  1000, 1500, 2000, 2500, 3000, 4000, 5000, 7500, 10000, 15000, 20000, 25000, 50000, 100000,
];

// Largest band <= count, provided count meets the minimum threshold. Otherwise null.
export function roundedReaders(count: number | null | undefined, min: number = SOCIAL_PROOF_MIN_DEFAULT): number | null {
  if (count == null || !Number.isFinite(count) || count < min) return null;
  let band = 0;
  for (const b of BANDS) {
    if (b <= count) band = b;
    else break;
  }
  return band || null;
}
