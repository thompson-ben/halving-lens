// Deterministic tests for the Cycle-Aligned Seasonality engine (PR-V2A):
// anchored-month arithmetic and clamping, boundary methodology, stub and
// running-month partials, the observed grid horizon (never the projected
// halving), zero-neutral agreement classification on unrounded values,
// completed-cycles-only agreement language, per-cycle reference coverage,
// configuration staleness, and the banned-language scan over everything the
// engine can emit. Run: npm run test-cycle-seasonality

import {
  addMonthsClamped,
  agreementFactsFrom,
  cycleMonthGap,
  cycleMonthReturn,
  maxObservedMonth,
  monthBoundaries,
  signClass,
  type CycleMonthCell,
} from "../src/lib/cycleSeasonalityCore";
import {
  agreementFacts,
  currentCyclePosition,
  cycleCells,
  cycleCoverage,
  cycleSpans,
  gridHorizon,
  monthConfigDetail,
} from "../src/lib/cycleSeasonality";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";
import { readFileSync } from "node:fs";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

// ── Anchored month arithmetic ────────────────────────────────────────────────

assert(addMonthsClamped("2012-11-28", 3) === "2013-02-28", "clamping: Nov-28 + 3 months lands on Feb-28 (28-day month)");
assert(addMonthsClamped("2024-01-31", 1) === "2024-02-29", "clamping: Jan-31 + 1 month lands on Feb-29 in a leap year");
assert(addMonthsClamped("2023-01-31", 1) === "2023-02-28", "clamping: …and Feb-28 in a common year");
assert(addMonthsClamped("2012-11-28", 12) === "2013-11-28", "a full year returns to the anchor day");
assert(addMonthsClamped("2020-05-11", 47) === "2024-04-11", "cycle 4's month-47 boundary sits 8 days before the 2024 halving");
const b = monthBoundaries("2016-07-09", 5);
assert(b.from === "2016-12-09" && b.to === "2017-01-09", "month k is [anchor+k, anchor+k+1) across a year boundary");

// ── Boundary methodology on a synthetic cycle ────────────────────────────────

const day = (date: string, value: number) => ({ date, value });
// Anchor 2020-01-15. Closes: halving day 100; last close before month-1
// boundary (Feb-15) is Feb-14 at 110; last before Mar-15 is Mar-14 at 99.
const closes = [
  day("2020-01-14", 90), day("2020-01-15", 100), day("2020-01-20", 105), day("2020-02-14", 110),
  day("2020-02-20", 104), day("2020-03-14", 99), day("2020-03-20", 120),
];
const m0 = cycleMonthReturn(closes, "2020-01-15", 0, "2024-01-15", 9)!;
assert(m0.value === 10 && !m0.partial, "month 0: halving-day close (100) → last close before the month-1 boundary (110) = +10%");
const m1 = cycleMonthReturn(closes, "2020-01-15", 1, "2024-01-15", 9)!;
assert(m1.value === -10 && m1.raw !== m1.value * 1.0000001, "month 1: 110 → 99 = -10%, computed from closes strictly before each boundary");
const stub = cycleMonthReturn(closes, "2020-01-15", 2, "2020-03-21", 9)!;
assert(stub.partial && stub.to === "2020-03-21", "a month clipped by the cycle end is PARTIAL with the clipped range recorded");
assert(cycleMonthReturn(closes, "2020-01-15", 9, "2024-01-15", 9) === null, "a month with no observations is null — never interpolated");
assert(cycleMonthReturn(closes, "2020-01-15", 40, "2020-03-21", 9) === null, "months after the cycle end produce no cell at all");

// Valuation: gap counted only over days present in both series.
const ref = [day("2020-01-20", 100), day("2020-02-20", 80)];
const g = cycleMonthGap(closes, ref, "2020-01-15", 1, "2024-01-15", 9)!;
assert(g.value === 30, "valuation month: only overlapping days count (104 vs 80 = +30%)");
assert(cycleMonthGap(closes, [], "2020-01-15", 1, "2024-01-15", 9) === null, "no overlapping reference days → null, never guessed");

// ── Zero-neutral classification (founder clarification 1) ────────────────────

