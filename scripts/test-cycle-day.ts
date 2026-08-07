// Cycle-day authority tests (Cycle Dashboard V2, CD0). Offline, deterministic.
//
// What CI must always hold true, from first principles:
//   · The cycle day is established from the committed data itself — the last
//     date in the permanent price archive minus the current halving date —
//     never from the wall clock.
//   · Every production consumer of "what day are we on" resolves to that one
//     authority.
//   · The authority's module is clock-free at the source level.
//   · The scorecard carries its stable methodology identifier, and every
//     surface maps score → band/label/tone through the one canonical table.
//   · The two quarantined composites stay unadopted.
//
// The snapshot's legacy clock-derived `todayDayInCycle` scalar is NOT an
// authority here: it appears only in an explicitly diagnostic print (and a
// clock-free pipeline-freshness check that compares two committed dates),
// so CI is never coupled to the deprecated derivation.
//
// Run: npm run test-cycle-day

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  cycleAnchor,
  cycleAnchorFrom,
  cycleDayAt,
  calendarLagDays,
} from "../src/lib/cycleDay";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";
import { HALVINGS, DAYS_PER_CYCLE } from "../src/lib/data/types";
import { SNAPSHOT } from "../src/lib/data/snapshot";
import {
  TODAY_DAY_IN_CYCLE,
  DAYS_TO_NEXT_HALVING,
  CYCLE_PROGRESS_PCT,
  CYCLE_ANCHOR,
  SOURCE,
} from "../src/lib/btcData";
import { cycleSummary, cycleScorecard, SCORECARD_VERSION } from "../src/lib/cycleSummary";
import { snapshotCyclePosition } from "../src/lib/snapshot";
import { currentCyclePosition } from "../src/lib/cycleSeasonality";
import { briefDayLabel } from "../src/lib/brief";
import { atomValues } from "../src/lib/questions/evidence/atoms";
import { upsideScenarios } from "../src/lib/upside";
import { drawdownAnalysis } from "../src/lib/drawdowns";
import { cycleContext } from "../src/lib/cycleZones";
import { pathExplorer } from "../src/lib/pathExplorer";
import { currentMoment } from "../src/lib/similarity";
import { scoreBand, SCORE_BANDS } from "../src/lib/scoreBand";
import { healthColor, healthTag } from "../src/lib/marketHealth";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ""}`);
  }
}

const DAY_MS = 86_400_000;
const dayNum = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;

// ── 1 · First principles ────────────────────────────────────────────────────
console.log("First principles — the authority is the committed archive:");
const anchor = cycleAnchor();
const lastArchive = PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1];
check("asOfDate is the archive's last date", anchor.asOfDate === lastArchive.date, anchor.asOfDate);
check(
  "cycleDay = asOfDate − current halving, in whole days",
  anchor.cycleDay === Math.round(dayNum(anchor.asOfDate) - dayNum(HALVINGS[5])),
  anchor.cycleDay,
);
check("cycleId is 5", anchor.cycleId === 5);
check("halvingDate is the 2024 halving", anchor.halvingDate === HALVINGS[5]);
check("cycleAnchor is memoised (same object)", cycleAnchor() === anchor);

console.log("cycleDayAt fixtures:");
check("halving day itself is day 0", cycleDayAt(HALVINGS[5]) === 0);
check("the day after the halving is day 1", cycleDayAt("2024-04-20") === 1);
check("a year later is day 365", cycleDayAt("2025-04-19") === 365);
check(
  "UTC arithmetic — DST transitions cannot skew the count",
  cycleDayAt("2025-03-11") - cycleDayAt("2025-03-08") === 3,
);
check("prior-cycle halving parameter works", cycleDayAt("2020-05-12", HALVINGS[4]) === 1);
check("dates before the halving go negative, not clamp", cycleDayAt("2024-04-18") === -1);

console.log("cycleAnchorFrom fixtures:");
check("empty archive → null", cycleAnchorFrom([]) === null);
const fx = cycleAnchorFrom([
  { date: "2024-04-19", value: 64000 },
  { date: "2026-01-01", value: 90000 },
]);
check("fixture anchor uses the LAST point's date", fx?.asOfDate === "2026-01-01" && fx?.cycleDay === 622, fx);

console.log("calendarLagDays takes the caller's clock as an argument:");
const anchorMs = dayNum(anchor.asOfDate) * DAY_MS;
check("zero lag on the anchor's own day", calendarLagDays(anchorMs) === 0);
check("one day later → lag 1", calendarLagDays(anchorMs + DAY_MS) === 1);

// ── 2 · Clock-free at the source ────────────────────────────────────────────
console.log("Clock-free discipline (source scan of cycleDay.ts):");
// Comments may DESCRIBE the rule; only code can break it — scan code only.
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const cycleDayCode = stripComments(readFileSync(join(__dirname, "../src/lib/cycleDay.ts"), "utf8"));
check("no Date.now()", !/Date\.now\s*\(/.test(cycleDayCode));
check("no argument-less new Date()", !/new Date\(\s*\)/.test(cycleDayCode));
check("no Math.random()", !/Math\.random/.test(cycleDayCode));

// ── 3 · Every production consumer resolves to the authority ─────────────────
console.log("Consumer resolution — one day, everywhere:");
const day = anchor.cycleDay;
check("btcData TODAY_DAY_IN_CYCLE", TODAY_DAY_IN_CYCLE === day, TODAY_DAY_IN_CYCLE);
check("btcData CYCLE_ANCHOR is the authority's anchor", CYCLE_ANCHOR.asOfDate === anchor.asOfDate);
check("DAYS_TO_NEXT_HALVING derives", DAYS_TO_NEXT_HALVING === DAYS_PER_CYCLE - day);
check("CYCLE_PROGRESS_PCT derives", CYCLE_PROGRESS_PCT === day / DAYS_PER_CYCLE);
check("cycleSummary().cycleDay", cycleSummary().cycleDay === day);
check("snapshotCyclePosition().cycleDay (SoB / weekly briefing)", snapshotCyclePosition().cycleDay === day);
check(
  "cycleSeasonality currentCyclePosition().day — independent archive-derived engine agrees",
  currentCyclePosition()?.day === day,
  currentCyclePosition()?.day,
);
check("briefDayLabel() quotes the authority", briefDayLabel() === `Day ${day} from the 2024 halving`);
check("questions evidence atom cycle.day", atomValues()["cycle.day"] === day.toLocaleString("en-US"));
check("upsideScenarios().cycleDay", upsideScenarios().cycleDay === day);
check("drawdownAnalysis().cycleDay", drawdownAnalysis().cycleDay === day);
check("cycleContext().todayDay", cycleContext().todayDay === day);
check("pathExplorer().cycleDay", pathExplorer().cycleDay === day);
check("similarity currentMoment().day", currentMoment().day === day);

// No module outside the data layer may read the snapshot's legacy scalar.
console.log("No production read of the legacy snapshot scalar:");
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}
const srcFiles = walk(join(__dirname, "../src"));
const scalarReaders = srcFiles.filter(
  (f) => !f.includes("/lib/data/") && /\.todayDayInCycle\b/.test(readFileSync(f, "utf8")),
);
check("`.todayDayInCycle` accessed nowhere outside src/lib/data", scalarReaders.length === 0, scalarReaders);

// ── 4 · Diagnostics (explicitly NOT authoritative) ──────────────────────────
// The legacy scalar is printed for visibility only — no assertion ties CI to
// it. Pipeline freshness is asserted from two COMMITTED dates instead: the
// sync's own fetchedAt must sit within a few days of the archive's last
// close, or the archive has stopped advancing while syncs keep landing.
console.log("Diagnostics:");
console.log(
  `  info  legacy snapshot todayDayInCycle=${SNAPSHOT.todayDayInCycle} vs authority=${day} ` +
    `(diff ${SNAPSHOT.todayDayInCycle - day}; the scalar counts calendar days at sync time — diagnostic only)`,
);
if (SOURCE.fetchedAt) {
  const fetchedDay = Math.floor(Date.parse(SOURCE.fetchedAt) / DAY_MS);
  const lag = fetchedDay - dayNum(anchor.asOfDate);
  check("archive advances with the sync pipeline (committed-date lag ≤ 3 days)", lag >= 0 && lag <= 3, lag);
} else {
  console.log("  info  synthetic snapshot — pipeline freshness check skipped");
}

// ── 5 · Scorecard version ───────────────────────────────────────────────────
console.log("Scorecard methodology identifier:");
check("stable machine-readable format", /^cycle-scorecard-v\d+$/.test(SCORECARD_VERSION), SCORECARD_VERSION);
check("cycleScorecard() carries it", cycleScorecard().version === SCORECARD_VERSION);

// ── 6 · One canonical score→band mapping ────────────────────────────────────
console.log("Canonical score→band mapping:");
check("five bands, ascending mins 0/25/40/55/75", [...SCORE_BANDS].map((b) => b.min).sort((a, b) => a - b).join(",") === "0,25,40,55,75");
check("75 is Cool, 74 is Neutral", scoreBand(75).label === "Cool" && scoreBand(74).label === "Neutral");
check("55 is Neutral, 54 is Warm", scoreBand(55).label === "Neutral" && scoreBand(54).label === "Warm");
check("40 is Warm, 39 is Elevated", scoreBand(40).label === "Warm" && scoreBand(39).label === "Elevated");
check("25 is Elevated, 24 is Euphoric", scoreBand(25).label === "Elevated" && scoreBand(24).label === "Euphoric");
check("healthColor is a view over the mapping", [10, 30, 47, 60, 90].every((s) => healthColor(s) === scoreBand(s).color));
check("healthTag is a view over the mapping", [10, 30, 47, 60, 90].every((s) => healthTag(s) === scoreBand(s).tag));
check(
  "the scorecard's label IS the band's label",
  cycleScorecard().overallLabel === scoreBand(cycleScorecard().overall).label,
);

// Threshold literals must not reappear beside the mapping's consumers.
console.log("No duplicated thresholds (source scans):");
const scorecardCmp = readFileSync(join(__dirname, "../src/components/CycleScorecard.tsx"), "utf8");
check("CycleScorecard.tsx has no `score >= N` literals", !/score\s*>=\s*\d/.test(scorecardCmp));
check("CycleScorecard.tsx derives tones from scoreBand", /scoreBand\(/.test(scorecardCmp));
check("CycleScorecard.tsx derives the zone bar from SCORE_BANDS", /SCORE_BANDS/.test(scorecardCmp) && /ZONES\.map/.test(scorecardCmp));
const marketHealthSrc = readFileSync(join(__dirname, "../src/lib/marketHealth.ts"), "utf8");
check("marketHealth.ts has no `score >= N` literals", !/score\s*>=\s*\d/.test(marketHealthSrc));
const summarySrc = readFileSync(join(__dirname, "../src/lib/cycleSummary.ts"), "utf8");
check(
  "cycleSummary.ts no longer defines band thresholds (imports scoreBand instead)",
  !/score\s*>=\s*75/.test(summarySrc) && /from "\.\/scoreBand"/.test(summarySrc),
);

// ── 7 · Quarantined composites stay unadopted ───────────────────────────────
// Import-statement scan only — comments, tests and docs may MENTION the
// deprecated names without failing this.
console.log("Deprecated composites (import scan):");
const importRe = /import\s+(?:type\s+)?\{[^}]*\b(?:compositeCycleIndex|piCycleStatus)\b[^}]*\}/;
const adopters = srcFiles.filter(
  (f) => !f.endsWith("/lib/metrics.ts") && importRe.test(readFileSync(f, "utf8")),
);
check("no module imports compositeCycleIndex or piCycleStatus", adopters.length === 0, adopters);
const metricsSrc = readFileSync(join(__dirname, "../src/lib/metrics.ts"), "utf8");
check("both composites carry @deprecated", (metricsSrc.match(/@deprecated/g) ?? []).length >= 2);

// ── 8 · The asOf disclosure travels with the day ────────────────────────────
console.log("Cycle-day asOf disclosure (renderer contracts):");
check(
  "LastUpdated exports cycleDayAsOf",
  /export function cycleDayAsOf/.test(readFileSync(join(__dirname, "../src/components/LastUpdated.tsx"), "utf8")),
);
check(
  "homepage hero pairs the day with its asOf",
  /cycleDayAsOf/.test(readFileSync(join(__dirname, "../src/components/CyclePositionHero.tsx"), "utf8")),
);
check(
  "TopBar day pill discloses its asOf",
  /cycleDayAsOf/.test(readFileSync(join(__dirname, "../src/components/TopBar.tsx"), "utf8")),
);

// ── Result ──────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nAll cycle-day authority tests passed.");
