// Deterministic tests for the honest social-proof rounding (P6.1).
// Run: npm run test-social-proof

import { roundedReaders } from "../src/lib/socialProof";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "PASS" : "FAIL"}: ${m}`); };

// Below threshold or unknown → hidden (null). Never a tiny/absent number.
assert(roundedReaders(null) === null, "null count → hidden");
assert(roundedReaders(undefined) === null, "undefined count → hidden");
assert(roundedReaders(0) === null, "0 → hidden");
assert(roundedReaders(99, 100) === null, "just below threshold (99 < 100) → hidden");
assert(roundedReaders(50, 100) === null, "well below threshold → hidden");

// At/above threshold → rounded DOWN to a band (never inflated).
assert(roundedReaders(100, 100) === 100, "exactly 100 → 100");
assert(roundedReaders(137, 100) === 100, "137 rounds DOWN to 100 (never up)");
assert(roundedReaders(268, 100) === 250, "268 → 250");
assert(roundedReaders(999, 100) === 750, "999 → 750 (rounded down, honest)");
assert(roundedReaders(1000, 100) === 1000, "1000 → 1000");
assert(roundedReaders(12345, 100) === 10000, "12,345 → 10,000");

// Configurable threshold.
assert(roundedReaders(150, 250) === null, "150 hidden when threshold is 250");
assert(roundedReaders(300, 250) === 300, "300 shown (300 → 300) when threshold is 250");

// The rounded number is never greater than the real count (core honesty rule).
for (const n of [100, 137, 268, 501, 999, 2600, 40000]) {
  const r = roundedReaders(n, 100);
  assert(r != null && r <= n, `rounded (${r}) never exceeds real count (${n})`);
}

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll social-proof tests passed.");
process.exit(failures ? 1 : 0);
