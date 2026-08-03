// Deterministic tests for the Weekly Briefing model (SoB 2.0, PR-SB4): one
// canonical verdict used in both the standfirst and the close, the five-question
// front page mapped to the five acts, the documentary bridges, the single-model
// discipline on the page, and the language safeguards.
// Run: npm run test-weekly-briefing

import { readFileSync } from "node:fs";
import { weeklyBriefing, canonicalVerdict, type CycleRead } from "../src/lib/weeklyBriefing";
import { PRESENTER_RUNNING_ORDER } from "../src/lib/presenterScript";
import type { MoversResult, Movement } from "../src/lib/marketMovers/types";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

const pageSrc = readFileSync("src/app/state-of-bitcoin/page.tsx", "utf8");
const modelSrc = readFileSync("src/lib/weeklyBriefing.ts", "utf8");
const glanceSrc = readFileSync("src/components/sob/WeekAtAGlance.tsx", "utf8");
const railSrc = readFileSync("src/components/sob/WeekInFive.tsx", "utf8");

// ── The canonical verdict ───────────────────────────────────────────────────

const mv = (over: Partial<Movement> = {}): Movement => ({
  metricId: "rhodl", label: "RHODL Ratio", period: 7, unit: "pct", kind: "level",
  direction: "up", movement: 58.3, previous: 1, current: 1.583, significance: 97,
  rarityPercentile: 97, rarityState: "available", observations: 1200, band: "exceptional",
  crossing: null, broaderContext: null, asOf: "2026-08-01", lagDays: 0,
  ...over,
} as Movement);

const result = (movements: Movement[], steady: Movement[] = []): MoversResult =>
  ({ period: 7, asOf: "2026-08-01", movements, steady } as MoversResult);

const cycle = (changed: boolean): CycleRead =>
  ({ changed, headline: "h", badge: "b", detail: "d" });

{
  const v = canonicalVerdict(result([mv()]), cycle(false), false);
  assert(v.includes("RHODL Ratio"), "the verdict names the week's leading reading");
  assert(v.includes("97%") && v.includes("7-day"), "the verdict states rarity against the reading's OWN record");
  assert(v.includes("unchanged"), "an unchanged cycle read is stated, not implied by silence");
  assert(v.endsWith("."), "the verdict is one complete sentence");
}

{
  const v = canonicalVerdict(result([mv({ rarityState: "maturing", rarityPercentile: null })]), cycle(true), false);
  assert(!/larger than/.test(v), "no rarity claim is made when the observation floor is not met");
  assert(v.includes("shifted"), "a changed cycle read is stated plainly");
}

{
  const v = canonicalVerdict(result([]), cycle(false), true);
  assert(/quiet week/i.test(v), "a quiet week says so plainly rather than manufacturing a headline");
  assert(!/nothing happened/i.test(v), "a quiet week is still a reading, not an absence of one");
}

{
  const flow = canonicalVerdict(result([mv({ metricId: "etf_flow", label: "ETF flows", kind: "flow", unit: "usd" })]), cycle(false), false);
  assert(flow.includes("a net "), "flow metrics are described as net flows, never as levels");
}

// ── The front page: five questions, five acts ───────────────────────────────

const brief = weeklyBriefing();

assert(brief.glance.length === 5, "the front page answers exactly five questions");
assert(brief.glance.map((g) => g.act).join() === "1,2,3,4,5", "the five map to acts 1–5 in the page's own order");
assert(new Set(brief.glance.map((g) => g.question)).size === 5, "each row answers a distinct question");
assert(brief.glance.every((g) => g.label.trim().endsWith("?")), "every row is phrased as the question a reader would ask");
assert(brief.glance.every((g) => g.answer.trim().length > 0), "every question has an answer — the first screen is never blank");
assert(brief.glance.every((g) => g.anchor.startsWith("#")), "every row deep-links to the act that expands it");
for (const g of brief.glance) {
  assert(pageSrc.includes(`id="${g.anchor.slice(1)}"`), `act "${g.anchor}" exists on the page`);
}

// The presenter's running order is the same order the reader scrolls.
const acts = brief.glance.map((g) => g.anchor.slice(1));
const presenterActs = PRESENTER_RUNNING_ORDER.map((s) => s.id).filter((id) => id !== "today");
assert(presenterActs.join() === acts.join(), "the presenter running order IS the reading order — no separate script to maintain");
assert(PRESENTER_RUNNING_ORDER.every((s) => pageSrc.includes(`data-sob-section="${s.id}"`)), "every presenter cue points at a section that exists");
{
  const total = PRESENTER_RUNNING_ORDER.reduce((n, s) => n + s.targetSeconds, 0);
  assert(total >= 300 && total <= 480, `the running order targets a 5–8 minute episode (got ${Math.round(total / 6) / 10} min)`);
}

// ── The documentary seams ───────────────────────────────────────────────────

assert(Object.keys(brief.bridges).length === 5, "five bridges: front page into Act 1, then each act into the next");
assert([0, 1, 2, 3, 4].every((n) => (brief.bridges[n] ?? "").trim().length > 0), "no part of the briefing ends without a line into the next");
{
  const bridgeText = Object.values(brief.bridges).join(" ");
  assert(!/\d+(\.\d+)?%/.test(bridgeText), "bridges introduce no new figures — they carry the reader, they do not report");
  assert((pageSrc.match(/<ActBridge/g) ?? []).length === 4, "all four bridges are rendered on the page");
}

