import { detectIntelligenceEvents, type PriorEvent } from "../src/lib/intelligenceEvents";
import type { Story, StorySelection, StoryScoreBreakdown } from "../src/lib/storyEngine";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "PASS" : "FAIL"}: ${m}`); };
const NOW = Date.parse("2026-07-20T12:00:00Z");
const DAY = 86_400_000;

const zeroB: StoryScoreBreakdown = { magnitude: 0, percentChange: 0, distanceFromNorm: 0, thresholdCrossing: 0, rarity: 0, percentileMovement: 0, confidence: 0.7, supportingIndicators: 0, researchSignificance: 0 };

function mkStory(key: string, category: string, rawScore: number, b: Partial<StoryScoreBreakdown> = {}): Story {
  return {
    key, category: category as never, metricId: null, heroCard: "cycle_overlay" as never,
    headline: `${key} headline`, headlineCandidates: [`${key} headline`], deck: `${key} deck`,
    why: [`${key} reason one`, `${key} reason two`], context: "", takeaway: "",
    stats: [{ label: "Stat", value: "42" }], cta: { label: "See", href: "/x" }, link: "/x",
    layout: "stacked", spark: [1, 2, 3], sparkTone: "up",
    score: rawScore, rawScore, breakdown: { ...zeroB, ...b }, diversityNote: null, overridden: false, available: true,
  };
}
const sel = (stories: Story[]): StorySelection => ({ top: stories[0], ranked: [...stories].sort((a, b) => b.rawScore - a.rawScore), generatedAt: new Date(NOW).toISOString() });
const prior = (storyKey: string, kind: string, daysAgo: number, extra: Partial<PriorEvent> = {}): PriorEvent => {
  const d = new Date(NOW - daysAgo * DAY);
  const day = new Date(d.getTime() - (d.getTime() % DAY)).toISOString().slice(0, 10);
  return { dedupeKey: `${day}:${storyKey}:${kind}`, storyKey, eventType: "X", priority: "medium", storyScore: 50, detectedAt: d.toISOString(), status: "new", ...extra };
};

// 1) Threshold crossing → publishable hard-trigger event.
{
  const r = detectIntelligenceEvents({ selection: sel([mkStory("etf_demand", "demand", 0.45, { thresholdCrossing: 1, confidence: 0.85 })]), priorEvents: [], now: NOW });
  assert(r.events.length === 1, "T1: threshold crossing produces one event");
  assert(r.events[0].triggers.some((t) => t.kind === "classification_change"), "T1: hard trigger present");
  assert(r.events[0].priority !== "low", "T1: not low priority");
}
// 2) Low score, no hard trigger, weak signals → suppressed.
{
  const r = detectIntelligenceEvents({ selection: sel([mkStory("cycle_position", "cycle", 0.3, { magnitude: 0.1 })]), priorEvents: [], now: NOW });
  assert(r.events.length === 0, "T2: interesting-but-not-publishable is suppressed");
  assert(r.suppressed.some((s) => s.storyKey === "cycle_position"), "T2: suppression recorded with reason");
}
// 3) Historic rarity (hard) publishes even at a low score.
{
  const r = detectIntelligenceEvents({ selection: sel([mkStory("valuation", "valuation", 0.35, { rarity: 0.9 })]), priorEvents: [], now: NOW });
  assert(r.events.length === 1 && r.events[0].rarity === "high", "T3: rare reading publishes at low score, rarity=high");
}
// 4) Cooldown suppresses a soft repeat; a hard trigger bypasses it.
{
  const soft = mkStory("sentiment", "sentiment", 0.6, { supportingIndicators: 0.8 }); // soft only
  const nearRival = mkStory("cycle_position", "cycle", 0.58); // close runner-up → soft story is NOT dominant
  const rSoft = detectIntelligenceEvents({ selection: sel([soft, nearRival]), priorEvents: [prior("sentiment", "multi_indicator", 1)], now: NOW });
  assert(rSoft.events.length === 0, "T4a: soft repeat within cooldown suppressed (non-dominant)");
  const hard = mkStory("sentiment", "sentiment", 0.6, { thresholdCrossing: 1 }); // regime change
  const rHard = detectIntelligenceEvents({ selection: sel([hard]), priorEvents: [prior("sentiment", "regime_change", 1)], now: NOW });
  assert(rHard.events.length === 1, "T4b: hard regime trigger bypasses cooldown");
}
// 5) Exact duplicate dedupeKey suppressed.
{
  const s = mkStory("etf_demand", "demand", 0.6, { rarity: 0.9 });
  const dupKey = `2026-07-20:etf_demand:historic_rarity`;
  const r = detectIntelligenceEvents({ selection: sel([s]), priorEvents: [prior("etf_demand", "historic_rarity", 0, { dedupeKey: dupKey })], now: NOW });
  assert(r.events.length === 0 && r.suppressed.some((x) => x.reason.includes("duplicate")), "T5: exact duplicate suppressed");
}
// 6) Grouping: two same-category eligible stories → one event, other grouped.
{
  const a = mkStory("etf_demand", "demand", 0.7, { thresholdCrossing: 1 });
  const b = mkStory("etf_secondary", "demand", 0.5, { rarity: 0.9 });
  const r = detectIntelligenceEvents({ selection: sel([a, b]), priorEvents: [], now: NOW });
  assert(r.events.length === 1, "T6: same-category stories collapse to one event");
  assert(r.events[0].grouped.includes("etf_secondary"), "T6: loser recorded as grouped");
}
// 7) Dominance exemption: dominant story publishes despite recent cooldown.
{
  const dom = mkStory("valuation", "valuation", 0.9, { supportingIndicators: 0.8 }); // soft, but dominant
  const other = mkStory("cycle_position", "cycle", 0.3);
  const r = detectIntelligenceEvents({ selection: sel([dom, other]), priorEvents: [prior("valuation", "multi_indicator", 1)], now: NOW });
  assert(r.events.some((e) => e.storyKey === "valuation"), "T7: dominant story bypasses cooldown");
}
// 8) Determinism: identical inputs → identical output.
{
  const build = () => detectIntelligenceEvents({ selection: sel([mkStory("etf_demand", "demand", 0.6, { rarity: 0.9, thresholdCrossing: 1 }), mkStory("valuation", "valuation", 0.4, { rarity: 0.8 })]), priorEvents: [], now: NOW });
  const a = JSON.stringify(build().events);
  const b = JSON.stringify(build().events);
  assert(a === b, "T8: same inputs produce identical events (deterministic)");
}
// 9) Priority: hard trigger + high rarity → high.
{
  const r = detectIntelligenceEvents({ selection: sel([mkStory("etf_demand", "demand", 0.75, { thresholdCrossing: 1, rarity: 0.9 })]), priorEvents: [], now: NOW });
  assert(r.events[0].priority === "high", "T9: hard trigger + high rarity → high priority");
  assert(r.events[0].suggestedPlatforms.includes("YouTube"), "T9: high priority adds YouTube platform");
}

console.log("\nSample event:");
const demo = detectIntelligenceEvents({ selection: sel([mkStory("etf_demand", "demand", 0.94, { thresholdCrossing: 1, rarity: 0.9, supportingIndicators: 0.8, confidence: 0.85 })]), priorEvents: [], now: NOW }).events[0];
console.log(JSON.stringify({ dedupeKey: demo.dedupeKey, type: demo.eventType, score: demo.storyScore, priority: demo.priority, rarity: demo.rarity, confidence: demo.confidence, trigger: demo.primaryTrigger, pack: demo.suggestedPack, headline: demo.suggestedHeadline, platforms: demo.suggestedPlatforms }, null, 1));

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll intelligence-engine tests passed.");
process.exit(failures ? 1 : 0);
