// Cycle Dashboard intelligence payload tests (Cycle Dashboard V2, CD3).
// Offline, deterministic.
//
// The composition layer is proven to COMPOSE and never derive: Metric Watch
// passes through by identity, the What's Moving rail is a filtered view of
// the movers' own material set in the movers' own order, the State of the
// Cycle strip quotes the canonical vocabularies that own each state, and
// no threshold, significance number or market label is declared here.
//
// Run: npm run test-dashboard-intel

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cycleDashboardIntel,
  CYCLE_DASHBOARD_INTEL_VERSION,
} from "../src/lib/cycleDashboardIntel";
import {
  marketMovers,
  moversAsOf,
  metricById,
  consideredMovers,
  MATERIAL_SIGNIFICANCE,
  UNUSUAL_SIGNIFICANCE,
  isQuietWeek,
  weekActivity,
  WEEK_ACTIVITY_LABELS,
} from "../src/lib/marketMovers";
import { weekInFive } from "../src/lib/talkingPoints";
import { metricWatch, stateRunFrom } from "../src/lib/metricWatch";
import { watchStateFor } from "../src/lib/metricWatch/states";
import { ACCUMULATION_BANDS } from "../src/lib/accumulation";
import { bandFor as sentimentBandFor } from "../src/lib/sentiment";
import { etfFlowsRead } from "../src/lib/etfFlows";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ""}`);
  }
}
const iso = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);

// ── 1 · Composition integrity ───────────────────────────────────────────────
console.log("Composition integrity:");
const asOf = moversAsOf();
const intel = cycleDashboardIntel();
check("asOf is the movers' committed anchor (clock-free)", intel.asOf === asOf);
check("payload is cached per anchor (same object)", cycleDashboardIntel() === intel);
check("version pinned and machine-readable", intel.version === CYCLE_DASHBOARD_INTEL_VERSION && /^cycle-dashboard-intel-v\d+$/.test(intel.version));
check("Metric Watch passes through by identity — never cloned or rewritten", intel.watch === metricWatch(asOf));
{
  const before = JSON.stringify(metricWatch(asOf)) + JSON.stringify(marketMovers(7));
  cycleDashboardIntel();
  check("composing mutates neither Metric Watch nor the movers", JSON.stringify(metricWatch(asOf)) + JSON.stringify(marketMovers(7)) === before);
}

// ── 2 · What's Moving rail rules ────────────────────────────────────────────
console.log("What's Moving rail:");
const r7 = marketMovers(7);
check("rows are the movers' own Movement objects (identity)", intel.moving.rows.every((m) => r7.movements.includes(m)));
check("material only — the rail never reaches into steady[]", intel.moving.rows.every((m) => m.significance >= MATERIAL_SIGNIFICANCE));
check("market_health never appears", intel.moving.rows.every((m) => m.metricId !== "market_health"));
check("engine order preserved", (() => {
  const idx = intel.moving.rows.map((m) => r7.movements.indexOf(m));
  return idx.every((v, i) => i === 0 || v > idx[i - 1]);
})());
check("capped at 5", intel.moving.rows.length <= 5);
check("analysed = the movers' set minus the composite", intel.moving.analysed === [...r7.movements, ...r7.steady].filter((m) => m.metricId !== "market_health").length);
check("overflow accounts for every material row not shown", intel.moving.overflow === intel.moving.material - intel.moving.rows.length);

// The dedupe rule, proven across a year of real anchors: when the flagship
// owns a movement/gap story the rail never repeats that metric; fresh
// transitions are never deduped (categorical claim ≠ magnitude claim).
{
  const endDay = Math.floor(Date.parse(`${asOf}T00:00:00Z`) / 86_400_000);
  let movementDays = 0;
  let transitionDays = 0;
  let otwOnlyDays = 0;
  let quietDays = 0;
  let ok = true;
  for (let d = endDay - 364; d <= endDay; d += 1) {
    const x = cycleDashboardIntel(iso(d));
    const ev = x.watch.mostInteresting?.evidence;
    if (ev && (ev.kind === "movement" || ev.kind === "gap_shift")) {
      movementDays++;
      if (x.moving.dedupedMetricId !== ev.metricId) ok = false;
      if (x.moving.rows.some((m) => m.metricId === ev.metricId)) ok = false;
    } else {
      if (x.moving.dedupedMetricId !== null) ok = false;
      if (ev) transitionDays++;
    }
    if (!x.watch.mostInteresting && x.watch.oneToWatch) otwOnlyDays++;
    if (!x.watch.mostInteresting && !x.watch.oneToWatch) quietDays++;
    // scope sentence always consistent with the counts it quotes
    const s = x.moving.scopeLine;
    const expected =
      x.moving.material === 0
        ? `${x.moving.analysed} readings analysed · none moved materially over the last 7 days. All held within their own ordinary range.`
        : x.moving.rows.length === 0
          ? `${x.moving.analysed} readings analysed · every material movement is covered above.`
          : `${x.moving.analysed} readings analysed · ${x.moving.material} moved materially over the last 7 days.`;
    if (s !== expected) ok = false;
  }
  check("dedupe + scope sentence hold on every anchor of the last year", ok);
  check("the movement-dedupe branch is exercised by real data", movementDays > 0, movementDays);
  check("the transition (no-dedupe) branch is exercised by real data", transitionDays > 0, transitionDays);
  check("all three Metric Watch product states occur in the last year", otwOnlyDays > 0 && quietDays > 0, { otwOnlyDays, quietDays });
}

// ── 2c · What Changed? summary (V2.1 Phase 1) ───────────────────────────────
console.log("Week-activity classifier (canonical vocabulary):");
check("empty population is quiet", weekActivity([]) === "quiet" && isQuietWeek([]));
check("all-routine is quiet (59 is below material)", weekActivity([59, 10, 0]) === "quiet" && isQuietWeek([59, 10, 0]));
check("one material, none unusual → mostly_quiet", weekActivity([60, 10]) === "mostly_quiet" && !isQuietWeek([60, 10]));
check("two material, none unusual → mostly_quiet", weekActivity([60, 79]) === "mostly_quiet");
check("one unusual move alone makes the week active", weekActivity([UNUSUAL_SIGNIFICANCE]) === "active");
check("broad material movement (3+) is active without any unusual", weekActivity([60, 61, 62]) === "active");
check("exceptional is active", weekActivity([97]) === "active");
check("three labels, activity words only — no direction, no sentiment", (() => {
  const labels = Object.values(WEEK_ACTIVITY_LABELS);
  return labels.length === 3 && labels.join() === "Quiet week,Mostly quiet,Active week" && !/bull|bear|up|down|good|bad/i.test(labels.join());
})());

console.log("What Changed? summary composition:");
const considered = consideredMovers(r7);
check("summary counts come from the SAME considered population as the rail", intel.summary.analysed === intel.moving.analysed && intel.summary.material === intel.moving.material);
check("material + steady = analysed", intel.summary.material + intel.summary.steady === intel.summary.analysed);
check("activity is the canonical classifier over the considered rows", intel.summary.activity === weekActivity([...considered.movements, ...considered.steady].map((m) => m.significance)));
check("label is quoted from the engine's vocabulary", intel.summary.activityLabel === WEEK_ACTIVITY_LABELS[intel.summary.activity]);
check("needsAttention rows are engine Movement objects in engine order", (() => {
  const idx = intel.summary.needsAttention.map((m) => r7.movements.indexOf(m));
  return idx.every((v, i) => v >= 0 && (i === 0 || v > idx[i - 1]));
})());
check("needsAttention only claims rarity the engine permits (available + unusual/exceptional)", intel.summary.needsAttention.every((m) => m.rarityState === "available" && (m.band === "unusual" || m.band === "exceptional")));
check("alsoMoving is the rest of the material set — nothing dropped, nothing doubled", (() => {
  const ids = [...intel.summary.needsAttention, ...intel.summary.alsoMoving].map((m) => m.metricId).sort();
  const mat = considered.movements.map((m) => m.metricId).sort();
  return ids.join() === mat.join() && intel.summary.unusual === intel.summary.needsAttention.length;
})());
check("the composite never appears in the summary", [...intel.summary.needsAttention, ...intel.summary.alsoMoving].every((m) => m.metricId !== "market_health"));
{
  const s = intel.summary;
  const expected =
    s.material === 0
      ? `${s.analysed} readings analysed · none moved materially over the last 7 days.`
      : `${s.analysed} readings analysed · ${s.material} moved materially · ${s.steady} stayed within their own ordinary range.`;
  check("countsLine is templated from the counts it prints", s.countsLine === expected);
}
{
  // The whole contract, proven across a year of real anchors.
  const endDay = Math.floor(Date.parse(`${asOf}T00:00:00Z`) / 86_400_000);
  let ok = true;
  const seen = { quiet: 0, mostly_quiet: 0, active: 0 };
  for (let d = endDay - 364; d <= endDay; d += 1) {
    const x = cycleDashboardIntel(iso(d));
    seen[x.summary.activity]++;
    if (x.summary.analysed !== x.moving.analysed || x.summary.material !== x.moving.material) ok = false;
    if (x.summary.activityLabel !== WEEK_ACTIVITY_LABELS[x.summary.activity]) ok = false;
    if (x.summary.material === 0 && x.summary.activity !== "quiet") ok = false;
    if (x.summary.unusual > 0 && x.summary.activity !== "active") ok = false;
  }
  check("summary/rail count agreement holds on every anchor of the last year", ok);
  check("the classifier's quiet state occurs in real data", seen.quiet > 0, seen);
  check("a non-quiet state occurs in real data", seen.mostly_quiet + seen.active > 0, seen);
}
check("weekInFive's repointed quietWeek is bit-identical to its old expression", weekInFive().quietWeek === (marketMovers(7).movements.length === 0));

// ── 3 · State of the Cycle strip ────────────────────────────────────────────
console.log("State of the Cycle strip:");
check("three dimensions, fixed order", intel.strip.map((s) => s.id).join(",") === "accumulation,sentiment,etf");
const [acc, sent, etf] = intel.strip;
check("accumulation state is a canonical ACCUMULATION_BANDS label", acc.available && ACCUMULATION_BANDS.some((b) => b.label === acc.stateLabel));
check("sentiment state is the canonical sentiment band label", sent.available && sent.stateLabel != null && ["Extreme fear", "Fear", "Neutral", "Greed", "Extreme greed"].includes(sent.stateLabel));
check("sentiment label agrees with the sentiment engine's own bandFor", (() => {
  const m = metricById("fear_greed")!;
  const run = stateRunFrom(watchStateFor("fear_greed")!, m.series(), asOf)!;
  return sent.stateLabel === sentimentBandFor(run.value).label;
})());
check("since dates come from the Watch's own run computer", (() => {
  const m = metricById("accumulation")!;
  const run = stateRunFrom(watchStateFor("accumulation")!, m.series(), asOf)!;
  return acc.sinceDate === run.sinceDate && acc.asOf === run.asOf;
})());
check("accumulation is honestly weekly", acc.detail != null && /weekly/.test(acc.detail));
check("ETF has no invented band state — streak or flat only", etf.available && etf.stateLabel != null && (/^\d+-day (inflow|outflow) streak$/.test(etf.stateLabel) || etf.stateLabel === "Flat on the latest trading day"));
check("ETF streak quotes the flows engine", (() => {
  const r = etfFlowsRead();
  return r.streak.length === 0 || etf.stateLabel === `${r.streak.length}-day ${r.streak.direction} streak`;
})());
check("ETF window is labelled in trading days, never calendar", etf.detail != null && /trading days/.test(etf.detail));
check("hrefs come from the movers registry", acc.href === metricById("accumulation")!.href && sent.href === metricById("fear_greed")!.href && etf.href === metricById("etf_flows")!.href);
check("banded rows carry their own honest asOf ≤ the anchor", [acc, sent].every((s) => s.asOf != null && s.asOf <= asOf));
// CD4 presentation fields — approved ONLY as exposures of numbers the
// payload already prints inside its composed strings.
check("value is exactly the number printed in detail (banded rows)", [acc, sent].every((s) => s.value != null && s.detail != null && s.detail.startsWith(`${Math.round(s.value)}/100`)));
check("net is exactly the flow printed in the ETF detail", etf.net != null && etf.net === etfFlowsRead().windows.d7.net);
check("fields stay in their lanes (no value for ETF, no net for banded)", etf.value === null && acc.net === null && sent.net === null);

// ── 4 · Quiet support line ──────────────────────────────────────────────────
console.log("Quiet support line:");
{
  const steady = intel.moving.analysed - intel.moving.material;
  const expected =
    steady * 2 > intel.moving.analysed
      ? "Most readings moved within their own ordinary range over the last 7 days."
      : "Quiet days are shown as quiet — HalvingLens does not manufacture a signal.";
  check("the majority claim is only made when the movers' counts support it", intel.watchQuietSupport === expected);
}

// ── 5 · Discipline (source scans) ───────────────────────────────────────────
console.log("Discipline scans:");
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const src = readFileSync(join(__dirname, "../src/lib/cycleDashboardIntel.ts"), "utf8");
const code = stripComments(src);
check("composition layer is clock-free", !/Date\.now\s*\(/.test(code) && !/new Date\(\s*\)/.test(code) && !/Math\.random/.test(code));
check("no significance threshold re-declared (60/80/95 absent from code)", !/\b60\b|\b80\b|\b95\b/.test(code));
check("no band or state vocabulary invented (no bandFor/zoneFor of its own)", !/function bandFor|function zoneFor|GAP_NEAR|PROXIMITY/.test(code));
check("never imports story/intelligence/metricChange engines", !/storyEngine|intelligenceEvents|intelligenceStore|metricChange/.test(src));
check("no scalar called confidence", !/confidence/i.test(code));

// ── 6 · Language — every emitted string across a year of anchors ────────────
console.log("Language sweep:");
{
  const BANNED = [
    /about to/i, /\bwill\b/i, /\blikely\b/i, /\bset to\b/i, /\bsuggests?\b/i, /\bexpect/i,
    /\bforecast/i, /\bbullish\b/i, /\bbearish\b/i, /\bbuy\b/i, /\bsell\b/i, /\btargets?\b/i,
    /\bsupport\b/i, /\bfloor\b/i, /fair value/i, /break-even/i,
  ];
  const texts = new Set<string>();
  const endDay = Math.floor(Date.parse(`${asOf}T00:00:00Z`) / 86_400_000);
  for (let d = endDay - 364; d <= endDay; d += 7) {
    const x = cycleDashboardIntel(iso(d));
    texts.add(x.moving.scopeLine);
    texts.add(x.watchQuietSupport);
    texts.add(`${x.summary.activityLabel} ${x.summary.countsLine}`);
    for (const s of x.strip) texts.add(`${s.label} ${s.stateLabel ?? ""} ${s.detail ?? ""} ${s.unavailableReason ?? ""}`);
  }
  const all = [...texts].join(" | ");
  check(`no forecast/banned vocabulary across ${texts.size} distinct emitted texts`, BANNED.every((re) => !re.test(all)), BANNED.filter((re) => re.test(all)).map(String));
}

// ── Result ──────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nAll dashboard-intel tests passed.");
