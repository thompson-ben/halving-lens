// Deterministic tests for the Founder Intelligence spine (PR1).
// Run: npm run test-founder-intelligence

import { computeWeas, confidenceFrom, compare, goodness, composeFeed, rankRecommendations, type WeasEvent } from "../src/lib/founderIntelligence";
import { computeConversion, mapGrowth, mapJourney, mapDailyBrief, weekPeriod } from "../src/lib/founderIntelligence";
import type { Recommendation, NorthStar, SharedContext } from "../src/lib/founderIntelligence";

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

// ── PR2: canonical conversion (pure core) ────────────────────────────────────
const convRows: { name: string; session_id: string | null; created_at: string }[] = [];
for (let i = 0; i < 50; i++) convRows.push({ name: "page_view", session_id: `cur-${i}`, created_at: ago(2) }); // 50 sessions this week
convRows.push({ name: "signup", session_id: "cur-0", created_at: ago(2) });
convRows.push({ name: "signup", session_id: "cur-1", created_at: ago(2) }); // 2 converters → 4%
for (let i = 0; i < 30; i++) convRows.push({ name: "page_view", session_id: `prev-${i}`, created_at: ago(9) }); // 30 prior
for (let i = 0; i < 3; i++) convRows.push({ name: "signup", session_id: `prev-${i}`, created_at: ago(9) }); // 3 converters → 10%
convRows.push({ name: "page_view", session_id: null, created_at: ago(2) }); // no session_id → ignored
const conversion = computeConversion(convRows, NOW);
assert(conversion.current.sessions === 50 && conversion.current.converters === 2 && conversion.current.rate === 4, `canonical conversion current = 2/50 = 4% (got ${conversion.current.rate}%)`);
assert(conversion.previous.rate === 10 && conversion.comparison.trend === "down", "conversion falls 10% → 4% week on week (down)");
assert(conversion.available === true, "conversion available when sessions exist");
assert(JSON.stringify(computeConversion(convRows, NOW)) === JSON.stringify(conversion), "conversion is deterministic");

// ── PR2: shared fixtures for the three module mappers ─────────────────────────
const period = weekPeriod(NOW);
const ns: NorthStar = {
  metric: "weekly_engaged_active_subscribers", definitionVersion: "1.0",
  value: 42, rate: 21, previousValue: 30, change: 12, trend: "up",
  confidence: "high", coverage: "42 of 200 subscribers recognised", identityCoverage: 0.6, activeSubscribers: 200,
  tiers: { confirmed: 30, high: 8, medium: 4 }, supportingOnly: { emailOpens: 10, signIns: 5 },
  isLowerBound: true, notes: ["Confirmed lower bound."],
};
const shared: SharedContext = { northStar: ns, conversion };

// mapGrowth — WEAS + canonical conversion + soft-conversion recommendation.
const growth = mapGrowth(
  { dash: { totals: { signups: 500 } }, subs: { active: 200 }, acq: { configured: false, costPerEngagedUser: null, totalSpend: 0 } } as unknown as Parameters<typeof mapGrowth>[0],
  period, NOW, shared,
);
assert(growth.status === "ok", "growth module builds ok from fixtures");
assert(growth.facts.find((f) => f.key === "weas")?.value === 42, "growth surfaces WEAS from shared North Star (42)");
assert(growth.facts.find((f) => f.key === "conversion_rate")?.value === 4 && growth.facts.find((f) => f.key === "conversion_rate")?.trend === "down", "growth conversion fact uses shared canonical conversion (4%, down)");
assert(growth.recommendations.some((r) => r.id === "growth-lift-conversion"), "soft conversion (4% < 5% on 50 sessions) → conversion-lift recommendation");
assert(growth.facts.find((f) => f.key === "cost_per_engaged_subscriber")?.observability === "unavailable", "cost-per-engaged is unavailable when ad spend unconfigured");
assert(growth.operationalWarnings.length > 0, "growth warns that ad spend is unconfigured");