assert(signClass(0.2) === "+" && signClass(-0.2) === "-", "clear moves classify by strict sign");
assert(signClass(0) === "0", "a true zero is neutral");
assert(signClass(0.04) === "0" && signClass(-0.04) === "0", "a value that would DISPLAY as 0.0% is neutral — classification can never contradict the rendered number");

// ── Agreement facts (founder clarifications 1 & 3) ───────────────────────────

const mk = (cycleId: number, month: number, raw: number | null, partial = false): CycleMonthCell => ({
  cycleId, month, raw, value: raw == null ? null : Math.round(raw * 10) / 10, partial, from: "x", to: "y",
});
const completed = [
  { id: 2, label: "2012 cycle" },
  { id: 3, label: "2016 cycle" },
  { id: 4, label: "2020 cycle" },
];
const cellsOf = (a: CycleMonthCell[], b: CycleMonthCell[], c: CycleMonthCell[]) =>
  new Map<number, CycleMonthCell[]>([[2, a], [3, b], [4, c]]);

const all3 = agreementFactsFrom(cellsOf([mk(2, 0, 5)], [mk(3, 0, 3)], [mk(4, 0, 8)]), completed);
assert(all3.length === 1 && all3[0].direction === "rose" && all3[0].n === 3, "all three completed cycles strictly rising → one 'rose' fact");
assert(all3[0].text === "In all 3 completed cycles, month 0 rose (+5% in the 2012 cycle, +3% in 2016, +8% in 2020).", "the fact names ALL 3 COMPLETED CYCLES with per-cycle values — never 'all historical cycles'");
assert(agreementFactsFrom(cellsOf([mk(2, 0, 5)], [mk(3, 0, -3)], [mk(4, 0, 8)]), completed).length === 0, "a single dissenting cycle kills the claim");
assert(agreementFactsFrom(cellsOf([mk(2, 0, 5)], [mk(3, 0, 0.04)], [mk(4, 0, 8)]), completed).length === 0, "a display-zero cycle is neutral and blocks the claim");
assert(agreementFactsFrom(cellsOf([mk(2, 0, 5)], [mk(3, 0, 3, true)], [mk(4, 0, 8)]), completed).length === 0, "a PARTIAL month never feeds agreement");
assert(agreementFactsFrom(cellsOf([mk(2, 0, 5)], [mk(3, 0, null)], [mk(4, 0, 8)]), completed).length === 0, "a month unobserved by ANY completed cycle produces no fact, even when the observed ones agree");
assert(agreementFactsFrom(cellsOf([mk(2, 0, -5)], [mk(3, 0, -3)], [mk(4, 0, -8)]), completed)[0].direction === "fell", "all strictly falling → 'fell'");
assert(agreementFactsFrom(new Map(), []).length === 0, "no completed cycles → no facts at all");

// ── Real-data invariants (recomputed every CI run) ───────────────────────────

