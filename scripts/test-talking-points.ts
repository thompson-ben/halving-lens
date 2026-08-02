// Deterministic tests for This Week in Five (SoB 2.0, PR-SB3): the tier
// hierarchy, the diversity invariant, deep-link destinations, the quiet-week
// fallback, evidence discipline and the language safeguards.
// Run: npm run test-talking-points

import { readFileSync } from "node:fs";
import { weekInFive, selectPoints, allCandidates, streakWeeks, MAX_PER_TOPIC, MAX_TIER_A, POINT_COUNT } from "../src/lib/talkingPoints";
import type { Candidate } from "../src/lib/talkingPoints/rules";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

const cand = (tier: "A" | "B" | "C", topic: string, score: number, id: string, metricIds: string[] = []): Candidate =>
  ({ id, rule: "stability", tier, topic: topic as Candidate["topic"], score, headline: id, expanded: id, metricIds, href: "/x", anchor: "#x", evidence: null, state: "new" });

// ── Selection: tier hierarchy and diversity ─────────────────────────────────

{
  // Five strong Tier A movement candidates must NOT fill all five slots.
  const pool = [
    cand("A", "movement", 99, "a1", ["m1"]), cand("A", "movement", 98, "a2", ["m2"]),
    cand("A", "movement", 97, "a3", ["m3"]), cand("A", "movement", 96, "a4", ["m4"]),
    cand("A", "movement", 95, "a5", ["m5"]),
    cand("B", "seasonality", 40, "b1"), cand("C", "continuity", 30, "c1"),
  ];
  const got = selectPoints(pool);
  assert(got.length === 5, "five points are selected when five are available");
  assert(got.filter((c) => c.tier === "A").length <= MAX_TIER_A, `Tier A claims at most ${MAX_TIER_A} slots — metric movements cannot crowd out context`);
  assert(got.some((c) => c.id === "b1") && got.some((c) => c.id === "c1"), "the reserved context and continuity slots are honoured even against stronger Tier A candidates");
  assert(new Set(got.map((c) => c.topic)).size >= 3, "the finished five answer at least three different questions");
}

{
  // Topic cap: no more than MAX_PER_TOPIC while alternatives remain.
  const pool = [
    cand("A", "movement", 99, "a1", ["m1"]), cand("A", "movement", 98, "a2", ["m2"]),
    cand("A", "movement", 97, "a3", ["m3"]),
    cand("B", "cycle", 50, "b1"), cand("B", "seasonality", 45, "b2"), cand("C", "continuity", 40, "c1"),
  ];
  const got = selectPoints(pool);
  assert(got.filter((c) => c.topic === "movement").length <= MAX_PER_TOPIC, `no more than ${MAX_PER_TOPIC} points share one question while alternatives remain`);
}

{
  // Subject identity is never relaxed: two points about the SAME metric
  // never both appear.
  const pool = [
    cand("A", "movement", 99, "a1", ["rhodl"]), cand("A", "movement", 98, "a2", ["rhodl"]),
    cand("B", "cycle", 50, "b1"), cand("C", "continuity", 40, "c1"),
  ];
  const got = selectPoints(pool);
  const rhodl = got.filter((c) => c.metricIds.includes("rhodl"));
  assert(rhodl.length <= 1, "the same metric never appears twice, whatever the rules say about it");
}

{
  // Thin week: fewer candidates than slots → what exists, never invented.
  const got = selectPoints([cand("C", "continuity", 95, "stab")]);
  assert(got.length === 1 && got[0].id === "stab", "a thin week yields only what genuinely exists — no filler");
}

{
  // Editorial order: A before B before C in the finished agenda.
  const got = selectPoints([cand("C", "continuity", 99, "c"), cand("B", "cycle", 98, "b"), cand("A", "movement", 10, "a", ["m"])]);
  assert(got[0].tier === "A" && got[got.length - 1].tier === "C", "the agenda reads developments → interpretation → continuity, not by raw score");
}

assert(streakWeeks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], 7) >= 2, "a monotonic series produces a streak");
assert(streakWeeks([1, 2, 3], 7) === 0, "too little history produces no streak claim");

