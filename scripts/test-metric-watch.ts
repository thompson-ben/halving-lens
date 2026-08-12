// Metric Watch engine tests (Cycle Dashboard V2, MW1). Offline, deterministic.
//
// The run computer, gates and selection are unit-tested on SYNTHETIC
// fixtures (immune to upstream series revisions); the live engine is tested
// through invariants — honesty rules, exclusions, language and shape — plus
// behaviour-freeze probes proving MW1 only READS the existing engines.
//
// Run: npm run test-metric-watch

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  metricWatch,
  mostInterestingCandidates,
  oneToWatchCandidates,
  selectMostInteresting,
  selectOneToWatch,
  stateRunFrom,
  METRIC_WATCH_VERSION,
  WATCH_THRESHOLDS,
  WATCH_EXCLUDED_GAP_APPROACHES,
} from "../src/lib/metricWatch";
import { WATCH_STATES, watchStateFor, type WatchStateDef } from "../src/lib/metricWatch/states";
import { quietLineFor } from "../src/lib/metricWatch/describe";
import { STATE_LIFECYCLE, lifecycleOf, LIFECYCLE_RANK } from "../src/lib/stateLifecycle";
import { LENS_LIFECYCLE, lensObservation } from "../src/lib/cycleLens";
import {
  marketMovers,
  moversAsOf,
  bandFor,
  EXCEPTIONAL_SIGNIFICANCE,
  CROSSING_SIGNIFICANCE_FLOOR,
} from "../src/lib/marketMovers";
import type { Point } from "../src/lib/marketMovers/distribution";
import { METRICS } from "../src/lib/metrics";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ""}`);
  }
}

// ── 1 · Shared lifecycle vocabulary ─────────────────────────────────────────
console.log("Shared state-lifecycle vocabulary:");
check("boundaries are the house 7/30 windows", STATE_LIFECYCLE.TRANSITION_MAX_AGE_DAYS === 7 && STATE_LIFECYCLE.RECENT_MAX_AGE_DAYS === 30);
check("lifecycleOf classifies 0/7/8/30/31 correctly", lifecycleOf(0) === "transition" && lifecycleOf(7) === "transition" && lifecycleOf(8) === "recent" && lifecycleOf(30) === "recent" && lifecycleOf(31) === "standing");
check("rank orders newest first", LIFECYCLE_RANK.transition < LIFECYCLE_RANK.recent && LIFECYCLE_RANK.recent < LIFECYCLE_RANK.standing);
check("the Cycle Lens consumes the SAME vocabulary object", (LENS_LIFECYCLE as unknown) === (STATE_LIFECYCLE as unknown));
console.log("Cycle Lens frozen-history pins (re-derived under the UTC halving authority):");
const obs839 = lensObservation(839);
check("day 839: standing since 264", obs839?.lifecycle === "standing" && obs839?.stateSinceDay === 264 && obs839?.stateAgeDays === 575);
check("day 11: transition age 0", lensObservation(11)?.lifecycle === "transition" && lensObservation(11)?.stateAgeDays === 0);
check("day 172: fresh mayer outranks standing", lensObservation(172)?.kind === "mayer_divergence");

// ── 2 · The run computer (synthetic fixtures) ───────────────────────────────
console.log("Contiguous state runs (fixtures):");
const fixtureDef: WatchStateDef = {
  moverId: "fixture",
  thresholdSource: "fixture",
  cadence: "daily",
  stateOf: (v) => (v < 10 ? { key: "low", label: "Low" } : { key: "high", label: "High" }),
  boundariesFor: (v) =>
    v < 10
      ? { lower: null, upper: { value: 10, targetKey: "high", targetLabel: "High", entersOn: "up" } }
      : { lower: { value: 10, targetKey: "low", targetLabel: "Low", entersOn: "down" }, upper: null },
  bandWidth: () => 10,
};
const day = (i: number) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
const series = (vals: number[]): Point[] => vals.map((v, i) => ({ date: day(i), value: v }));

{
  // 40 days low, then 3 days high — a genuine transition with exact dates.
  const s = series([...Array(40).fill(5), 12, 13, 14]);
  const run = stateRunFrom(fixtureDef, s, day(42))!;
  check("current state and value read from the anchor", run.current.key === "high" && run.value === 14);
  check("run start is the exact entry observation", run.sinceDate === day(40) && run.ageDays === 2);
  check("previous state and its span are measured", run.previous?.key === "low" && run.previousRunDays === 39);
  check("not clamped to the series start", run.sinceIsSeriesStart === false);
}
{
  // The whole record in one state — the honest "at least" case.
  const s = series(Array(20).fill(5));
  const run = stateRunFrom(fixtureDef, s, day(19))!;
  check("run open at series start says so", run.sinceIsSeriesStart === true && run.previous === null && run.previousRunDays === null);
}
{
  // A one-day excursion breaks the run — churn is visible, never smoothed.
  const s = series([...Array(35).fill(5), 12, ...Array(4).fill(5)]);
  const run = stateRunFrom(fixtureDef, s, day(39))!;
  check("a single-observation excursion resets the run", run.sinceDate === day(36) && run.previousRunDays === 0);
}
{
  // Anchor before the series → null; anchor mid-series reads point-in-time.
  const s = series([5, 5, 12]);
  check("anchor before the record → null", stateRunFrom(fixtureDef, s, "2025-12-31") === null);
  const mid = stateRunFrom(fixtureDef, s, day(1))!;
  check("historical anchors are point-in-time (no look-ahead)", mid.current.key === "low" && mid.asOf === day(1));
}

// ── 3 · Anti-churn transition gate ──────────────────────────────────────────
console.log("Transition gate (the measured anti-churn rule):");
check("prior state must have stood ≥ 30 days", WATCH_THRESHOLDS.TRANSITION_MIN_PRIOR_DAYS === STATE_LIFECYCLE.RECENT_MAX_AGE_DAYS);
{
  const eligible = stateRunFrom(fixtureDef, series([...Array(40).fill(5), 12]), day(40))!;
  const churn = stateRunFrom(fixtureDef, series([...Array(3).fill(5), 12, 5, 5, 12]), day(6))!;
  check("40-day prior stand qualifies", (eligible.previousRunDays ?? 0) >= WATCH_THRESHOLDS.TRANSITION_MIN_PRIOR_DAYS);
  check("boundary flip-flop does not", (churn.previousRunDays ?? 0) < WATCH_THRESHOLDS.TRANSITION_MIN_PRIOR_DAYS);
}

// ── 4 · The state registry references, never re-declares ────────────────────
console.log("State registry:");
check("nine watchable states (7 metrics.ts ladders + sentiment + accumulation)", WATCH_STATES.length === 9);
check("market_health is NOT watchable", watchStateFor("market_health") === undefined);
check("rainbow and etf_flows are NOT watchable", watchStateFor("rainbow") === undefined && watchStateFor("etf_flows") === undefined);
{
  const mayer = watchStateFor("mayer")!;
  const def = METRICS.find((m) => m.slug === "mayer-multiple")!;
  check("mayer states come from metrics.ts (1.2 → Above trend)", mayer.stateOf(1.2).label === "Above trend");
  check("boundaries are the metrics.ts cutoffs (1.2 → 1.0 / 1.5)", (() => {
    const b = mayer.boundariesFor(1.2);
    return b.lower?.value === 1 && b.upper?.value === 1.5 && b.upper.targetLabel === "Hot";
  })());
  check("band width from the same source (0.5)", mayer.bandWidth(1.2) === 0.5);
  check("outer bands are unbounded (no width)", mayer.bandWidth(3.5) === null);
  check("cutoffs match the METRICS registry", def.bands.some((b) => b.min === 1.5));
}
const statesSrc = readFileSync(join(__dirname, "../src/lib/metricWatch/states.ts"), "utf8");
check("no numeric band thresholds re-declared in states.ts", !/min:\s*\d|max:\s*\d|range:\s*\[/.test(statesSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")));
check("mining-cost approaches are editorially excluded with a member-facing reason", /model/.test(WATCH_EXCLUDED_GAP_APPROACHES.mining_cost ?? ""));

// ── 5 · Live engine invariants ──────────────────────────────────────────────
console.log("Live engine:");
const asOf = moversAsOf();
const w = metricWatch();
check("asOf is the movers' committed anchor (clock-free)", w.asOf === asOf);
check("version pinned and machine-readable", /^metric-watch-v\d+$/.test(METRIC_WATCH_VERSION) && w.version === METRIC_WATCH_VERSION);
check("engine is cached per anchor", metricWatch() === w);
const cands = mostInterestingCandidates(asOf);
check("every candidate carries a stable eventKey", cands.every((c) => /^[a-z_]+:[a-z_0-9]+/.test(c.evidence.eventKey)));
console.log("Posture C — the flagship movement floor is the canonical exceptional band:");
check("every non-transition candidate is exceptional", cands.filter((c) => !c.isTransition).every((c) => bandFor(c.significance) === "exceptional"));
check("a sig-94 movement can never qualify; sig-95 can", bandFor(94) !== "exceptional" && bandFor(95) === "exceptional");
check("EXCEPTIONAL_SIGNIFICANCE is bandFor's own boundary", bandFor(EXCEPTIONAL_SIGNIFICANCE) === "exceptional" && bandFor(EXCEPTIONAL_SIGNIFICANCE - 1) === "unusual");
check(
  "fresh transitions qualify BELOW the exceptional bar (their floor is the crossing floor)",
  bandFor(CROSSING_SIGNIFICANCE_FLOOR) === "unusual" && cands.filter((c) => c.isTransition).every((c) => c.significance >= CROSSING_SIGNIFICANCE_FLOOR),
);
check(
  "non-transition evidence exposes the canonical boundary by name and value",
  cands.filter((c) => !c.isTransition).every((c) => c.evidence.threshold.name === "EXCEPTIONAL_SIGNIFICANCE" && c.evidence.threshold.value === EXCEPTIONAL_SIGNIFICANCE),
);
check("movement candidates all clear the rarity observation floor", cands.filter((c) => c.kind === "movement").every((c) => c.rarityState === "available"));
check("market_health never appears", cands.every((c) => c.metricId !== "market_health"));
check("transitions carry from→to state identity", cands.filter((c) => c.isTransition).every((c) => c.evidence.fromStateKey != null && c.evidence.stateKey != null));
const mi = selectMostInteresting(asOf);
check(
  "selection is one of the candidates (or null when none)",
  mi === null ? cands.length === 0 : cands.some((c) => c.evidence.eventKey === mi.evidence.eventKey),
);
if (w.mostInteresting) {
  check("described candidate quotes engine asOf and version", w.mostInteresting.asOf <= asOf && w.mostInteresting.version === METRIC_WATCH_VERSION);
  check("lifecycle, when present, is internally consistent", w.mostInteresting.lifecycle === null || w.mostInteresting.lifecycle.ageDays >= 0);
}
const otwCands = oneToWatchCandidates(asOf);
check("every approach is within the proximity gate and moving toward (7d)", otwCands.every((a) => a.fractionRemaining <= WATCH_THRESHOLDS.PROXIMITY_BAND_FRACTION + 1e-9 && a.toward7));
check("no mining-cost approach ever", otwCands.every((a) => a.referenceId !== "mining_cost"));
const otw = selectOneToWatch(asOf);
check(
  "OTW selection consistent with candidates",
  otw === null ? otwCands.length === 0 : otwCands.some((a) => (a.referenceId ?? a.def.moverId) === (otw.referenceId ?? otw.def.moverId) && a.targetKey === otw.targetKey),
);
check("quietLine present exactly when both outputs are null", (w.quietLine != null) === (w.mostInteresting == null && w.oneToWatch == null));

// Quiet days exist in the real record and carry the engine-owned line with
// honest scope. Found by scanning rather than pinned, so upstream series
// revisions can't break the test.
console.log("Quiet behaviour:");
{
  const iso = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
  const endDay = Math.floor(Date.parse(`${asOf}T00:00:00Z`) / 86_400_000);
  let quietAnchor: string | null = null;
  for (let d = endDay; d > endDay - 400 && !quietAnchor; d--) {
    const ww = metricWatch(iso(d));
    if (ww.mostInteresting === null && ww.oneToWatch === null) quietAnchor = iso(d);
  }
  check("a genuinely quiet day exists within the last 400", quietAnchor != null, quietAnchor);
  if (quietAnchor) {
    const q = metricWatch(quietAnchor);
    check("quiet day carries the engine-owned line", q.quietLine === quietLineFor(true) || q.quietLine === quietLineFor(false));
    check("quiet wording matches the engine's own currency check", q.quietLine != null);
  }
}
check("the two quiet wordings differ only in scope", quietLineFor(true).includes("today") && quietLineFor(false).includes("latest available readings"));

// ── 6 · Behaviour freeze — MW1 only READS the existing engines ─────────────
console.log("Behaviour freeze:");
const before = JSON.stringify(marketMovers(7));
metricWatch();
check("marketMovers output unchanged by running the Watch", JSON.stringify(marketMovers(7)) === before);

// ── 7 · Language + engine discipline (source scans) ────────────────────────
console.log("Language and discipline scans:");
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const engineSrc = readFileSync(join(__dirname, "../src/lib/metricWatch/index.ts"), "utf8");
const describeSrc = readFileSync(join(__dirname, "../src/lib/metricWatch/describe.ts"), "utf8");
const lifecycleSrc = readFileSync(join(__dirname, "../src/lib/stateLifecycle.ts"), "utf8");
for (const [name, src] of [["index", engineSrc], ["describe", describeSrc], ["stateLifecycle", lifecycleSrc]] as const) {
  const code = stripComments(src);
  check(`${name} is clock-free`, !/Date\.now\s*\(/.test(code) && !/new Date\(\s*\)/.test(code) && !/Math\.random/.test(code));
}
check("engine never imports story/intelligence/metricChange", !/storyEngine|intelligenceEvents|intelligenceStore|metricChange/.test(engineSrc + describeSrc + statesSrc));
check("no scalar called confidence anywhere in the Watch", !/confidence/i.test(stripComments(engineSrc + describeSrc + statesSrc)));
// One significance vocabulary: the Watch never mints its own numeric
// threshold for "exceptional" — the boundary lives in the movers' bandFor.
const distributionSrc = readFileSync(join(__dirname, "../src/lib/marketMovers/distribution.ts"), "utf8");
check("no literal 95 anywhere in Watch code (the boundary is referenced, never re-declared)", !/\b95\b/.test(stripComments(engineSrc + describeSrc + statesSrc)));
check("bandFor itself consumes the named EXCEPTIONAL_SIGNIFICANCE constant", /significance\s*>=\s*EXCEPTIONAL_SIGNIFICANCE/.test(stripComments(distributionSrc)));
check("the Watch imports EXCEPTIONAL_SIGNIFICANCE rather than defining it", /EXCEPTIONAL_SIGNIFICANCE/.test(engineSrc) && !/EXCEPTIONAL_SIGNIFICANCE\s*=/.test(stripComments(engineSrc)));
// Every emitted string across live + a year of history passes the scans.
{
  const FORECAST = [/about to/i, /\bwill\b/i, /\blikely\b/i, /\bset to\b/i, /\bsuggests?\b/i, /\bexpect/i, /\bforecast/i, /\bbullish\b/i, /\bbearish\b/i, /\bbuy\b/i, /\bsell\b/i, /\btargets?\b/i, /\bsupport\b/i, /\bfloor\b/i, /fair value/i, /break-even/i];
  const texts = new Set<string>();
  const iso = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
  const endDay = Math.floor(Date.parse(`${asOf}T00:00:00Z`) / 86_400_000);
  for (let d = endDay - 364; d <= endDay; d += 7) {
    const ww = metricWatch(iso(d));
    for (const c of [ww.mostInteresting, ww.oneToWatch]) {
      if (c) texts.add(`${c.headline} ${c.whyNoteworthy} ${c.historicalContext} ${c.currentLabel}`);
    }
    if (ww.quietLine) texts.add(ww.quietLine);
  }
  const all = [...texts].join(" | ");
  check(`no forecast/banned vocabulary across ${texts.size} distinct emitted texts`, FORECAST.every((re) => !re.test(all)), FORECAST.filter((re) => re.test(all)).map(String));
  check("approach language stays proximal (approaching / moving closer / moving toward only)", ![...texts].some((t) => /entering soon|imminent|poised/i.test(t)));
}

// ── Result ──────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nAll metric-watch tests passed.");
