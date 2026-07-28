// Deterministic tests for PR150 — the journey-aware recommendation engine.
// Pure-function and fixture-driven (no Supabase): flagship registry, dynamic
// recommendation copy, lifecycle transitions, and the end-to-end opportunity
// build via computeJourneys with synthetic events.
// Run: npm run test-growth-opportunities

import { readFileSync } from "node:fs";
import {
  FLAGSHIP_PAGES,
  flagshipDestinationsLabel,
  opportunityLifecycle,
  recommendationFor,
  computeJourneys,
  JOURNEY_MIN_IMPRESSIONS,
  prettyPath,
} from "../src/lib/journeyAnalytics";
import { JOURNEY_MAP } from "../src/lib/journeyMap";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

// ── Flagship registry ────────────────────────────────────────────────────────

assert(FLAGSHIP_PAGES.includes("/four-reference-prices"), "Four Reference Prices is a flagship destination");
assert(FLAGSHIP_PAGES.length === 5, "all five flagship experiences are registered");
assert(FLAGSHIP_PAGES.every((p) => prettyPath(p) !== p), "every flagship page has a friendly label");

const destinations = flagshipDestinationsLabel();
assert(FLAGSHIP_PAGES.every((p) => destinations.includes(prettyPath(p))), "recommendation copy names every flagship dynamically");

// ── No hard-coded flagship names remain ──────────────────────────────────────

const engineSrc = readFileSync("src/lib/journeyAnalytics.ts", "utf8");
assert(!engineSrc.includes("State of Bitcoin or Accumulation Index"), "the hard-coded flagship pair is gone from the engine");
assert(engineSrc.includes("journey_next_impression"), "the engine consumes the journey event stream");
assert(engineSrc.includes('from "./journeyMap"'), "the engine knows which pages already carry a journey");
assert(engineSrc.includes("monthlyLost * headroom * flagshipConvFrac"), "the impact model is unchanged");

// ── Lifecycle transitions ────────────────────────────────────────────────────

assert(opportunityLifecycle("/etf", 0) === "not_implemented", "a page without a journey placement is not_implemented");
assert(opportunityLifecycle("/price", 0) === "collecting", "an implemented journey with no data is collecting");
assert(opportunityLifecycle("/price", JOURNEY_MIN_IMPRESSIONS - 1) === "collecting", "below the impression threshold stays collecting");
assert(opportunityLifecycle("/price", JOURNEY_MIN_IMPRESSIONS) === "monitoring", "at the threshold it becomes monitoring");
assert(Object.keys(JOURNEY_MAP).every((p) => opportunityLifecycle(p, 0) !== "not_implemented"), "every journeyMap page is recognised as implemented");

// ── Recommendation copy per lifecycle ────────────────────────────────────────

const rNot = recommendationFor({ path: "/etf", lifecycle: "not_implemented", lowOnward: true, subRatePct: 0, impressions: 0, clicks: 0 });
assert(rNot.includes(destinations), "not_implemented advice names the dynamic flagship set");
const rCollect = recommendationFor({ path: "/price", lifecycle: "collecting", lowOnward: true, subRatePct: 0, impressions: 12, clicks: 1 });
assert(/live on .*hold further changes/.test(rCollect), "collecting advice says the journey shipped and asks for patience");
assert(!rCollect.includes("add clear links"), "an implemented journey is never told to add links");
const rWeak = recommendationFor({ path: "/price", lifecycle: "monitoring", lowOnward: true, subRatePct: 0, impressions: 200, clicks: 2 });
assert(rWeak.includes("rarely followed"), "monitoring flags a weak journey with its CTR");
const rConv = recommendationFor({ path: "/price", lifecycle: "monitoring", lowOnward: false, subRatePct: 0.5, impressions: 200, clicks: 40 });
assert(rConv.includes("subscribe prompt"), "a working journey with weak conversion points at the subscribe gap");
const rGood = recommendationFor({ path: "/price", lifecycle: "monitoring", lowOnward: false, subRatePct: 3, impressions: 200, clicks: 40 });
assert(rGood.includes("performing"), "a working journey with healthy conversion reads as performing");

// ── End-to-end: computeJourneys with synthetic events ────────────────────────

const DAY = 86_400_000;
const now = Date.parse("2026-07-28T12:00:00Z");
const iso = (t: number) => new Date(t).toISOString();
// 40 single-page sessions exiting on /similar-moments (a journeyMap page) and
// 40 on /etf (no journey), plus a few converting sessions so the impact chain
// has a non-zero flagship conversion rate.
const pageViews: { path: string; session_id: string; is_new: boolean; created_at: string; props: null }[] = [];
for (let i = 0; i < 40; i++) pageViews.push({ path: "/similar-moments", session_id: `sm${i}`, is_new: true, created_at: iso(now - 2 * DAY + i * 60000), props: null });
for (let i = 0; i < 40; i++) pageViews.push({ path: "/etf", session_id: `et${i}`, is_new: true, created_at: iso(now - 2 * DAY + i * 60000), props: null });
for (let i = 0; i < 6; i++) {
  pageViews.push({ path: "/state-of-bitcoin", session_id: `cv${i}`, is_new: true, created_at: iso(now - 3 * DAY + i * 60000), props: null });
}
const signups = Array.from({ length: 3 }, (_, i) => ({ session_id: `cv${i}`, path: "/state-of-bitcoin", created_at: iso(now - 3 * DAY + i * 60000 + 30000), props: null }));
const journeyEvents = [
  ...Array.from({ length: 60 }, () => ({ name: "journey_next_impression", props: { from: "/similar-moments" } })),
  ...Array.from({ length: 12 }, () => ({ name: "journey_next_click", props: { from: "/similar-moments" } })),
];

const out = computeJourneys({ pageViews, signups, journeyEvents }, now);
const sim = out.opportunities.find((o) => o.path === "/similar-moments");
const etf = out.opportunities.find((o) => o.path === "/etf");
assert(!!sim && sim.lifecycle === "monitoring", "similar-moments (journey live, 60 impressions) is monitoring");
assert(!!sim && sim.lifecycleNote.includes("Monitoring effectiveness") && sim.lifecycleNote.includes("20%"), "its note reports the 20% follow-through");
assert(!!sim && !sim.recommendation.includes("add clear links"), "it is no longer told to add links");
assert(!!etf && etf.lifecycle === "not_implemented" && etf.recommendation.includes(destinations), "etf (no journey) still gets the add-links advice with dynamic flagships");
assert(!!sim && !!etf && sim.estSubsPerMonth > 0 && etf.estSubsPerMonth > 0, "the impact model still estimates for both");

// Fail-open: no journey events at all → implemented pages read as collecting.
const out2 = computeJourneys({ pageViews, signups }, now);
const sim2 = out2.opportunities.find((o) => o.path === "/similar-moments");
assert(!!sim2 && sim2.lifecycle === "collecting" && sim2.lifecycleNote.includes("collecting evidence"), "absent journey stream degrades to collecting, never a false not_implemented");

console.log(failures === 0 ? "\nAll growth-opportunity tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