// ── Real-data behaviour ─────────────────────────────────────────────────────

if (PRICE_ARCHIVE.length > 1000) {
  const w = weekInFive();
  assert(w.points.length > 0 && w.points.length <= POINT_COUNT, `real data yields between 1 and ${POINT_COUNT} points (got ${w.points.length})`);
  assert(w.points.every((p, i) => p.rank === i + 1), "ranks are 1-based and contiguous");
  assert(new Set(w.points.map((p) => p.id)).size === w.points.length, "no duplicate points");
  assert(w.points.filter((p) => p.tier === "A").length <= MAX_TIER_A, "Tier A respects its cap on live data");
  const subjects = w.points.flatMap((p) => p.metricIds);
  assert(new Set(subjects).size === subjects.length, "no metric is the subject of two points on live data");
  assert(new Set(w.points.map((p) => p.topic)).size >= 3, "live agenda answers at least three different questions");
  // Deep links spread across the platform rather than all landing in one place.
  assert(new Set(w.points.map((p) => p.href)).size >= 3, "deep links guide readers to at least three different destinations");
  assert(w.points.every((p) => p.href.startsWith("/")), "every destination is an internal route");
  assert(w.points.every((p) => p.anchor.startsWith("#")), "every point anchors to an act that expands it");
  assert(w.points.every((p) => p.headline.length > 0 && p.expanded.length > p.headline.length), "each point has a short and a longer form");
  assert(w.points.every((p) => p.evidence == null || p.evidence.observations > 0), "any evidence attached is real");
  assert(JSON.stringify(weekInFive()) === JSON.stringify(weekInFive()), "the engine is deterministic");

  // Language safeguards over everything rendered.
  const text = w.points.flatMap((p) => [p.headline, p.expanded]).join(" \n ");
  const BANNED = [/\bwill\b/i, /\bexpect/i, /forecast/i, /predict(?!ion\b)/i, /\bshould\b/i, /\btarget\b/i, /because of/i, /\bcaused?\b/i, /\bdrove\b/i, /surging|plunging|soar|crash/i, /shocking|surprising|unexpected/i];
  assert(!BANNED.some((re) => re.test(text)), "no predictive, causal or hype language in any point");
  assert(!/\bfair value\b|\bprice floor\b/i.test(text), "no banned valuation vocabulary");
}

// ── Structure ───────────────────────────────────────────────────────────────

const idx = readFileSync("src/lib/talkingPoints/index.ts", "utf8");
const rules = readFileSync("src/lib/talkingPoints/rules.ts", "utf8");
assert(!/from "react"|className/.test(idx + rules), "the engine emits no markup — the rail and the expansion consume the same objects");
assert(/Historical context. Not forecasts./.test(idx) || /Historical context. Not forecasts./.test(readFileSync("src/lib/talkingPoints/types.ts", "utf8")), "the standing constraint is recorded in the engine");
const railSrc = readFileSync("src/components/sob/WeekInFive.tsx", "utf8");
assert(railSrc.includes("WeekInFiveExpanded"), "one module renders both the agenda rail and its expansion");
assert(railSrc.includes("scrollIntoView") && railSrc.includes("data-tp-flash"), "selecting an agenda item scrolls to its act and flashes it briefly");
assert(railSrc.includes("focus({ preventScroll: true })"), "keyboard focus follows the deep link");
assert(!railSrc.includes("WeekInFiveRail"), "there is no second agenda renderer — the front page carries the running order (PR-SB4)");
const pageSrc = readFileSync("src/app/state-of-bitcoin/page.tsx", "utf8");
assert((pageSrc.match(/data={five}/g) ?? []).length === 1, "the page passes ONE set of canonical points to ONE renderer — never two sets of conclusions");
assert(pageSrc.includes('id="matters"') && pageSrc.includes('id="movers"') && pageSrc.includes('id="watching"'), "the deep-link destinations exist on the page");

console.log(failures === 0 ? "\nAll talking-points tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
