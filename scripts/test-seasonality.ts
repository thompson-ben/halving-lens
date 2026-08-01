// Deterministic tests for the Seasonality engine (PR-B). Fixture-driven pure
// functions plus real-archive smoke checks: cell generation, both modes,
// per-month statistics, current-month context, filter membership, insights
// with minimum-sample floors and honest ties, observed-window enforcement,
// and null handling throughout.
// Run: npm run test-seasonality

import {
  avgGapPctInMonth,
  buildFilterContext,
  inFilter,
  insightsFrom,
  lastInMonth,
  ma200From,
  MIN_INSIGHT_N,
  monthlyChangeOf,
  monthStatsFrom,
  seasonalityData,
  SERIES_META,
  type MonthStat,
} from "../src/lib/seasonality";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

// ── Fixture: two years of synthetic daily closes with knowable months ────────

const day = (iso: string, value: number) => ({ date: iso, value });
const closes: { date: string; value: number }[] = [];
// 2024: price 100 all Jan, 110 all Feb (Feb return +10%), 99 all Mar (−10%),
// then hold 99 through Dec. 2025 Jan: 108.9 (+10%).
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const monthLevel: Record<string, number> = {};
monthLevel["2023-12"] = 100; // gives Jan 2024 a previous boundary (0% return)
for (let m = 1; m <= 12; m++) monthLevel[`2024-${String(m).padStart(2, "0")}`] = m === 1 ? 100 : m === 2 ? 110 : 99;
monthLevel["2025-01"] = 108.9;
for (const [key, level] of Object.entries(monthLevel)) {
  const [y, m] = [Number(key.slice(0, 4)), Number(key.slice(5, 7))];
  for (let d = 1; d <= daysIn(y, m); d++) closes.push(day(`${key}-${String(d).padStart(2, "0")}`, level));
}

// ── Month primitives on any series ───────────────────────────────────────────

assert(lastInMonth(closes, 2024, 2)?.date === "2024-02-29", "lastInMonth finds the leap-month end");
assert(monthlyChangeOf(closes, 2024, 2) === 10, "monthly change: 110 vs 100 → +10%");
assert(monthlyChangeOf(closes, 2024, 3) === -10, "monthly change: 99 vs 110 → −10%");
assert(monthlyChangeOf(closes, 2023, 12) === null, "the first month has no previous boundary → null");
assert(monthlyChangeOf(closes, 2024, 1) === 0, "a flat month is 0%, not null — zero is a real observation");
assert(monthlyChangeOf(closes, 2025, 6) === null, "a month with no observations → null, never interpolated");

// ── MA200 warm-up ────────────────────────────────────────────────────────────

const ma = ma200From(closes);
assert(ma.length === closes.length - 199, "MA200 emits only once fully warmed up (199-day warm-up consumed)");
assert(ma[0].date === closes[199].date, "the first MA200 point lands on the 200th observed day");
const flat = ma200From(Array.from({ length: 250 }, (_, i) => day(`2024-01-01`.slice(0, 0) + new Date(Date.UTC(2024, 0, 1 + i)).toISOString().slice(0, 10), 50)));
assert(flat.every((p) => p.value === 50), "a flat series has a flat MA200 (no drift from the rolling sum)");

// ── Valuation gaps ───────────────────────────────────────────────────────────

const ref = closes.map((p) => day(p.date, 90)); // reference flat at 90
assert(avgGapPctInMonth(closes, ref, 2024, 3) === 10, "valuation: 99 vs 90 all month → +10% average gap");
const refSparse = [day("2024-03-10", 90)]; // one overlapping day only
assert(avgGapPctInMonth(closes, refSparse, 2024, 3) === 10, "valuation averages only over days present in BOTH series");
assert(avgGapPctInMonth(closes, [], 2024, 3) === null, "no overlapping reference days → null");

// ── Filter membership ────────────────────────────────────────────────────────