if (PRICE_ARCHIVE.length > 1000) {
  const spans = cycleSpans();
  assert(spans.length === 4 && spans.filter((s) => s.completed).length === 3, "four observed cycles, exactly three completed");
  assert(spans[0].anchor === "2012-11-28" && spans[3].anchor === "2024-04-20" && !spans[3].completed, "spans anchor at the real halving dates; the 2024 cycle is current");

  const cov = cycleCoverage();
  const by = Object.fromEntries(cov.map((c) => [c.id, c]));
  assert(by[2].completeMonths === 43 && by[2].partialMonth === 43, "2012 cycle: 43 complete months + its stub as partial month 43");
  assert(by[3].completeMonths === 46 && by[3].partialMonth === 46, "2016 cycle: 46 complete months + partial month 46");
  assert(by[4].completeMonths === 47 && by[4].partialMonth === 47, "2020 cycle: 47 complete months + partial month 47 (the horizon month)");
  assert(by[5].completed === false && by[5].partialMonth != null, "the current cycle carries its running month as partial");

  const horizon = gridHorizon();
  assert(horizon === 47, "grid horizon = 47, justified by the OBSERVED record (2020 cycle's partial month 47), not the projected 2028 halving");
  const cells = cycleCells("returns", "market");
  const c5 = cells.get(5)!;
  const pos = currentCyclePosition()!;
  assert(c5[c5.length - 1].month === pos.month && c5[c5.length - 1].partial, "the current cycle's last cell is its running month — no future cells exist");
  assert(pos.projectedNextHalving === "2028-04-17", "the projected next halving labels the position only");

  // Reference coverage per cycle — the honest windows from the discovery.
  assert(by[2].referenceFrom.holders === null, "2012 cycle: realised price is never observed");
  assert(by[2].referenceFrom.miners === 37, "2012 cycle: the mining-cost model window (2016-01-04) enters at month 37 — the cycle's last six months only (discovery correction: not 'none')");
  assert(by[3].referenceFrom.miners === 0, "2016 cycle: mining cost observable from month 0");
  assert(by[4].referenceFrom.holders === 26, "2020 cycle: realised price enters at month 26 — stated, never backfilled");
  assert(by[5].referenceFrom.trend === 0 && by[5].referenceFrom.holders === 0, "current cycle: trend and realised observable from month 0");

  // Null cells keep rows enumerated ("not observed in this cycle").
  const holders = cycleCells("valuation", "holders");
  const h2 = holders.get(2)!;
  assert(h2.length > 40 && h2.every((c) => c.value === null), "an unobserved reference still enumerates the cycle's months as null cells — the row never disappears");

  // Real agreement facts: floor + language.
  const facts = agreementFacts();
  assert(facts.length > 0 && facts.every((f) => f.n === 3 && f.text.startsWith("In all 3 completed cycles, month ")), "real facts exist and every one is phrased over ALL 3 COMPLETED CYCLES");
  assert(facts.every((f) => f.month <= 42), "no fact beyond month 42 — columns with fewer than 3 completed cycles are silent even where survivors agree");
  const fact25 = facts.find((f) => f.month === 25);
  assert(fact25 != null && fact25.direction === "fell", "month 25 fell in all three completed cycles (the discovery's finding, recomputed)");

  // Determinism.
  assert(JSON.stringify(agreementFacts()) === JSON.stringify(agreementFacts()), "the engine is deterministic — identical output on identical inputs");

  // Configuration detail: staleness limited to the month itself.
  const det = monthConfigDetail(4, 20);
  assert(det != null && det.asOf >= monthBoundaries("2020-05-11", 20).from && det.asOf < monthBoundaries("2020-05-11", 20).to, "configuration context comes from a weekly row INSIDE the anchored month — weekly data never fakes daily precision");
  assert(monthConfigDetail(2, 0) === null || (monthConfigDetail(2, 0)!.asOf >= "2012-11-28"), "months before the weekly table's window carry no configuration rather than a stale one");

  // Banned language across everything the engine can emit.
  const emitted = [
    ...facts.map((f) => f.text),
    ...cov.map((c) => c.label),
    ...spans.map((s) => s.label),
  ].join(" \n ");
  const BANNED = [/typical/i, /usually/i, /tends to/i, /expect/i, /forecast/i, /predict/i, /percentile/i, /\brank\b/i, /all historical cycles/i, /\btarget\b/i, /\bsupport\b/i, /\bfloor\b/i, /fair value/i];
  assert(!BANNED.some((re) => re.test(emitted)), "no banned or expectation language in any emitted text");
} else {
  console.log("  note   archive empty in this checkout — real-data assertions skipped");
}

// ── Structure: client-safe core, one calculation path ────────────────────────

const coreSrc = readFileSync("src/lib/cycleSeasonalityCore.ts", "utf8");
assert(!/from "\.\/data\/(priceArchiveData|snapshot)"/.test(coreSrc), "the core imports no data modules (client-safe, ready for the V2B payload split)");
assert(coreSrc.includes('import { round1 } from "./seasonalityCore"'), "rounding comes from the calendar core — one source");
const engineSrc = readFileSync("src/lib/cycleSeasonality.ts", "utf8");
assert(engineSrc.includes("defaultSources") && engineSrc.includes("seriesFor"), "series come from the calendar engine's sources — no second data path");
assert(engineSrc.includes("configurationName"), "configuration naming reuses the FRP helper — no drift");
assert(engineSrc.includes('export * from "./cycleSeasonalityCore"'), "the engine re-exports the core");

console.log(failures === 0 ? "\nAll cycle-seasonality tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
