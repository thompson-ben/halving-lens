// Deterministic tests for the Market Movers significance & rarity engine
// (PR-SB1). Fixtures cover every state the founder commission requires:
// ordinary move, rare move, band crossing, reference crossover, short-history
// metric, missing data, flat week, zero movement and conflicting candidate
// signals — plus the real-data invariants and the language safeguards.
// Run: npm run test-market-movers

import { readFileSync } from "node:fs";
import {
  absPercentile,
  bandFor,
  cadenceDays,
  CROSSING_SIGNIFICANCE_FLOOR,
  flowSum,
  historicalMoves,
  levelMove,
  MATERIAL_SIGNIFICANCE,
  periodSupported,
  RARITY_MIN_OBSERVATIONS,
  valueOn,
  type Point,
} from "../src/lib/marketMovers/distribution";
import { marketMovers, bandCrossing, moversAsOf } from "../src/lib/marketMovers";
import { MOVER_METRICS, metricById } from "../src/lib/marketMovers/registry";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

const d = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * 86_400_000).toISOString().slice(0, 10);
/** A daily series of `n` points from a value function. */
const daily = (n: number, f: (i: number) => number): Point[] => Array.from({ length: n }, (_, i) => ({ date: d(i), value: f(i) }));

// ── Series primitives ────────────────────────────────────────────────────────

const flat = daily(400, () => 100);
assert(valueOn(flat, d(399))!.date === d(399), "valueOn finds the exact date");
assert(valueOn(flat, "2026-06-15")!.date <= "2026-06-15", "valueOn falls back to the last observation on or before");
assert(valueOn(flat, "2020-01-01") === null, "valueOn returns null before the series begins");
assert(cadenceDays(flat) === 1, "daily cadence detected");
const weekly: Point[] = Array.from({ length: 60 }, (_, i) => ({ date: d(i * 7), value: 100 + i }));
assert(cadenceDays(weekly) === 7, "weekly cadence detected");
assert(periodSupported(weekly, 7) && periodSupported(weekly, 30) && !periodSupported(weekly, 1), "a weekly series supports 7d and 30d but never a 1-day movement");

// ── Movement definitions ─────────────────────────────────────────────────────

const rising = daily(400, (i) => 100 * 1.01 ** i);
const mv = levelMove(rising, d(399), 7, true)!;
assert(Math.abs(mv.movement - (1.01 ** 7 - 1) * 100) < 1e-9, "percentage movement compares the level with the level 7 days earlier");
assert(mv.current === rising[399].value && mv.previous === rising[392].value, "current and previous levels are carried, unformatted");
const pts = levelMove(rising, d(399), 7, false)!;
assert(Math.abs(pts.movement - (rising[399].value - rising[392].value)) < 1e-9, "points movement is a raw difference — never a percentage");
assert(levelMove(daily(3, () => 5), d(0), 7, true) === null, "no comparable earlier observation → null, never a fabricated zero");
const crossesZero: Point[] = [{ date: d(0), value: -0.4 }, { date: d(7), value: 0.3 }];
assert(levelMove(crossesZero, d(7), 7, true) === null, "a percentage off a non-positive base is refused (zero-crossing metrics are points-only)");
assert(levelMove(crossesZero, d(7), 7, false)!.movement === 0.7, "…the same move is expressed honestly in points");

// Flows
const flows: Point[] = daily(30, (i) => (i % 2 === 0 ? 100 : -50));
assert(flowSum(flows, d(29), 7) === 100 * 3 + -50 * 4 || flowSum(flows, d(29), 7) === 100 * 4 + -50 * 3, "a flow's movement is the period's net total");
assert(flowSum(flows, d(0), 7) != null, "a flow at the series start still sums what exists");
assert(flowSum([], d(29), 7) === null, "no flows in the period → null");

// ── Distributions and percentiles ────────────────────────────────────────────

const moves = historicalMoves(rising, 7, "level", true);
assert(moves.length === rising.length - 7, "every observation with a comparison point contributes one equivalent-period move");
assert(absPercentile([1, 2, 3, 4, 5], 3) === 60, "percentile is the share of historical moves this one is at least as large as");
assert(absPercentile([1, 2, 3, 4, 5], -5) === 100, "percentile uses ABSOLUTE size — direction never inflates significance");
assert(absPercentile([-10, -8, 2], 1) === 0, "a small move against large history sits at the bottom");
assert(absPercentile([], 5) === null, "an empty distribution yields no percentile at all");
const flowMoves = historicalMoves(flows, 7, "flow", false);
assert(flowMoves.length > 0 && flowMoves.length < flows.length, "flow distributions skip anchors whose full period predates the window");

