// Intelligence Events — persistence + the consumer orchestrator.
//
// The pure engine (intelligenceEvents.ts) decides significance. This module is
// the seam to the outside world: it reads the Story Engine + social history,
// runs detection, overlays persisted status, and writes events to the durable
// `intelligence_events` table. EVERY consumer — Founder Alerts today, Daily
// Brief / Weekly / Social / YouTube / Pro / API tomorrow — goes through
// getIntelligenceQueue()/syncIntelligenceEvents(), so significance logic is
// never re-implemented downstream.
//
// Honest degradation: with Supabase unconfigured, detection still runs off the
// live Story Engine (no history), events aren't persisted, and the result says
// so — cooldown/dedup can't use history, but nothing fabricates significance.

import { sbSelect, sbUpsert, sbUpdate, supabaseConfigured } from "./supabase";
import { storyEngine } from "./storyEngine";
import { recentSocialPosts } from "./socialPosts";
import {
  detectIntelligenceEvents,
  founderAlertEvents,
  emailWorthyEvents,
  type IntelligenceEvent,
  type PriorEvent,
  type EventStatus,
  type DetectResult,
} from "./intelligenceEvents";

interface IntelRow {
  id: number;
  dedupe_key: string;
  detected_at: string;
  status: EventStatus;
  story_key: string;
  event_type: string;
  priority: IntelligenceEvent["priority"];
  story_score: number | null;
  created_creative: boolean;
  linked_social_post: number | null;
}

const HISTORY_LIMIT = 120;

// The human-facing id: EVT-<year>-<zero-padded row id>. Derived, never stored.
function displayId(row: { id: number; detected_at: string }): string {
  const year = new Date(row.detected_at).getUTCFullYear();
  return `EVT-${year}-${String(row.id).padStart(6, "0")}`;
}

async function fetchRows(limit = HISTORY_LIMIT): Promise<IntelRow[]> {
  if (!supabaseConfigured) return [];
  const rows = await sbSelect<IntelRow[]>(
    `intelligence_events?select=id,dedupe_key,detected_at,status,story_key,event_type,priority,story_score,created_creative,linked_social_post&order=detected_at.desc&limit=${limit}`,
  );
  return rows ?? [];
}

function toPriorEvent(r: IntelRow): PriorEvent {
  return {
    dedupeKey: r.dedupe_key,
    storyKey: r.story_key,
    eventType: r.event_type,
    priority: r.priority,
    storyScore: r.story_score ?? 0,
    detectedAt: r.detected_at,
    status: r.status,
  };
}

// Map an event to a persistable row.
function toRow(e: IntelligenceEvent): Record<string, unknown> {
  return {
    dedupe_key: e.dedupeKey,
    detected_at: e.detectedAt,
    event_type: e.eventType,
    provider: e.provider,
    story_key: e.storyKey,
    story_score: e.storyScore,
    confidence: e.confidence,
    rarity: e.rarity,
    trigger: e.primaryTrigger,
    trigger_reason: e.triggerReason,
    summary: e.summary,
    suggested_headline: e.suggestedHeadline,
    suggested_pack: e.suggestedPack,
    suggested_layout: e.suggestedLayout,
    suggested_platforms: e.suggestedPlatforms,
    supporting_indicators: e.supportingIndicators,
    previous_value: e.previousValue,
    current_value: e.currentValue,
    priority: e.priority,
    grouped: e.grouped,
    breakdown: e.breakdown,
  };
}

export interface IntelligenceQueue {
  configured: boolean;
  generatedAt: string;
  events: IntelligenceEvent[]; // founder-facing (dismissed/snoozed removed), best first
  suppressed: DetectResult["suppressed"];
  considered: number;
  note: string | null; // honest degradation message, if any
}

