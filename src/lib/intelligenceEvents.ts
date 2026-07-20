// The Intelligence Events Engine — HalvingLens' significance layer.
//
// This is NOT a notification feature. It is the platform's single source of
// truth for "did something genuinely publishable happen?", sitting between the
// Story Engine and every consumer:
//
//     data refresh → Story Engine → Intelligence Events Engine → consumers
//
// The Story Engine (storyEngine.ts) already answers "what is today's strongest
// story?" — scoring, history-aware diversity, editorial headlines, layouts. This
// engine reuses that output verbatim and answers the DIFFERENT question:
//
//     "Is this story significant enough to surface — and to whom?"
//
// It optimises for signal over noise, never for frequency. A high score alone is
// never enough: an event must clear editorial trigger + eligibility gates, then
// survive cooldown, duplicate suppression, grouping and dominance rules. The
// result is a channel-AGNOSTIC IntelligenceEvent that any consumer (Founder
// Alerts today; Daily Brief, Weekly, Social, YouTube, Pro, API, Enterprise
// tomorrow) can read without re-implementing any significance logic.
//
// HARD RULES (shared with the Story Engine): deterministic from the inputs
// (selection + persisted event history + `now`), no LLM, no network in this pure
// core, no Math.random / new Date() for logic. Same inputs → same events. Never
// fabricate significance — if a signal is unavailable, the event simply doesn't
// fire.

import type { Story, StorySelection, StoryScoreBreakdown } from "./storyEngine";

// ── Public model ───────────────────────────────────────────────────────────

export type EventPriority = "high" | "medium" | "low";
export type EventStatus = "new" | "posted" | "snoozed" | "dismissed";
export type EventConfidence = "high" | "medium" | "low";
export type EventRarity = "high" | "medium" | "low";

// The editorial triggers a provider's story can fire. Metric-agnostic: a future
// provider inherits all of these by populating the Story breakdown the Story
// Engine already computes. "Hard" triggers are publishable on their own; "soft"
// triggers need a strong score behind them.
export type TriggerKind =
  | "threshold_crossing" // crossed a band / classification boundary (hard)
  | "classification_change" // band label changed (hard)
  | "regime_change" // moved into/out of a defining regime, e.g. Fear (hard)
  | "historic_rarity" // reading is historically rare (hard)
  | "major_move_7d" // large 7-day movement (soft)
  | "percentile_shift" // historical percentile moved sharply (soft)
  | "score_dominance" // this story dominates the field today (soft)
  | "multi_indicator"; // several sub-indicators confirm the same narrative (soft)

const HARD_TRIGGERS = new Set<TriggerKind>(["threshold_crossing", "classification_change", "regime_change", "historic_rarity"]);

export interface IntelligenceTrigger {
  kind: TriggerKind;
  reason: string; // human-readable, e.g. "7-day acceleration exceeded threshold"
  strength: number; // 0..1
}

export interface IntelligenceEvent {
  // Deterministic identity — the same story + day + primary trigger always maps
  // to the same key, so re-running detection never creates duplicates. The
  // sequential human id (EVT-YYYY-NNNNNN) is assigned by the persistence layer.
  dedupeKey: string;
  displayId: string | null; // filled in on persist
  detectedAt: string;
  eventType: string; // editorial family, e.g. "ETF Flows"
  provider: string; // story key, e.g. "etf_demand"
  storyKey: string;
  storyScore: number; // 0..100
  scoreChange: number | null; // vs the last event for this story, if known
  confidence: EventConfidence;
  rarity: EventRarity;
  triggers: IntelligenceTrigger[];
  primaryTrigger: string; // reason of the strongest trigger
  triggerReason: string; // one-line editorial explanation of why it fired
  summary: string; // what changed, in plain English
  suggestedHeadline: string;
  suggestedPack: string; // a PackId the Social Engine can generate
  suggestedLayout: string; // HeroLayout
  suggestedPlatforms: string[];
  supportingIndicators: string[];
  previousValue: string | null;
  currentValue: string | null;
  priority: EventPriority;
  breakdown: StoryScoreBreakdown; // full score transparency
  cta: { label: string; href: string };
  status: EventStatus; // overlaid from persistence; "new" by default
  createdCreative: boolean; // a social creative has been generated for this event
  linkedSocialPost: number | null; // social_posts.id once a creative is published
  grouped: string[]; // storyKeys of same-narrative candidates folded into this event
}