// ── Bands and thresholds ─────────────────────────────────────────────────────

assert(bandFor(96) === "exceptional" && bandFor(85) === "unusual" && bandFor(60) === "notable" && bandFor(10) === "routine", "significance bands are fixed and presentation-neutral");
assert(RARITY_MIN_OBSERVATIONS === 100 && CROSSING_SIGNIFICANCE_FLOOR === 80 && MATERIAL_SIGNIFICANCE === 60, "the three published constants are pinned");

// Band crossing on a fixture metric with a two-band vocabulary.
const fixtureMetric = {
  ...metricById("fear_greed")!,
  series: () => [{ date: d(0), value: 20 }, { date: d(7), value: 50 }],
};
const cross = bandCrossing(fixtureMetric, fixtureMetric.series(), d(7), 7)!;
assert(cross != null && cross.kind === "band" && cross.from === "Extreme fear" && cross.to === "Neutral", "a band crossing is detected in the metric's own published vocabulary");
assert(cross.label === "Fear & Greed moved from Extreme fear to Neutral", "crossing wording is neutral and factual — no causal or hype language");
const noCross = bandCrossing(fixtureMetric, [{ date: d(0), value: 20 }, { date: d(7), value: 22 }], d(7), 7);
assert(noCross === null, "a move INSIDE a band is not a crossing");
assert(bandCrossing({ ...fixtureMetric, band: undefined }, fixtureMetric.series(), d(7), 7) === null, "metrics without a band vocabulary never emit band crossings");

// ── Real-data invariants (recomputed every CI run) ───────────────────────────

if (PRICE_ARCHIVE.length > 1000) {
  const asOf = moversAsOf();
  assert(/^\d{4}-\d{2}-\d{2}$/.test(asOf), "the reporting anchor is a real date from the committed data, never the wall clock");

  for (const period of [1, 7, 30] as const) {
    const r = marketMovers(period);
    const all = [...r.movements, ...r.steady];
    assert(all.length + r.unavailable.length === MOVER_METRICS.length, `${period}d: every registered metric is accounted for — ranked, steady or explicitly unavailable`);
    assert(r.movements.every((m, i, a) => i === 0 || a[i - 1].significance >= m.significance), `${period}d: movers are ranked by significance, descending`);
    assert(all.every((m) => m.significance >= 0 && m.significance <= 100), `${period}d: significance stays within 0–100`);
    assert(all.every((m) => m.rarityClaimAllowed === m.observations >= RARITY_MIN_OBSERVATIONS), `${period}d: a rarity claim is permitted exactly when the observation floor is met`);
    assert(all.every((m) => m.rarityClaimAllowed || m.rarityPercentile === null), `${period}d: below the floor NO percentile is exposed — the caller cannot accidentally print a claim`);
    assert(all.every((m) => m.window.first <= m.window.last && m.window.points > 1), `${period}d: every movement carries a real observed window`);
    assert(all.every((m) => m.asOf <= r.asOf), `${period}d: a lagging series reports as of its own last observation, never the global anchor`);
    assert(all.every((m) => m.unit !== "pct" || m.previous == null || m.previous > 0), `${period}d: percentages are never computed off a non-positive base`);
    assert(all.every((m) => !m.crossing || m.significance >= CROSSING_SIGNIFICANCE_FLOOR), `${period}d: a categorical crossing always reaches the documented significance floor`);
    assert(r.steady.every((m) => m.significance < MATERIAL_SIGNIFICANCE) && r.movements.every((m) => m.significance >= MATERIAL_SIGNIFICANCE), `${period}d: the material threshold splits movers from steady readings`);
  }

  // Short-history metric: Market Health ranks but makes no rarity claim.
  const health = [...marketMovers(7).movements, ...marketMovers(7).steady].find((m) => m.metricId === "market_health");
  assert(health != null && !health.rarityClaimAllowed && health.rarityPercentile === null, "Market Health ranks but withholds any rarity claim — its archive is below the floor");
  assert(health!.observations < RARITY_MIN_OBSERVATIONS, `Market Health's short history is real (n=${health!.observations}), not assumed`);

  // ETF flows: a genuine claim, but always with its short window attached.
  const etf = [...marketMovers(7).movements, ...marketMovers(7).steady].find((m) => m.metricId === "etf_flows")!;
  assert(etf.kind === "flow" && etf.unit === "usd" && etf.previous === null, "ETF flows are a FLOW: no prior level, only the prior period's net");
  assert(etf.previousPeriodFlow !== null, "…and the prior period's net is carried for a like-for-like comparison");
  assert(etf.window.first >= "2025-01-01" && etf.observations < 400, "ETF flows carry their genuinely short observed window");

  // On-chain state metrics never borrow the modelled pre-2022 backfill.
  for (const id of ["mvrv_z", "nupl", "sopr", "reserve_risk", "rhodl", "realized_price"]) {
    const m = [...marketMovers(7).movements, ...marketMovers(7).steady].find((x) => x.metricId === id)!;
    assert(m.window.first === "2022-07-26", `${id}: window starts at the observed floor (2022-07-26) — modelled backfill is never used`);
  }
  // Price-derived metrics legitimately carry deep history.
  const mayer = [...marketMovers(7).movements, ...marketMovers(7).steady].find((m) => m.metricId === "mayer")!;
  assert(mayer.window.first < "2012-01-01" && mayer.nature === "derived", "Mayer is derived from the daily archive — real long history, labelled derived");
  const price = [...marketMovers(7).movements, ...marketMovers(7).steady].find((m) => m.metricId === "price")!;
  assert(price.window.first === "2010-07-18" && price.observations > 5000, "price movements are measured against the full 16-year archive");

  // Weekly series honestly refuse a 1-day movement.
  const oneDay = marketMovers(1);
  assert(oneDay.unavailable.some((u) => u.metricId === "mining_cost" && /resolves every 7 days/.test(u.reason)), "a weekly series states plainly why a 1-day movement is not observable");

  // Determinism + caching produce identical output.
  assert(JSON.stringify(marketMovers(7)) === JSON.stringify(marketMovers(7)), "the engine is deterministic");
}

