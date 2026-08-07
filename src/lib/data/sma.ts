// Simple moving average over daily points — THE house implementation.
//
// Extracted from scripts/sync.ts (Cycle Dashboard V2, CD1) so the Mayer
// Multiple has exactly one methodology: the snapshot generation and the
// cycle-lens engine both call this function. Inclusive of the current point;
// undefined until a full window of real observations exists — never a
// shortened window presented as the real thing.

export function sma(values: readonly number[], i: number, window: number): number | undefined {
  if (i < window - 1) return undefined;
  let sum = 0;
  for (let j = i - window + 1; j <= i; j++) sum += values[j];
  return sum / window;
}
