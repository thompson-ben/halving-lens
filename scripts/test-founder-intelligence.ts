// Deterministic tests for the Founder Intelligence spine (PR1).
// Run: npm run test-founder-intelligence

import { computeWeas, confidenceFrom, compare, goodness, composeFeed, rankRecommendations, type WeasEvent } from "../src/lib/founderIntelligence";
import type { Recommendation } from "../src/lib/founderIntelligence";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "PASS" : "FAIL"}: ${m}`); };

const NOW = Date.parse("2026-07-20T12:00:00Z");
const DAY = 86_400_000;
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
const ev = (name: string, sub: string | null, path: string | null, daysAgo: number): WeasEvent => ({ name, sub, path, created_at: ago(daysAgo) });

// ── WEAS ─────────────────────────────────────────────────────────────────────
const events: WeasEvent[] = [
  ev("email_click", "A", null, 1), // confirmed (this week)
  ev("email_open", "A", null, 1), // supporting; A already confirmed
  ev("page_view", "B", "/state-of-bitcoin", 2), // confirmed (flagship)
  ev("dashboard_view", "C", null, 3), // high
  ev("page_view", "D", "/price", 4), // medium (recognised return, non-flagship)
  ev("email_open", "E", null, 2), // supporting-only → NOT counted
  ev("profile_signin", "F", null, 5), // supporting-only (bare auth) → NOT counted
  ev("email_click", null, null, 1), // anonymous (no sub) → excluded
  ev("email_click", "A", null, 10), // A in the PRIOR week
];
const weas = computeWeas({ events, activeSubscribers: 100 }, NOW);
assert(weas.value === 4, `WEAS counts confirmed+high+medium only (A,B,C,D) → 4 (got ${weas.value})`);
assert(weas.tiers.confirmed === 2 && weas.tiers.high === 1 && weas.tiers.medium === 1, "WEAS tier breakdown correct (2 confirmed, 1 high, 1 medium)");
assert(weas.supportingOnly.emailOpens === 1, "email opens are supporting-only, not counted (E)");
assert(weas.supportingOnly.signIns === 1, "bare sign-in is supporting-only, not counted (F)");
assert(weas.previousValue === 1 && weas.change === 3 && weas.trend === "up", "prior-week comparison works (A last week → +3, up)");
assert(weas.isLowerBound === true, "WEAS flagged as a confirmed lower bound");
assert(weas.rate === 4, "WEAS rate = 4/100 = 4%");
assert(weas.identityCoverage === 0.06, `identity coverage = 6 recognised / 100 active = 0.06 (got ${weas.identityCoverage})`);
// Determinism
assert(JSON.stringify(computeWeas({ events, activeSubscribers: 100 }, NOW)) === JSON.stringify(weas), "WEAS is deterministic (same input → same output)");
// Anonymous-only + opens-only → zero counted
const noneCounted = computeWeas({ events: [ev("email_open", "X", null, 1), ev("page_view", null, "/state-of-bitcoin", 1)], activeSubscribers: 50 }, NOW);
assert(noneCounted.value === 0, "opens-only + anonymous view → WEAS 0 (honest lower bound)");

// ── Confidence framework ─────────────────────────────────────────────────────
assert(confidenceFrom({ sampleSize: 48, periods: 4, coverage: 0.8, observed: true }) === "high", "large, well-covered sample → high");
assert(confidenceFrom({ sampleSize: 2, magnitude: 5, observed: true }) === "insufficient", "big move on tiny sample is NEVER high (→ insufficient)");
assert(confidenceFrom({ sampleSize: 50, observed: false }) === "medium", "modeled data capped at medium");
assert(confidenceFrom({ sampleSize: 50, periods: 1, observed: true }) === "medium", "single period downgrades high→medium (can't confirm a trend)");
assert(confidenceFrom({ sampleSize: 15, coverage: 0.1, observed: true }) === "early", "low coverage downgrades medium→early");
assert(confidenceFrom({ sampleSize: null }) === "insufficient", "no sample → insufficient");

// ── Period comparison ────────────────────────────────────────────────────────
const c = compare(10, 8);
assert(c.trend === "up" && c.absChange === 2 && c.pctChange === 25, "compare(10,8) → up, +2, +25%");
assert(compare(8, 10).trend === "down", "compare(8,10) → down");
assert(compare(5, 5).trend === "flat", "compare(5,5) → flat");
assert(compare(5, null).trend === "unknown", "compare with null → unknown");
assert(goodness("down", false) === "good", "unsubscribes down = good (goodUp=false)");
assert(goodness("up", true) === "good", "WEAS up = good (goodUp=true)");

// ── Recommendation ranking ───────────────────────────────────────────────────
const mk = (id: string, impact: Recommendation["expectedImpact"], conf: Recommendation["confidence"], effort: Recommendation["effort"]): Recommendation => ({
  id, title: id, primaryObjective: "Increase WEAS sustainably", weasRelationship: "increase", module: "test",
  intelligenceKeys: [], observed: "", whyItMatters: "", evidence: "", sampleSize: 100, confidence: conf,
  expectedImpact: impact, effort, guardrails: [], action: "", successMetric: "", measurementWindow: "4 weeks", reviewOn: ago(-28),
});
const ranked = rankRecommendations([mk("low", "low", "high", "low"), mk("hi", "high", "medium", "high"), mk("hi2", "high", "high", "low")]);
assert(ranked[0].id === "hi2" && ranked[1].id === "hi" && ranked[2].id === "low", "recs rank by impact → confidence → effort (hi2, hi, low)");

// ── Composer (Supabase off in tests → honest, valid, empty-but-usable feed) ──
(async () => {
  const feed = await composeFeed(NOW);
  assert(feed.schemaVersion === "1.0", "feed carries schema version 1.0");
  assert(feed.modules.growth?.status === "not_implemented", "missing modules are explicit not_implemented stubs");
  assert(feed.modules.journeys?.status === "not_implemented" && feed.modules.daily_briefs?.status === "not_implemented", "all three Phase-1 modules stubbed in PR1");
  assert(feed.northStar.metric === "weekly_engaged_active_subscribers", "feed always carries the WEAS North Star");
  assert(!!feed.review && typeof feed.review.verdict === "string", "feed produces a Founder Review verdict even with no modules");
  assert(Array.isArray(feed.recommendations) && Array.isArray(feed.risks), "feed shape is valid + consumable now");

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll founder-intelligence tests passed.");
  process.exit(failures ? 1 : 0);
})();