// mapJourney — reuses journeyAnalytics shapes; conversion comes from shared, not j.
const journey = mapJourney(
  {
    configured: true,
    kpis: { sessions: 100, explorerRate: 20, avgJourneyDepth: 2.5 },
    valueDiscovery: { reachedPct: 30, convReachedPct: 12, convNotReachedPct: 3, liftX: 4, reached: 40, sessions: 100 },
    comparisons: [
      { label: "Today", current: {}, previous: {} },
      { label: "Last 7 days", current: { sessions: 100, explorerRate: 20, valueDiscoveryRate: 30, conversionRate: 99, avgDepth: 2.5, lostPct: 62, subscribers: 5 }, previous: { sessions: 90, explorerRate: 18, valueDiscoveryRate: 28, conversionRate: 3, avgDepth: 2.3, lostPct: 65, subscribers: 4 } },
      { label: "Last 30 days", current: {}, previous: {} },
    ],
    insights: [{ tone: "warn", text: "High exit on /price", impact: "~20 lost/wk", confidence: "medium" }],
    opportunities: [{ level: "high", path: "/price", label: "Price page", evidence: "60% exit", estSubsPerMonth: 15, confidence: "high", recommendation: "Add related links" }],
    exitOutcomes: { lostPct: 62 },
  } as unknown as Parameters<typeof mapJourney>[0],
  period, NOW, shared,
);
assert(journey.status === "ok", "journey module builds ok from fixtures");
assert(journey.facts.find((f) => f.key === "conversion_rate")?.value === 4, "journey conversion fact comes from SHARED conversion (4%), not the journey engine's own 99%");
assert(journey.risks.length > 0, "journey flags a risk when lost-visitor rate ≥ 60%");
assert(journey.recommendations.some((r) => r.id.startsWith("journey-opp-")), "journey maps a non-healthy opportunity to a recommendation");
assert(journey.intelligence.some((x) => x.id === "journey-value-lift"), "journey surfaces the value-discovery lift as intelligence");

// mapDailyBrief — confirmed clicks lead; opens supporting-only.
const brief = mapDailyBrief(
  { configured: true, delivered: 1000, uniqueOpens: 400, uniqueClicks: 50, openRate: 40, ctr: 5, ctor: 12.5, byCampaign: [] } as unknown as Parameters<typeof mapDailyBrief>[0],
  period, NOW,
);
assert(brief.status === "ok", "daily-brief module builds ok from fixtures");
assert(brief.facts.find((f) => f.key === "unique_clicks")?.observability === "observed", "confirmed clicks are an observed signal");
assert(brief.facts.find((f) => f.key === "unique_opens")?.observability === "partial", "provider-reported opens are partial (supporting only)");
assert(brief.recommendations.some((r) => r.id === "brief-editorial-style"), "≥20 confirmed clicks → editorial recommendation");
assert(brief.operationalWarnings.length > 0, "daily-brief honestly flags that per-edition attribution awaits PR4");

// ── PR2: traceability invariant (Decisions → Intelligence → Facts) ───────────
for (const m of [growth, journey, brief]) {
  const factKeys = new Set(m.facts.map((f) => f.key));
  const intelIds = new Set(m.intelligence.map((x) => x.id));
  for (const it of m.intelligence) for (const fk of it.factKeys) assert(factKeys.has(fk), `${m.moduleId}: intelligence "${it.id}" cites an existing fact (${fk})`);
  for (const r of m.recommendations) for (const ik of r.intelligenceKeys) assert(intelIds.has(ik), `${m.moduleId}: recommendation "${r.id}" cites an existing intelligence item (${ik})`);
}

// ── Composer (Supabase off in tests → honest, valid, empty-but-usable feed) ──
(async () => {
  const feed = await composeFeed(NOW);
  assert(feed.schemaVersion === "1.0", "feed carries schema version 1.0");
  assert(feed.modules.growth?.status === "unavailable", "with Supabase off, live modules report unavailable (not faked data)");
  assert(feed.modules.lifecycle?.status === "not_implemented" && feed.modules.content?.status === "not_implemented", "Phase-2 modules are explicit not_implemented stubs");
  assert(feed.northStar.metric === "weekly_engaged_active_subscribers", "feed always carries the WEAS North Star");
  assert(!!feed.review && typeof feed.review.verdict === "string", "feed produces a Founder Review verdict even with no modules");
  assert(Array.isArray(feed.recommendations) && Array.isArray(feed.risks), "feed shape is valid + consumable now");

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll founder-intelligence tests passed.");
  process.exit(failures ? 1 : 0);
})();