const ctx = buildFilterContext(closes, "2025-01-20");
assert(ctx.electionYears.has(2024) && !ctx.electionYears.has(2023), "election years are the fixed US cycle");
assert(
  ctx.midtermYears.has(2010) && ctx.midtermYears.has(2014) && ctx.midtermYears.has(2018) && ctx.midtermYears.has(2022) && !ctx.midtermYears.has(2026),
  "midterm years are the fixed US off-cycle (2010 + 4k), never extended past today",
);
assert([...ctx.midtermYears].every((y) => !ctx.electionYears.has(y)), "midterm and election years are disjoint sets");
assert(inFilter(2022, 6, "midterm", ctx) && !inFilter(2024, 6, "midterm", ctx) && !inFilter(2023, 6, "midterm", ctx), "midterm membership admits whole midterm years only — deterministic, like the election filter");
assert(ctx.postHalvingYears.has(2025) && !ctx.postHalvingYears.has(2024), "post-halving years are the calendar year after each halving");
assert(ctx.currentCycleFrom === "2024-04-19", "the current cycle starts at the latest past halving");
assert(inFilter(2024, 3, "previous-cycles", ctx) && !inFilter(2024, 5, "previous-cycles", ctx), "months before the halving month belong to previous cycles");
assert(inFilter(2024, 5, "current-cycle", ctx), "months from the halving month onward are current-cycle");
assert(inFilter(2024, 2, "above-trend", ctx) === ctx.aboveTrendMonths.has("2024-02"), "trend filters are month-level set membership");
// Above/below trend from the fixture: Feb 2024 close 110; MA200 not yet warmed
// (first MA point is in July) → Feb cannot be above-trend.
assert(!ctx.aboveTrendMonths.has("2024-02"), "months before the MA200 warm-up are never above-trend (no trend exists yet)");
assert(ctx.aboveTrendMonths.has("2025-01"), "Jan 2025 (close 108.9 vs MA200 ≈ 99) is above trend once the trend exists");

// ── Month statistics ─────────────────────────────────────────────────────────

const statVals = [
  { year: 2020, value: 10 }, { year: 2021, value: -5 }, { year: 2022, value: 15 },
  { year: 2023, value: 0 }, { year: 2024, value: 20 },
];
const s = monthStatsFrom(statVals, 7)!;
assert(s.avg === 8 && s.median === 10, "avg and median computed over the observations");
assert(s.positivePct === 60, "share above zero counts strictly positive (0 is not a rise)");
assert(s.best.year === 2024 && s.worst.year === 2021, "best and worst carry their years");
assert(s.n === 5, "n is always carried");
assert(monthStatsFrom([], 7) === null, "no observations → no stats row, never zeros");

// ── Insights: floors, ties, labels ───────────────────────────────────────────

const mk = (month: number, avg: number, positivePct: number, dispersion: number, n: number): MonthStat => ({
  month, label: ["January","February","March","April","May","June","July","August","September","October","November","December"][month - 1],
  avg, median: avg, positivePct, best: { year: 2021, value: avg + 10 }, worst: { year: 2022, value: avg - 10 }, dispersion, n,
});
const below = insightsFrom([mk(1, 9, 70, 5, MIN_INSIGHT_N - 1)], "observed 2011–2025", false);
assert(below.length === 0, "months below the minimum sample generate NO insights");
const tied = insightsFrom([mk(1, 9, 70, 5, 12), mk(2, 9, 60, 4, 12), mk(9, -4, 30, 8, 12)], "observed 2011–2025", false);
assert(tied[0].text.includes("January and February"), "tied strongest months are BOTH named — ties are honest");
assert(tied.every((i) => /n=\d|\d+ observed years/.test(i.text)), "every insight carries its sample size");
assert(tied.every((i) => i.window === "observed 2011–2025"), "every insight carries its window");
const est = insightsFrom([mk(1, 9, 70, 5, 12)], "observed 2016–2025", true);
assert(est.every((i) => i.estimated), "estimated-series insights keep the estimated label");

// ── End-to-end assembly on the fixture ───────────────────────────────────────

