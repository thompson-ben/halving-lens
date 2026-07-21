// The machine-readable surface of the Founder Intelligence Layer. Every consumer
// — the ChatGPT / MCP "Review HalvingLens" connector, future dashboards, the
// founder report — reads the SAME versioned, aggregate-only envelopes shaped
// here. The URL space is versioned from day one (/api/intelligence/v1/<section>)
// so the schema can evolve without breaking connected clients:
//
//   v1/review        → the concise Founder Review + North Star + ranked actions
//   v1/feed          → the full FounderIntelligenceFeed (all modules)
//   v1/growth        → the Growth Intelligence module
//   v1/journeys      → the Journey Intelligence module
//   v1/daily-brief   → the Daily Brief Intelligence module
//
// Everything here is aggregate by construction (counts, rates, confidence) — the
// feed carries no subscriber identifiers, so these envelopes never expose PII.

import { composeFeed } from "./composer";
import type { FounderIntelligenceFeed, ModuleStub } from "./types";

export const API_VERSION = "v1";

// Public URL slug → internal module id (slugs are stable API contract).
export const SECTION_TO_MODULE: Record<string, string> = {
  growth: "growth",
  journeys: "journeys",
  "daily-brief": "daily_briefs",
};

export const INTELLIGENCE_SECTIONS = ["review", "feed", ...Object.keys(SECTION_TO_MODULE)] as const;
export type IntelligenceSection = (typeof INTELLIGENCE_SECTIONS)[number];

export function isSection(s: string): boolean {
  return s === "review" || s === "feed" || s in SECTION_TO_MODULE;
}

export interface IntelligenceEnvelope {
  apiVersion: string;
  schemaVersion: string;
  section: string;
  generatedAt: string;
  period: FounderIntelligenceFeed["period"];
  [k: string]: unknown;
}

// Pure shaper: FounderIntelligenceFeed → the versioned envelope for one section.
// Deterministic; no I/O — the async wrapper below supplies the feed.
export function shapeSection(feed: FounderIntelligenceFeed, section: string): IntelligenceEnvelope {
  const base = {
    apiVersion: API_VERSION,
    schemaVersion: feed.schemaVersion,
    section,
    generatedAt: feed.generatedAt,
    period: feed.period,
  };

  if (section === "feed") {
    return {
      ...base,
      northStar: feed.northStar,
      modules: feed.modules,
      recommendations: feed.recommendations,
      risks: feed.risks,
      opportunities: feed.opportunities,
      dataQuality: feed.dataQuality,
      review: feed.review,
    };
  }

  if (section === "review") {
    return {
      ...base,
      northStar: feed.northStar,
      review: feed.review,
      topRecommendation: feed.recommendations[0] ?? null,
      recommendations: feed.recommendations,
      risks: feed.risks,
      opportunities: feed.opportunities,
      dataQuality: feed.dataQuality,
    };
  }

  const moduleId = SECTION_TO_MODULE[section];
  const stub: ModuleStub = { moduleId: moduleId ?? section, moduleName: moduleId ?? section, status: "not_implemented", reason: "Unknown module." };
  return { ...base, module: feed.modules[moduleId] ?? stub };
}

// Async entry point used by the route handler: compose the feed once, then shape.
export async function intelligenceApiResponse(section: string, now: number = Date.now()): Promise<IntelligenceEnvelope> {
  const feed = await composeFeed(now);
  return shapeSection(feed, section);
}