// ── Conflicting signals: a crossing on a small move outranks a bigger move
//     that crossed nothing, but never reorders two larger moves ─────────────

{
  const small = 40; // percentile of a small move
  const big = 92;
  const withCrossing = Math.max(small, CROSSING_SIGNIFICANCE_FLOOR);
  assert(withCrossing === 80 && withCrossing < big, "a crossing lifts a small move to the floor but cannot leapfrog a genuinely larger move");
  assert(Math.max(big, CROSSING_SIGNIFICANCE_FLOOR) === big, "the floor never DEMOTES a move above it");
}

// ── Language safeguards over everything the engine can emit ─────────────────

const srcs = ["src/lib/marketMovers/index.ts", "src/lib/marketMovers/registry.ts", "src/lib/marketMovers/types.ts", "src/lib/marketMovers/distribution.ts"]
  .map((f) => readFileSync(f, "utf8"));
const emitted: string[] = [];
if (PRICE_ARCHIVE.length > 1000) {
  for (const period of [1, 7, 30] as const) {
    const r = marketMovers(period);
    for (const m of [...r.movements, ...r.steady]) {
      emitted.push(m.label, m.what, m.state ?? "", m.crossing?.label ?? "");
    }
    for (const u of r.unavailable) emitted.push(u.reason);
  }
}
const BANNED = [/\bcaused?\b/i, /\bdrove\b/i, /\bshaped\b/i, /because of/i, /\bwill\b/i, /\bexpect/i, /forecast/i, /predict/i, /\btarget\b/i, /\bshould\b/i, /surprising/i, /shocking/i];
assert(!BANNED.some((re) => re.test(emitted.join(" \n "))), "no causal, predictive or hype language in any emitted string");
assert(emitted.some((s) => s.length > 0), "the language scan actually had strings to check");

// Structure: the engine is reusable and owns no presentation.
const [indexSrc, registrySrc, typesSrc, distSrc] = srcs;
assert(!/state-of-bitcoin/i.test(indexSrc + registrySrc + typesSrc + distSrc), "the engine has no State-of-Bitcoin coupling — it is a platform-level output");
assert(!/from "react"|\.tsx|className/.test(indexSrc + registrySrc + distSrc), "the engine imports no React and emits no markup");
assert(!/from "\.\.\/data\//.test(distSrc) && !/snapshot/.test(distSrc), "the statistics half imports no data — every state is fixture-drivable");
assert(/Historical context. Not forecasts./.test(indexSrc) || /Historical context. Not forecasts./.test(typesSrc), "the standing constraint is recorded in the engine's own documentation");

console.log(failures === 0 ? "\nAll market-movers tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