const holders = closes.map((p) => day(p.date, 90));
const data = seasonalityData({ mode: "returns", series: "market", filter: "all" }, "2025-01-20", { closes, holders, miners: [] });
assert(data.windowFrom === "2023-12-01" && data.cells.length === 36, "the grid spans first observation year → current year");
const feb = data.cells.find((c) => c.year === 2024 && c.month === 2);
assert(feb?.value === 10 && feb.nature === "observed", "returns cells carry value + nature");
const jan25 = data.cells.find((c) => c.year === 2025 && c.month === 1);
assert(jan25?.partial === true && jan25.value === 10, "the running month is flagged month-to-date");
assert(data.cells.filter((c) => c.year === 2025 && c.month > 1).every((c) => c.value === null), "future months are null");
assert(data.stats.every((st) => st.n >= 1) && !data.stats.some((st) => st.month === 1 && st.n === 2), "stats use COMPLETE months only (partial Jan 2025 excluded)");
assert(data.current.mtdPct === 10 && data.current.rank != null, "current-month context ranks MTD against completed observations");
assert(data.current.sentence?.includes("Historical context, not a prediction.") === true, "the context sentence ends with the standing close");

const val = seasonalityData({ mode: "valuation", series: "holders", filter: "all" }, "2025-01-20", { closes, holders, miners: [] });
const valFeb = val.cells.find((c) => c.year === 2024 && c.month === 2);
assert(valFeb?.value === 22.2, "valuation cells average the market-vs-reference gap (110/90 → +22.2%)");
const valMarket = seasonalityData({ mode: "valuation", series: "market", filter: "all" }, "2025-01-20", { closes, holders, miners: [] });
assert(valMarket.cells.length === 0 && valMarket.insights.length === 0, "valuation vs the market itself yields an explicit empty dataset, never a silent coercion");
const noMiners = seasonalityData({ mode: "returns", series: "miners", filter: "all" }, "2025-01-20", { closes, holders, miners: [] });
assert(noMiners.cells.length === 0 && noMiners.windowFrom === null, "an absent series yields the empty dataset (window null, no fake cells)");

// ── Observed-window enforcement on the real archive ──────────────────────────

if (PRICE_ARCHIVE.length > 0) {
  const real = seasonalityData({ mode: "returns", series: "market", filter: "all" }, PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1].date);
  assert(real.windowFrom === "2010-07-18", "real archive: the window starts at the 2010 floor");
  assert(real.cells.find((c) => c.year === 2010 && c.month === 7)?.value === null, "real archive: the first archived month has no previous boundary → null (July 2010)");
  assert(real.cells.find((c) => c.year === 2010 && c.month === 8)?.value != null, "real archive: August 2010 is the first computable monthly return");
  const sept = real.stats.find((s2) => s2.month === 9);
  assert((sept?.n ?? 0) >= 15, "real archive: September has 15+ observed years");
  assert(real.insights.length > 0 && real.insights.every((i) => i.n >= MIN_INSIGHT_N), "real archive: insights exist and respect the sample floor");
  const realHold = seasonalityData({ mode: "valuation", series: "holders", filter: "all" }, PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1].date);
  if (realHold.windowFrom != null) {
    assert(realHold.windowFrom >= "2022-07-26", "real archive: Realised Price valuation honours its observed floor (2022-07-26)");
    assert(realHold.cells.find((c) => c.year === 2020 && c.month === 6) === undefined || realHold.cells.find((c) => c.year === 2020 && c.month === 6)?.value == null, "real archive: no holder valuations are invented before the floor");
  }
  console.log(`  note   real-archive smoke: window ${real.windowFrom} → ${real.generatedFor}, ${real.cells.filter((c) => c.value != null).length} valued cells`);
} else {
  console.log("  note   real archive empty in this checkout — fixture proofs stand alone");
}

assert(SERIES_META.miners.nature === "estimated" && SERIES_META.holders.nature === "observed", "series natures match the platform's provenance vocabulary");

console.log(failures === 0 ? "\nAll seasonality tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