// The minimal shape of a persisted event the detector needs for cooldown /
// duplicate suppression. The store (intelligenceStore.ts) returns these.
export interface PriorEvent {
  dedupeKey: string;
  storyKey: string;
  eventType: string;
  priority: EventPriority;
  storyScore: number;
  detectedAt: string; // ISO
  status: EventStatus;
}

export interface DetectInput {
  selection: StorySelection;
  priorEvents: PriorEvent[];
  now: number;
}

export interface DetectResult {
  events: IntelligenceEvent[]; // publishable, ranked by score (best first)
  considered: number; // stories evaluated
  suppressed: { storyKey: string; reason: string }[]; // transparency on what was held back
}

// ── Tuning (one place, so behaviour is auditable) ────────────────────────────
const COOLDOWN_DAYS = 3; // same story can't re-alert within this window…
const DOMINANCE_MARGIN = 0.18; // …unless it dominates the field by this raw-score margin
const SOFT_SCORE_FLOOR = 55; // a soft-only story needs at least this score (0..100) to publish
const MEANINGFUL_TRIGGER_FLOOR = 0.5; // a trigger below this strength doesn't count as meaningful
const MAX_EVENTS = 5; // never flood — keep the queue to the best few

// Category → editorial family label + the Social Engine pack that expresses it.
const CATEGORY_META: Record<string, { label: string; pack: string }> = {
  demand: { label: "ETF Flows", pack: "etf" },
  valuation: { label: "Accumulation", pack: "accumulation" },
  sentiment: { label: "Sentiment", pack: "chart_week" },
  volatility: { label: "Volatility", pack: "chart_week" },
  health: { label: "Market Health", pack: "market_health" },
  similarity: { label: "Similar Moments", pack: "similar" },
  cycle: { label: "Cycle Position", pack: "cycles" },
};

const toScore100 = (raw: number): number => Math.round(raw * 100);
const confidenceFrom = (b: StoryScoreBreakdown): EventConfidence => (b.confidence >= 0.8 ? "high" : b.confidence >= 0.55 ? "medium" : "low");
const rarityFrom = (b: StoryScoreBreakdown): EventRarity => (b.rarity >= 0.75 ? "high" : b.rarity >= 0.45 ? "medium" : "low");
const epochDay = (ts: number): number => Math.floor(ts / 86_400_000);

// ── Trigger detection — derived entirely from the Story the engine produced ──
function triggersFor(story: Story, isDominant: boolean): IntelligenceTrigger[] {
  const b = story.breakdown;
  const out: IntelligenceTrigger[] = [];

  if (b.thresholdCrossing >= 1) {
    // A band/classification boundary was crossed. For sentiment specifically this
    // is a regime change (into/out of Fear); otherwise a classification change.
    const kind: TriggerKind = story.category === "sentiment" ? "regime_change" : "classification_change";
    out.push({ kind, reason: story.category === "sentiment" ? "Sentiment crossed a Fear/Greed boundary" : `${CATEGORY_META[story.category]?.label ?? story.category} classification changed`, strength: 0.9 });
  }
  if (b.rarity >= 0.75) out.push({ kind: "historic_rarity", reason: "Reading is historically rare", strength: 0.6 + 0.4 * b.rarity });
  if (b.magnitude >= 0.6 || b.percentChange >= 0.6) out.push({ kind: "major_move_7d", reason: "Large 7-day movement", strength: Math.max(b.magnitude, b.percentChange) });
  if (b.percentileMovement >= 0.6) out.push({ kind: "percentile_shift", reason: "Historical percentile moved sharply this week", strength: b.percentileMovement });
  if (b.supportingIndicators >= 0.66) out.push({ kind: "multi_indicator", reason: "Multiple indicators confirm the same narrative", strength: b.supportingIndicators });
  if (isDominant) out.push({ kind: "score_dominance", reason: "Today's dominant story by a clear margin", strength: 0.7 });

  return out.sort((a, b2) => b2.strength - a.strength);
}