// ── One model, one verdict ──────────────────────────────────────────────────

assert(brief.verdict.trim().length > 0 && brief.verdict === weeklyBriefing().verdict, "the verdict is deterministic");
assert(pageSrc.includes("{brief.verdict}"), "the standfirst reads the canonical verdict");
assert(pageSrc.includes("verdict={brief.verdict}"), "the close restates the SAME verdict object — never a second interpretation");
assert((pageSrc.match(/brief\.verdict/g) ?? []).length === 2, "the verdict appears exactly twice: opened with, closed on");
assert((pageSrc.match(/weeklyBriefing\(\)/g) ?? []).length === 1, "the page builds the briefing once");
assert(JSON.stringify(weeklyBriefing()) === JSON.stringify(weeklyBriefing()), "the whole model is deterministic and cached");
assert(
  !(brief.previousWatch && brief.points.points.some((p) => p.rule === "accountability")),
  "last week's watch item is told once — the model decides which act owns it, so Act 5 never repeats an agenda point",
);

// The page must not reach past the model for the slots the model owns.
for (const superseded of ["weekOpening", "weekHeadline", "snapshotSummary", "weeklyConclusion"]) {
  assert(!pageSrc.includes(`${superseded}(`), `the page no longer calls ${superseded}() — the briefing model owns that slot`);
}

// PR-SB4b: no summary sentence on the page may come from a generator other
// than the briefing model. The close renders only what it is handed.
{
  const closeSrc = readFileSync("src/components/sob/WeeklyConclusion.tsx", "utf8");
  assert(!/weekStory|weeklyConclusion|takeaway|nextSignal/.test(closeSrc), "the close consumes no second generator — it renders the canonical verdict it is handed");
  assert(/verdict:\s*string(?!\s*\|)/.test(closeSrc) && !/verdict\?/.test(closeSrc), "the close cannot render without the canonical verdict — the prop is required");
  const storySrc = readFileSync("src/lib/weekStory.ts", "utf8");
  assert(!/export (function|interface) [Ww]eeklyConclusion/.test(storySrc), "the legacy conclusion generator is retired, not merely unplugged");
}

// ── The scroll-synced rail (presentation only) ──────────────────────────────

assert(railSrc.includes("READING_LINE"), "the rail tracks the reader against one reading line — every point takes its turn exactly once");
assert(railSrc.includes("requestAnimationFrame") && railSrc.includes("{ passive: true }"), "tracking is frame-throttled and passive — scrolling is never blocked by the rail");
assert(railSrc.includes('aria-current'), "the active talking point is announced to assistive technology");
assert(railSrc.includes("data-point-id"), "each expansion carries the identity the rail tracks");
assert(!/rarityPercentile|significance|MATERIAL_SIGNIFICANCE/.test(railSrc), "the rail computes nothing — active state is presentation only");
assert(glanceSrc.includes("GlanceRow"), "the front page renders the model's own rows rather than restating them");
assert(!/\d+(\.\d+)?%/.test(glanceSrc.replace(/[\d.]+%\)/g, "")), "the front-page component hard-codes no figures");

// ── Model discipline ────────────────────────────────────────────────────────

assert(!/from "react"|className|<[a-z]+ /.test(modelSrc), "the briefing model emits no markup — a future Broadcast Mode consumes the same object");
assert(/Historical context\. Not forecasts\./.test(modelSrc), "the standing constraint is recorded in the model");

// ── Real-data behaviour and language safeguards ─────────────────────────────

if (PRICE_ARCHIVE.length > 1000) {
  assert(brief.asOf === PRICE_ARCHIVE[PRICE_ARCHIVE.length - 1].date, "the briefing is dated by the observed archive, not by a fetch time");
  assert(brief.points.points.length > 0, "the live agenda carries points");
  assert(brief.movers.movements.length + brief.movers.steady.length > 0, "the live briefing carries readings");
  assert(brief.watchItems.length > 0, "the live briefing carries objective thresholds");

  const text = [brief.verdict, ...brief.glance.map((g) => `${g.label} ${g.answer}`), ...Object.values(brief.bridges)].join(" \n ");
  const BANNED = [/\bwill\b/i, /\bexpect/i, /forecast/i, /predict(?!ion\b)/i, /\bshould\b/i, /because of/i, /\bcaused?\b/i, /\bdrove\b/i, /surging|plunging|soar|crash/i, /shocking|surprising|unexpected/i];
  assert(!BANNED.some((re) => re.test(text)), "no predictive, causal or hype language anywhere in the briefing");
  const HOUSE = [/\bsupport\b/i, /\bfloor\b/i, /\bfair value\b/i, /\bbreak-?even\b/i, /\btarget\b/i];
  assert(!HOUSE.some((re) => re.test(text)), "no banned house vocabulary (support / floor / fair value / break-even / target)");
  assert(!/\b1 points\b/.test(text), "figures are pluralised correctly");
}

console.log(failures === 0 ? "\nAll weekly-briefing tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
