// Deterministic tests for PR140 — the observed-archive point merge.
// Contract: merging a fresh (rolling-window) fetch into the committed archive
// may NEVER shrink a series' date range or drop a previously-observed point.
// Run: npm run test-observed-archive

import { readFileSync } from "node:fs";
import { mergeObservedPoints, mergeSeriesArchives } from "../src/lib/data/observedArchive";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

const pt = (date: string, value: number) => ({ date, value });

// ── mergeObservedPoints ──────────────────────────────────────────────────────

// The defect scenario: a rolling window advances one day — the union must keep
// the day that fell off the back.
{
  const prev = [pt("2022-07-26", 20000), pt("2022-07-27", 20100), pt("2026-07-25", 52000)];
  const fresh = [pt("2022-07-27", 20100), pt("2026-07-25", 52000), pt("2026-07-26", 52400)];
  const merged = mergeObservedPoints(prev, fresh);
  assert(merged.length === 4, "rolling window advance: union keeps the dropped-off day");
  assert(merged[0].date === "2022-07-26", "earliest observed date is a permanent floor");
  assert(merged[merged.length - 1].date === "2026-07-26", "newest fetched day is included");
}

{
  const merged = mergeObservedPoints(
    [pt("2024-01-01", 1), pt("2024-01-02", 2)],
    [pt("2024-01-02", 99)],
  );
  assert(merged.find((p) => p.date === "2024-01-02")?.value === 99, "fresh wins on a date conflict (source revisions)");
  assert(merged.length === 2, "conflict does not duplicate the date");
}

assert(
  mergeObservedPoints([pt("2024-01-01", 1)], undefined).length === 1 &&
    mergeObservedPoints([pt("2024-01-01", 1)], []).length === 1,
  "empty or failed fetch keeps the archive intact",
);
assert(
  mergeObservedPoints(undefined, [pt("2024-01-01", 1)]).length === 1,
  "first-ever fetch seeds the archive",
);

{
  const merged = mergeObservedPoints([pt("2024-01-03", 3)], [pt("2024-01-01", 1), pt("2024-01-02", 2)]);
  assert(
    merged.map((p) => p.date).join(",") === "2024-01-01,2024-01-02,2024-01-03",
    "result is sorted ascending regardless of input order",
  );
}

{
  const merged = mergeObservedPoints(
    [pt("2024-01-01", 1), { date: "2024-01-02", value: NaN }],
    [{ date: 42 as unknown as string, value: 2 }],
  );
  assert(merged.length === 1 && merged[0].date === "2024-01-01", "malformed and non-finite points are filtered");
}

// The invariant the whole PR exists for, checked explicitly:
{
  const prev = Array.from({ length: 1461 }, (_, i) =>
    pt(new Date(Date.UTC(2022, 6, 26) + i * 86_400_000).toISOString().slice(0, 10), 100 + i),
  );
  const fresh = prev.slice(1).concat([pt("2026-07-26", 9999)]); // window rolled forward one day
  const merged = mergeObservedPoints(prev, fresh);
  assert(merged.length >= prev.length, "merge never shrinks the archive's point count");
  assert(merged[0].date <= prev[0].date, "merge never raises the archive's start date");
}

// ── mergeSeriesArchives ──────────────────────────────────────────────────────

{
  const prev = { realizedPrice: [pt("2022-07-26", 20000)], nupl: [pt("2022-07-26", 0.4)] };
  const fresh = { realizedPrice: [pt("2022-07-27", 20100)] }; // rate-limited partial fetch
  const merged = mergeSeriesArchives(prev, fresh);
  assert(merged.realizedPrice.length === 2, "fetched series union-merges with the archive");
  assert(merged.nupl.length === 1, "series missing from a partial fetch survive untouched");
  assert(Object.keys(mergeSeriesArchives(undefined, fresh)).length === 1, "handles absent previous archive");
}

// ── Structural guard: the sync uses the merge, not spread replacement ────────

const syncSrc = readFileSync("scripts/sync.ts", "utf8");
assert(syncSrc.includes('from "../src/lib/data/observedArchive"'), "sync imports the shared archive merge");
assert((syncSrc.match(/mergeSeriesArchives\(/g) ?? []).length >= 2, "sync merges both on-chain series and HODL bands per point");
assert(!/\.\.\.\(PREVIOUS_SNAPSHOT\.onchain\?\.series/.test(syncSrc), "the per-series spread replacement is gone");

console.log(failures === 0 ? "\nAll observed-archive tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