// ── Eligibility: Interesting → Meaningful → Publishable ──────────────────────
function eligibility(story: Story, triggers: IntelligenceTrigger[]): { publishable: boolean; reason: string } {
  const meaningful = triggers.filter((t) => t.strength >= MEANINGFUL_TRIGGER_FLOOR);
  if (!meaningful.length) return { publishable: false, reason: "interesting but not meaningful — no trigger cleared the strength floor" };
  const hasHard = meaningful.some((t) => HARD_TRIGGERS.has(t.kind));
  const score = toScore100(story.rawScore);
  if (hasHard) return { publishable: true, reason: meaningful.find((t) => HARD_TRIGGERS.has(t.kind))!.reason };
  if (score >= SOFT_SCORE_FLOOR) return { publishable: true, reason: `${meaningful[0].reason} at a high story score (${score})` };
  return { publishable: false, reason: `meaningful but below the publish threshold (score ${score} < ${SOFT_SCORE_FLOOR}, no hard trigger)` };
}

function priorityFor(story: Story, triggers: IntelligenceTrigger[], rarity: EventRarity): EventPriority {
  const score = toScore100(story.rawScore);
  const hasHard = triggers.some((t) => HARD_TRIGGERS.has(t.kind));
  if (hasHard && (rarity === "high" || score >= 70)) return "high";
  if (hasHard || score >= 60) return "medium";
  return "low";
}

function platformsFor(priority: EventPriority): string[] {
  const base = ["Instagram", "X", "LinkedIn"];
  return priority === "high" ? [...base, "YouTube"] : base;
}

function dedupeKeyFor(now: number, storyKey: string, primaryKind: TriggerKind): string {
  const d = new Date(now * 1);
  const day = new Date(d.getTime() - (d.getTime() % 86_400_000)).toISOString().slice(0, 10);
  return `${day}:${storyKey}:${primaryKind}`;
}