// Overlay persisted status/id onto freshly-detected events, keyed by dedupeKey.
function overlay(events: IntelligenceEvent[], rows: IntelRow[]): IntelligenceEvent[] {
  const byKey = new Map(rows.map((r) => [r.dedupe_key, r]));
  return events.map((e) => {
    const row = byKey.get(e.dedupeKey);
    if (!row) return e;
    return { ...e, displayId: displayId(row), status: row.status, createdCreative: row.created_creative, linkedSocialPost: row.linked_social_post };
  });
}

// THE consumer accessor. Read-only: detects + overlays persisted status, does not
// write (so a page render has no side effects). Persistence happens on explicit
// actions (status changes) and in syncIntelligenceEvents() (the email/cron path).
export async function getIntelligenceQueue(): Promise<IntelligenceQueue> {
  const now = Date.now();
  if (!supabaseConfigured) {
    const result = detectIntelligenceEvents({ selection: storyEngine(), priorEvents: [], now });
    return {
      configured: false,
      generatedAt: new Date(now).toISOString(),
      events: founderAlertEvents(result),
      suppressed: result.suppressed,
      considered: result.considered,
      note: "Supabase isn't configured — events aren't persisted, and cooldown / duplicate suppression can't use history yet. Run supabase/intelligence_events.sql to enable the historical intelligence database.",
    };
  }
  const [recentPosts, rows] = await Promise.all([recentSocialPosts(), fetchRows()]);
  const selection = storyEngine({ recentPosts });
  const result = detectIntelligenceEvents({ selection, priorEvents: rows.map(toPriorEvent), now });
  const events = overlay(founderAlertEvents(result), rows).filter((e) => e.status !== "dismissed" && e.status !== "snoozed");
  return { configured: true, generatedAt: new Date(now).toISOString(), events, suppressed: result.suppressed, considered: result.considered, note: null };
}

// The write path (email/cron): detect, persist any new events idempotently, and
// return the email-worthy set. Upsert-by-dedupe_key means re-runs never dupe.
export async function syncIntelligenceEvents(): Promise<{ configured: boolean; persisted: number; emailWorthy: IntelligenceEvent[]; result: DetectResult | null }> {
  const now = Date.now();
  if (!supabaseConfigured) return { configured: false, persisted: 0, emailWorthy: [], result: null };
  const [recentPosts, rows] = await Promise.all([recentSocialPosts(), fetchRows()]);
  const selection = storyEngine({ recentPosts });
  const result = detectIntelligenceEvents({ selection, priorEvents: rows.map(toPriorEvent), now });

  // Persist events that aren't already recorded (idempotent on dedupe_key).
  const known = new Set(rows.map((r) => r.dedupe_key));
  const fresh = result.events.filter((e) => !known.has(e.dedupeKey));
  if (fresh.length) await sbUpsert("intelligence_events", fresh.map(toRow), "dedupe_key");

  return { configured: true, persisted: fresh.length, emailWorthy: overlay(emailWorthyEvents(result), rows), result };
}

// Founder actions from the Intelligence Queue. Upsert-then-patch so an action on
// a not-yet-persisted event still works (it records the event, then sets status).
export async function actOnEvent(event: IntelligenceEvent, status: EventStatus): Promise<boolean> {
  if (!supabaseConfigured) return false;
  await sbUpsert("intelligence_events", [{ ...toRow(event), status }], "dedupe_key");
  return sbUpdate("intelligence_events", `dedupe_key=eq.${encodeURIComponent(event.dedupeKey)}`, { status });
}

// Mark that a creative was generated / published for an event (Generate Creative
// → Mark Posted), optionally linking the social_posts row.
export async function linkCreative(dedupeKey: string, opts: { createdCreative?: boolean; linkedSocialPost?: number | null } = {}): Promise<boolean> {
  if (!supabaseConfigured) return false;
  const patch: Record<string, unknown> = {};
  if (opts.createdCreative != null) patch.created_creative = opts.createdCreative;
  if (opts.linkedSocialPost !== undefined) patch.linked_social_post = opts.linkedSocialPost;
  if (!Object.keys(patch).length) return true;
  return sbUpdate("intelligence_events", `dedupe_key=eq.${encodeURIComponent(dedupeKey)}`, patch);
}
