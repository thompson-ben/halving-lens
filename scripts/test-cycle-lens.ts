// Cycle-lens engine tests (Cycle Dashboard V2, CD1). Offline, deterministic.
//
// Historical cycle days are frozen — the archive is append-only, so every
// fixture pinned to a past day stays stable as new days arrive. Only
// current-day-relative assertions use the CD0 authority's moving anchor.
//
// Run: npm run test-cycle-lens

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LENS_CYCLE_IDS,
  LENS_THRESHOLDS,
  LENS_LIFECYCLE,
  LENS_OBSERVATION_VERSION,
  allLensSeries,
  lensSeries,
  lensSeriesFrom,
  lensAtDay,
  lensObservation,
  mayerAt,
} from "../src/lib/cycleLens";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";
import { HALVINGS } from "../src/lib/data/types";
import { cycleAnchor } from "../src/lib/cycleDay";
import { CYCLES, TODAY_DAY_IN_CYCLE, cyclesAtSameDay } from "../src/lib/btcData";
import { whatHappenedNext } from "../src/lib/cycleIntel";
import { pathExplorer } from "../src/lib/pathExplorer";
import type { OnchainPoint } from "../src/lib/data/types";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ""}`);
  }
}
const close = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// ── 1 · Daily alignment ─────────────────────────────────────────────────────
console.log("Daily alignment:");
for (const id of LENS_CYCLE_IDS) {
  const s = lensSeries(id);
  check(`C${id} day 0 is the halving date itself`, s.points[0].day === 0 && s.points[0].date === HALVINGS[id]);
  const consecutive = s.points.every((p, i) => i === 0 || p.day === s.points[i - 1].day + 1);
  check(`C${id} days increment by exactly 1 (daily-complete, no gaps)`, consecutive);
  const days = new Set(s.points.map((p) => p.day));
  check(`C${id} no duplicate day`, days.size === s.points.length);
}
check("C2 spans days 0..1318 (1319 points)", lensSeries(2).lastDay === 1318 && lensSeries(2).points.length === 1319);
check("C3 spans days 0..1401", lensSeries(3).lastDay === 1401 && lensSeries(3).points.length === 1402);
check("C4 spans days 0..1438", lensSeries(4).lastDay === 1438 && lensSeries(4).points.length === 1439);
const c5 = lensSeries(5);
const lastArchive = PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1];
check("current cycle ends exactly at the latest archive date", c5.points[c5.points.length - 1].date === lastArchive.date);
check("current cycle lastDay IS the CD0 authority's cycle day", c5.lastDay === cycleAnchor().cycleDay);
check("completed cycles end the day before the next halving", lensSeries(2).points[1318].date === "2016-07-08");

// Known day/date fixtures across all four cycles (frozen history).
console.log("Known day/date fixtures:");
const at100 = lensAtDay(100);
const c2at100 = at100.cycles.find((c) => c.cycleId === 2);
check("C2 day 100 = 2013-03-08", c2at100?.reached === true && c2at100.date === "2013-03-08");
const at839 = lensAtDay(839);
const rows839 = Object.fromEntries(at839.cycles.map((c) => [c.cycleId, c]));
check("C3 day 839 = 2018-10-26", (rows839[3] as any).date === "2018-10-26");
check("C4 day 839 = 2022-08-28", (rows839[4] as any).date === "2022-08-28");
check("C5 day 535 = 2025-10-06 (the daily peak)", lensSeries(5).peakDay === 535 && lensSeries(5).points[535].date === "2025-10-06");

// No silent interpolation — a fixture archive with a hole keeps the hole.
console.log("Gap handling (fixture):");
const gapped: OnchainPoint[] = [
  { date: "2012-11-28", value: 100 },
  { date: "2012-11-29", value: 110 },
  // 2012-11-30 missing on purpose
  { date: "2012-12-01", value: 99 },
];
const gapSeries = lensSeriesFrom(gapped, 2)!;
check("missing date yields NO point (no interpolation)", gapSeries.points.length === 3 && !gapSeries.points.some((p) => p.day === 2));
check("days after a gap keep their true day number", gapSeries.points[2].day === 3 && gapSeries.points[2].date === "2012-12-01");
check("empty archive → null series", lensSeriesFrom([], 2) === null);

// Return / multiple / drawdown maths vs hand-computed fixture.
console.log("Aligned-series maths (hand-computed fixture):");
const fx: OnchainPoint[] = [
  { date: "2012-11-28", value: 100 },
  { date: "2012-11-29", value: 110 },
  { date: "2012-11-30", value: 99 },
  { date: "2012-12-01", value: 120 },
];
const fxs = lensSeriesFrom(fx, 2)!;
check("halving price anchors the multiple", fxs.halvingPrice === 100);
check("multiples 1.00 / 1.10 / 0.99 / 1.20", fxs.points.map((p) => p.multiple).every((m, i) => close(m, [1, 1.1, 0.99, 1.2][i])));
check("drawdown 0 at a running high", fxs.points[1].drawdownPct === 0 && fxs.points[3].drawdownPct === 0);
check("drawdown −10% below the 110 high", close(fxs.points[2].drawdownPct, -10));
check("daily-derived peak is the 120 close at day 3", fxs.peakDay === 3 && fxs.peakPrice === 120);

// ── 2 · Equivalent-day parameterisation ─────────────────────────────────────
console.log("Parameterised engines — default is bit-identical to explicit today:");
check("cyclesAtSameDay() === cyclesAtSameDay(TODAY_DAY_IN_CYCLE)", JSON.stringify(cyclesAtSameDay()) === JSON.stringify(cyclesAtSameDay(TODAY_DAY_IN_CYCLE)));
check("whatHappenedNext() === whatHappenedNext(TODAY_DAY_IN_CYCLE)", JSON.stringify(whatHappenedNext()) === JSON.stringify(whatHappenedNext(TODAY_DAY_IN_CYCLE)));
check("pathExplorer() === pathExplorer(TODAY_DAY_IN_CYCLE)", JSON.stringify(pathExplorer()) === JSON.stringify(pathExplorer(TODAY_DAY_IN_CYCLE)));

console.log("Specified-day behaviour:");
check("cyclesAtSameDay(371) snaps to C2's actual peak-day sample", cyclesAtSameDay(371)[0].sample.day === 371);
const whn700 = whatHappenedNext(700);
check("whatHappenedNext(700) reports the requested day", whn700.cycleDay === 700);
check("whatHappenedNext(700) has forward data for all three priors", whn700.rows.every((r) => r.d30 != null && r.d90 != null));
const whn1310 = whatHappenedNext(1310);
check("day near C2's boundary → C2 d90 explicitly null, not shortened", whn1310.rows.find((r) => r.cycleId === 2)?.d90 === null);
const pe700 = pathExplorer(700);
check("pathExplorer(700) explores from day 700", pe700.cycleDay === 700 && pe700.available);

// ── 3 · lensAtDay ───────────────────────────────────────────────────────────
console.log("lensAtDay — day 0:");
const at0 = lensAtDay(0);
check("all four cycles reached day 0 at multiple 1.00, drawdown 0", at0.cycles.every((c) => c.reached && close((c as any).multiple, 1) && (c as any).drawdownFromHighPct === 0));
const c2at0 = at0.cycles.find((c) => c.cycleId === 2) as any;
check("completed cycle forward windows available at day 0", c2at0.forward[30].available && c2at0.forward[90].available);
check("C2 +30d from halving = +9.1% (frozen history)", close(c2at0.forward[30].changePct, 9.1, 0.01));
const c5at0 = at0.cycles.find((c) => c.cycleId === 5) as any;
check("current cycle forward NEVER computed", !c5at0.forward[30].available && !c5at0.forward[90].available);
check("current-cycle forward reason says the future hasn't happened", /has not happened yet/.test(c5at0.forward[30].reason));
check("current cycle daysToEventualPeak is null (not knowable)", c5at0.daysToEventualPeak === null);
check("completed cycle daysToEventualPeak knowable (C2: 371)", c2at0.daysToEventualPeak === 371);

console.log("lensAtDay — current day and beyond:");
const atNow = lensAtDay(cycleAnchor().cycleDay);
const c5now = atNow.cycles.find((c) => c.cycleId === 5) as any;
check("current cycle reached its own current day, dated at the anchor", c5now.reached === true && c5now.date === cycleAnchor().asOfDate);
check("asOfDate travels on the object", atNow.asOfDate === cycleAnchor().asOfDate);
const at1200 = lensAtDay(1200);
const c5at1200 = at1200.cycles.find((c) => c.cycleId === 5) as any;
check("day beyond the current cycle → explicit not-reached with reason", c5at1200.reached === false && /has not reached day 1200/.test(c5at1200.reason));
const at5000 = lensAtDay(5000);
check("day beyond every cycle → all explicit not-reached", at5000.cycles.every((c) => !c.reached));
check("negative day → explicit not-reached", lensAtDay(-1).cycles.every((c) => !c.reached));

console.log("lensAtDay — forward-window honesty near a boundary:");
const at1250 = lensAtDay(1250);
const c2at1250 = at1250.cycles.find((c) => c.cycleId === 2) as any;
check("C2 day 1250: +30d and +60d observable", c2at1250.forward[30].available && c2at1250.forward[60].available);
check("C2 day 1250: +90d (day 1340 > 1318) unavailable, never shortened", c2at1250.forward[90].available === false && /ends at day 1318/.test(c2at1250.forward[90].reason));
check("frozen fixture: C3 day 839 +30d = −38.4%", close((rows839[3] as any).forward[30].changePct, -38.4, 0.01));

// ── 4 · Mayer — one methodology ─────────────────────────────────────────────
console.log("Mayer Multiple:");
check("null before 200 daily observations exist", mayerAt("2010-08-01") === null);
check("null for a date the archive never observed", mayerAt("2009-01-01") === null);
// Identity against the sync-computed snapshot samples, on every sample date.
{
  let n = 0;
  let worst = 0;
  for (const c of CYCLES) {
    const halving = HALVINGS[c.id];
    for (const s of c.samples) {
      const date = new Date(Date.parse(`${halving}T00:00:00Z`) + s.day * 86_400_000).toISOString().slice(0, 10);
      const m = mayerAt(date);
      if (m == null || !Number.isFinite(s.mayer) || s.mayer <= 0) continue;
      n++;
      worst = Math.max(worst, Math.abs(m - s.mayer) / s.mayer);
    }
  }
  check(`lens Mayer ≡ snapshot Mayer on all ${n} sample dates (worst rel diff ≤ 1e-6)`, n > 600 && worst <= 1e-6, worst);
}
// One implementation: the sync and the lens both import the shared sma().
const syncSrc = readFileSync(join(__dirname, "sync.ts"), "utf8");
const lensSrc = readFileSync(join(__dirname, "../src/lib/cycleLens.ts"), "utf8");
check("sync.ts has no local sma implementation", !/function sma\(/.test(syncSrc) && /from "\.\.\/src\/lib\/data\/sma"/.test(syncSrc));
check("cycleLens.ts uses the same shared sma", /from "\.\/data\/sma"/.test(lensSrc));
check("Mayer at C5 day 0 has its full 200-day history (1.35)", close(mayerAt("2024-04-19")!, 1.35, 0.01));

// ── 5 · lensObservation ─────────────────────────────────────────────────────
console.log("lensObservation — pinned to frozen history:");
check("day 0 is quiet — null, not a manufactured finding", lensObservation(0) === null);
check("day 50 is quiet", lensObservation(50) === null);
const obs839 = lensObservation(839);
check("day 839: current cycle clearly weakest of the four", obs839?.kind === "return_extreme" && /weakest return from halving of the four cycles/.test(obs839.sentence));
check("day 839 evidence: rank 4 of 4, margin well past threshold", obs839?.rank === 4 && obs839?.rankedOf === 4 && obs839!.difference >= LENS_THRESHOLDS.EXTREME_MARGIN_RATIO);
check("day 839 evidence carries comparators + median + asOf", obs839!.comparators.length === 3 && Number.isFinite(obs839!.priorMedian) && obs839!.asOfDate === cycleAnchor().asOfDate);
const obs80 = lensObservation(80);
check("day 80: meaningful drawdown divergence selected", obs80?.kind === "drawdown_divergence" && /materially (shallower|deeper) than the prior-cycle median/.test(obs80.sentence));
check("day 80 divergence exceeds its declared threshold", Math.abs(obs80!.difference) >= LENS_THRESHOLDS.DRAWDOWN_DIVERGENCE_PP);
console.log("Threshold boundary (weakest-rank margin, frozen history):");
check("day 107: margin 0.083 below the 0.10 gate → quiet (null)", lensObservation(107) === null);
check("day 113: margin above the gate → rank claim fires", lensObservation(113)?.kind === "return_extreme");

// ── Lifecycle metadata + lifecycle-first selection ──────────────────────────
console.log("Observation lifecycle (frozen history):");
check("methodology version is pinned and machine-readable", /^lens-observation-v\d+$/.test(LENS_OBSERVATION_VERSION));
check("every observation carries the version", obs839!.version === LENS_OBSERVATION_VERSION && obs80!.version === LENS_OBSERVATION_VERSION);
const obs12 = lensObservation(12);
check("day 12: the FIRST day the weakest-return state is true → transition, age 0", obs12?.kind === "return_extreme" && obs12.lifecycle === "transition" && obs12.stateAgeDays === 0 && obs12.stateSinceDay === 12);
check("day 839: the SAME condition 557 days into its run → standing", obs839!.lifecycle === "standing" && obs839!.stateSinceDay === 282 && obs839!.stateAgeDays === 557);
check("stateAgeDays is always day − stateSinceDay", obs839!.stateAgeDays === obs839!.day - obs839!.stateSinceDay);
console.log("New observation legitimately outranks standing context:");
const obs177 = lensObservation(177);
const obs178 = lensObservation(178);
check(
  "day 177: fresh Mayer divergence (age 0) outranks the standing return extreme",
  obs177?.kind === "mayer_divergence" && obs177.lifecycle === "transition" && obs177.stateAgeDays === 0,
);
check(
  "day 178: the standing return extreme resumes once nothing fresher qualifies",
  obs178?.kind === "return_extreme" && obs178.lifecycle === "standing" && obs178.stateSinceDay === 130,
);
console.log("Lifecycle class boundaries (same run, consecutive days):");
const obs289 = lensObservation(289);
const obs290 = lensObservation(290);
check("age 7 is still a transition (day 289)", obs289?.stateAgeDays === 7 && obs289.lifecycle === "transition");
check("age 8 becomes recent (day 290, same run since 282)", obs290?.stateAgeDays === 8 && obs290.lifecycle === "recent" && obs290.stateSinceDay === 282);
const obs160 = lensObservation(160);
const obs161 = lensObservation(161);
check("age 30 is still recent (day 160)", obs160?.stateAgeDays === 30 && obs160.lifecycle === "recent");
check("age 31 becomes standing (day 161, same run since 130)", obs161?.stateAgeDays === 31 && obs161.lifecycle === "standing" && obs161.stateSinceDay === 130);
check("boundaries match the declared constants", LENS_LIFECYCLE.TRANSITION_MAX_AGE_DAYS === 7 && LENS_LIFECYCLE.RECENT_MAX_AGE_DAYS === 30);
console.log("Lifecycle discipline:");
check("a lapsed-and-requalified state starts a NEW run (day 113 since 112, not 12)", lensObservation(113)?.stateSinceDay === 112);
check("standing context is classified, never suppressed (day 839 still returned)", obs839 !== null);
console.log("Unreached / future days:");
check("day 1200 (current cycle unreached) → null", lensObservation(1200) === null);
check("day 5000 → null", lensObservation(5000) === null);
check("negative day → null", lensObservation(-1) === null);

// Language: historical/contextual only — banned vocabulary and no
// percentile/rarity idiom over three prior cycles.
console.log("Language scans:");
const BANNED = [
  /\blikely\b/i, /\bsuggests?\b/i, /\bbullish\b/i, /\bbearish\b/i, /\bbuy\b/i, /\bsell\b/i,
  /historically this means/i, /\bsupport\b/i, /\bfloor\b/i, /fair value/i, /break-even/i, /\btargets?\b/i,
  /\brally\b/i, /\bforecast(?!s\.)\b/i,
];
const RARITY = [/percentile/i, /\brarity\b/i, /\bunusual\b/i, /\bexceptional\b/i, /\bon record\b/i, /\brarest\b/i];
{
  const sentences = new Set<string>();
  for (let d = 0; d <= cycleAnchor().cycleDay; d++) {
    const o = lensObservation(d);
    if (o) sentences.add(o.sentence);
  }
  const all = [...sentences].join(" | ");
  check(`every emitted sentence passes the banned-vocabulary scan (${sentences.size} distinct)`, BANNED.every((re) => !re.test(all)), all);
  check("no percentile/rarity idiom in any emitted sentence", RARITY.every((re) => !re.test(all)), all);
  const codeStrings = (lensSrc.match(/"[^"\n]*"|`[^`\n]*`/g) ?? []).join(" ");
  check("no percentile/rarity idiom anywhere in the engine's strings", RARITY.every((re) => !re.test(codeStrings)));
}

console.log("Engine discipline (source scans):");
// Clock-free: lifecycle derives from Lens history, never a calendar clock.
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const lensCode = stripComments(lensSrc);
check("cycleLens.ts is clock-free (no Date.now / argless new Date / Math.random)", !/Date\.now\s*\(/.test(lensCode) && !/new Date\(\s*\)/.test(lensCode) && !/Math\.random/.test(lensCode));
// No surface/publication policy in the engine: it classifies, surfaces decide.
check("no publication/suppression logic in the engine", !/publish|suppress|cooldown|dedupe/i.test(lensCode));
check("engine imports no intelligence/store/social modules", !/intelligence|Store|social/i.test(lensCode.match(/import[^;]+;/g)?.join(" ") ?? ""));

// ── Result ──────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nAll cycle-lens tests passed.");