// ── The detector — pure, deterministic ───────────────────────────────────────
export function detectIntelligenceEvents(input: DetectInput): DetectResult {
  const { selection, priorEvents, now } = input;
  const today = epochDay(now);
  const suppressed: { storyKey: string; reason: string }[] = [];

  // Dominance: does the top story lead the field by a clear margin? (Reused for
  // both the score_dominance trigger and the cooldown exemption.)
  const [lead, runnerUp] = selection.ranked;
  const dominates = lead != null && (!runnerUp || lead.rawScore - runnerUp.rawScore >= DOMINANCE_MARGIN);

  // Build candidate events from stories that clear the eligibility gates.
  interface Candidate {
    story: Story;
    event: IntelligenceEvent;
    strongest: IntelligenceTrigger;
  }
  const candidates: Candidate[] = [];

  for (const story of selection.ranked) {
    if (!story.available) continue;
    const isDominant = lead != null && story.key === lead.key && dominates;
    const triggers = triggersFor(story, isDominant);
    const elig = eligibility(story, triggers);
    if (!elig.publishable) {
      suppressed.push({ storyKey: story.key, reason: elig.reason });
      continue;
    }
    const strongest = triggers[0];
    const meta = CATEGORY_META[story.category] ?? { label: story.category, pack: "chart_week" };
    const rarity = rarityFrom(story.breakdown);
    const priority = priorityFor(story, triggers, rarity);
    const primaryStat = story.stats[0];

    // Score change vs the most recent prior event for this story (if any).
    const lastForStory = priorEvents
      .filter((p) => p.storyKey === story.key)
      .sort((a, b) => Date.parse(b.detectedAt) - Date.parse(a.detectedAt))[0];
    const scoreChange = lastForStory ? toScore100(story.rawScore) - lastForStory.storyScore : null;

    const event: IntelligenceEvent = {
      dedupeKey: dedupeKeyFor(now, story.key, strongest.kind),
      displayId: null,
      detectedAt: new Date(now).toISOString(),
      eventType: meta.label,
      provider: story.key,
      storyKey: story.key,
      storyScore: toScore100(story.rawScore),
      scoreChange,
      confidence: confidenceFrom(story.breakdown),
      rarity,
      triggers,
      primaryTrigger: strongest.reason,
      triggerReason: elig.reason,
      summary: story.deck,
      suggestedHeadline: story.headline,
      suggestedPack: meta.pack,
      suggestedLayout: story.layout,
      suggestedPlatforms: platformsFor(priority),
      supportingIndicators: story.why,
      previousValue: null,
      currentValue: primaryStat ? `${primaryStat.label}: ${primaryStat.value}` : null,
      priority,
      breakdown: story.breakdown,
      cta: story.cta,
      status: "new",
      createdCreative: false,
      linkedSocialPost: null,
      grouped: [],
    };
    candidates.push({ story, event, strongest });
  }

  // ── Story grouping — fold same-narrative candidates into the strongest ──────
  // If two candidates share an editorial family (category), keep only the higher
  // scorer and record the others as supporting, rather than emitting near-dupes.
  const byCategory = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const cat = c.story.category;
    (byCategory.get(cat) ?? byCategory.set(cat, []).get(cat)!).push(c);
  }
  const grouped: Candidate[] = [];
  for (const [, group] of byCategory) {
    group.sort((a, b) => b.story.rawScore - a.story.rawScore);
    const winner = group[0];
    winner.event.grouped = group.slice(1).map((g) => g.story.key);
    for (const loser of group.slice(1)) suppressed.push({ storyKey: loser.story.key, reason: `grouped under ${winner.story.key} (same ${loser.story.category} narrative)` });
    grouped.push(winner);
  }

  // ── Cooldown + duplicate suppression ────────────────────────────────────────
  const priorByKey = new Map(priorEvents.map((p) => [p.dedupeKey, p]));
  const published: IntelligenceEvent[] = [];
  for (const c of grouped.sort((a, b) => b.story.rawScore - a.story.rawScore)) {
    const ev = c.event;

    // Exact duplicate already recorded (same day, story, trigger) → skip silently.
    if (priorByKey.has(ev.dedupeKey)) {
      suppressed.push({ storyKey: ev.storyKey, reason: "duplicate of an already-recorded event" });
      continue;
    }

    // Cooldown: a recent event for the same story within the window suppresses a
    // new one — UNLESS this is the dominant story, or a hard regime/threshold
    // trigger (a genuine new editorial event always gets through).
    const recentSameStory = priorEvents
      .filter((p) => p.storyKey === ev.storyKey && p.status !== "dismissed")
      .find((p) => today - epochDay(Date.parse(p.detectedAt)) < COOLDOWN_DAYS);
    const isDominant = lead != null && c.story.key === lead.key && dominates;
    const hardTrigger = HARD_TRIGGERS.has(c.strongest.kind);
    if (recentSameStory && !isDominant && !hardTrigger) {
      suppressed.push({ storyKey: ev.storyKey, reason: `cooldown — alerted ${today - epochDay(Date.parse(recentSameStory.detectedAt))}d ago (< ${COOLDOWN_DAYS}d)` });
      continue;
    }

    published.push(ev);
  }

  return {
    events: published.slice(0, MAX_EVENTS),
    considered: selection.ranked.length,
    suppressed,
  };
}

// The consumer contract. Every consumer (Founder Alerts, Daily Brief, Weekly,
// Social, YouTube, Pro, API…) reads publishable events through helpers like
// these — never by re-deriving significance. Adding a consumer is additive.
export function publishableEvents(result: DetectResult): IntelligenceEvent[] {
  return result.events.filter((e) => e.status === "new" || e.status === "posted");
}
export function founderAlertEvents(result: DetectResult): IntelligenceEvent[] {
  // Founder alerts: everything not snoozed/dismissed, best first. (Pro would use
  // the SAME set filtered by each subscriber's preferences — no new logic.)
  return result.events.filter((e) => e.status !== "dismissed" && e.status !== "snoozed");
}
export function emailWorthyEvents(result: DetectResult): IntelligenceEvent[] {
  // The daily briefing only interrupts for medium+ priority, new events.
  return result.events.filter((e) => e.status === "new" && e.priority !== "low");
}
