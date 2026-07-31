// Deterministic tests for the permanent daily-close archive (Seasonality
// PR-A). Founder acceptance criteria: completeness, idempotence, UTC daily
// uniqueness, deterministic duplicate handling, permanent retention, and
// exact month-boundary calculations — proven on fixtures here, and on the
// real archive once the first post-merge sync populates it.
// Run: npm run test-price-archive

import { readFileSync } from "node:fs";
import { mergeObservedPoints } from "../src/lib/data/observedArchive";
import {
  isCompleteMonth,
  lastCloseOfMonth,
  monthCloses,
  monthlyReturnPct,
  priceArchive,
  priceArchiveWindow,
} from "../src/lib/data/priceArchive";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

// ── Merge properties (the archive's write path) ──────────────────────────────

const prev = [
  { date: "2024-01-01", value: 100 },
  { date: "2024-01-02", value: 110 },
  { date: "2024-01-03", value: 105 },
];
const fresh = [
  { date: "2024-01-03", value: 106 }, // revision of an existing day
  { date: "2024-01-04", value: 112 }, // new day
];
const merged = mergeObservedPoints(prev, fresh);
assert(merged.length === 4, "union: every date from both inputs survives");
assert(merged.find((p) => p.date === "2024-01-03")?.value === 106, "deterministic duplicate handling: fresh wins on a date conflict");
assert(merged.find((p) => p.date === "2024-01-01")?.value === 100, "permanent retention: days absent from the fresh fetch are kept");
assert(JSON.stringify(mergeObservedPoints(merged, merged)) === JSON.stringify(merged), "idempotence: merging the archive with itself changes nothing");
assert(JSON.stringify(mergeObservedPoints(merged, fresh)) === JSON.stringify(merged), "idempotence: re-applying the same fetch changes nothing");
const shrunk = mergeObservedPoints(merged, [{ date: "2024-01-04", value: 113 }]);
assert(shrunk.length === merged.length, "a shorter fresh window can never shrink the archive");
assert(new Set(merged.map((p) => p.date)).size === merged.length, "UTC daily uniqueness: one point per date key");
assert(merged.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date)), "keys are ISO UTC days");
assert(merged.every((p, i) => i === 0 || merged[i - 1].date < p.date), "the archive is sorted ascending");

// ── Exact month boundaries (founder-specified methodology) ──────────────────

// A fixture with a missing month-end day, a sparse month, an empty month and
// a partial current month.
const fx = [
  { date: "2024-01-05", value: 100 },
  { date: "2024-01-30", value: 120 }, // Jan 31 missing → last AVAILABLE close wins
  { date: "2024-02-29", value: 132 }, // leap-year month end
  // March: no observations at all
  { date: "2024-04-01", value: 110 },
  { date: "2024-04-30", value: 121 },
  { date: "2024-05-10", value: 133.1 }, // "current" partial month
];
assert(lastCloseOfMonth(2024, 1, fx)?.date === "2024-01-30", "month close = last AVAILABLE daily UTC close, not the calendar's last day");
assert(lastCloseOfMonth(2024, 3, fx) === null, "a month with no observations yields null — never an interpolation");
assert(monthlyReturnPct(2024, 2, fx) === 10, "monthly return = month-end close vs previous month-end close (132/120 → +10%)");
assert(monthlyReturnPct(2024, 4, fx) === null, "a return needs BOTH boundaries — March is missing, so April is null");
assert(monthlyReturnPct(2024, 5, fx) === 10, "the running month compares its last available close vs the prior month end (133.1/121 → +10%)");
assert(monthlyReturnPct(2024, 1, fx) === null, "the first archived month has no previous boundary → null");
assert(isCompleteMonth(2024, 4, "2024-05-10") && !isCompleteMonth(2024, 5, "2024-05-10"), "the current month is flagged month-to-date, not final");
const mc = monthCloses(fx);
assert(mc.length === 4 && mc[0].date === "2024-01-30" && mc[mc.length - 1].date === "2024-05-10", "monthCloses lists each observed month's closing observation, ascending (empty March absent)");

// ── The real archive (conditional until the first post-merge sync) ───────────

const win = priceArchiveWindow();
if (PRICE_ARCHIVE.length === 0) {
  console.log("  note   real archive not yet populated — the first post-merge sync performs the backfill; fixture proofs above stand in until then");
  assert(win === null, "an unpopulated archive reports null, never a fake window");
} else {
  const sorted = priceArchive();
  assert(new Set(sorted.map((p) => p.date)).size === sorted.length, "real archive: one point per UTC day");
  assert(sorted.every((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.value > 0), "real archive: ISO days with positive closes");
  assert(win != null && win.from <= "2013-01-01", `real archive: backfill reaches the early record (from ${win?.from})`);
  // Completeness: coverage between the first and last day. CoinMetrics
  // PriceUSD is continuous; tolerate rare single-day gaps, never structural
  // holes.
  const spanDays = (Date.parse(win!.to) - Date.parse(win!.from)) / 86_400_000 + 1;
  const coverage = sorted.length / spanDays;
  console.log(`  note   coverage ${(coverage * 100).toFixed(2)}% of ${Math.round(spanDays)} days (${win!.from} → ${win!.to})`);
  assert(coverage >= 0.98, "real archive: ≥98% daily coverage across its window");
  let maxGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    maxGap = Math.max(maxGap, (Date.parse(sorted[i].date) - Date.parse(sorted[i - 1].date)) / 86_400_000);
  }
  assert(maxGap <= 7, `real archive: no structural holes (largest gap ${maxGap} days)`);
}

// ── Wiring ───────────────────────────────────────────────────────────────────

const syncSrc = readFileSync("scripts/sync.ts", "utf8");
assert(syncSrc.includes("mergeObservedPoints(") && syncSrc.includes("PREVIOUS_PRICE_ARCHIVE"), "the sync union-merges into the archive on every run (first run = the backfill)");
assert(syncSrc.includes("priceArchive.length >= PREVIOUS_PRICE_ARCHIVE.length"), "the sync refuses to write a smaller archive than the one committed");
assert(syncSrc.includes("daily.slice(-730)"), "the snapshot's rolling 730-day window is untouched — existing consumers unaffected");
const owSrc = readFileSync("src/lib/data/observedWindows.ts", "utf8");
assert(owSrc.includes("PRICE_ARCHIVE.length > (SNAPSHOT.priceHistory?.length ?? 0)"), "the observed-windows registry reports the archive's window once it is the longer record");
// The workflows commit explicit path lists — a generated file that is written
// in the runner but never staged is silently discarded (the PR-A launch bug).
for (const wf of [".github/workflows/refresh.yml", ".github/workflows/sync.yml"]) {
  const src = readFileSync(wf, "utf8");
  assert(src.includes("src/lib/data/priceArchiveData.ts"), `${wf} stages the archive so sync output actually lands on main`);
}

console.log(failures === 0 ? "\nAll price-archive tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
