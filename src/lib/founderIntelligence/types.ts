// Founder Intelligence Layer — the shared contract.
//
// This is the SPINE of HalvingLens' self-measuring operating system. Every
// intelligence module (Growth, Journey, Daily Brief today; Content, Advertising,
// Retention, … later) returns this same versioned shape, and every consumer
// (Executive dashboard, Growth OS, Founder reports, the AI Review Feed, a future
// MCP/ChatGPT connector) reads it — never re-deriving calculations. The layer is
// the product; dashboards and AI are consumers.
//
// It is deliberately organised as THREE conceptual layers, with traceability
// enforced by the types so a recommendation can always be walked back to the
// facts behind it:
//
//   Layer 1 — FACTS         raw measured values, no interpretation
//        ↓  (Fact.key)
//   Layer 2 — INTELLIGENCE  evidence-backed interpretation (cites factKeys)
//        ↓  (IntelligenceItem.id)
//   Layer 3 — DECISIONS     recommendations (cite intelligenceKeys)
//
// Honesty is structural: `value: null` means "no honest source" (never a fake
// 0); `observability` distinguishes observed / modeled / partial / unavailable;
// every Fact carries its definition, coverage-start, identity coverage and
// confidence. Missing modules report `status:"not_implemented"`, never empty
// intelligence dressed up as real.

export const FOUNDER_INTELLIGENCE_SCHEMA_VERSION = "1.0";

// ── Shared primitives ────────────────────────────────────────────────────────

// Metric / recommendation confidence — how much evidential weight to give it.
// (Distinct from EngagementConfidence below, which grades a WEAS signal.)
export type Confidence = "high" | "medium" | "early" | "insufficient";

// How a value was obtained — the honesty axis.
export type Observability = "observed" | "modeled" | "partial" | "unavailable";

export type Trend = "up" | "down" | "flat" | "unknown";

export type Unit = "count" | "pct" | "gbp" | "seconds" | "ratio" | "days";

export interface Period {
  start: string; // ISO
  end: string; // ISO
  label: string; // e.g. "Last 7 days"
  timezone: string; // "Europe/London"
  days: number;
}

// ── Layer 1 — FACTS ──────────────────────────────────────────────────────────
// A single measured number with its full provenance. No interpretation.
export interface Fact {
  key: string; // stable id, e.g. "weas", "conversion_rate"
  label: string;
  value: number | null; // null = no honest source (NEVER a fabricated 0)
  unit: Unit;
  previous: number | null; // prior comparable period
  absChange: number | null;
  pctChange: number | null;
  trend: Trend;
  sampleSize: number | null; // the n behind the value
  observability: Observability;
  confidence: Confidence;
  definition: string; // plain-English definition
  definitionVersion: string;
  coverageStart: string | null; // ISO — "collecting since"; null = full history
  identityCoverage: number | null; // 0..1 for identity-linked metrics; null if n/a
  sources: string[]; // source systems / tables
  notes: string | null; // data-quality caveat, if any
}

// ── Layer 2 — INTELLIGENCE ───────────────────────────────────────────────────
// An evidence-backed interpretation that CITES the facts it rests on.
export type IntelligenceCategory =
  | "growth"
  | "engagement"
  | "journey"
  | "email"
  | "content"
  | "acquisition"
  | "retention"
  | "operational";
export type IntelligenceTone = "good" | "warn" | "info";

export interface IntelligenceItem {
  id: string;
  category: IntelligenceCategory;
  tone: IntelligenceTone;
  statement: string; // e.g. "Journey depth is improving"
  factKeys: string[]; // TRACEABILITY → the Fact.key values behind this
  evidence: string; // the numbers that justify the statement
  confidence: Confidence;
}

// ── Layer 3 — DECISIONS ──────────────────────────────────────────────────────
export type Impact = "high" | "medium" | "low";
export type Effort = "low" | "medium" | "high";
// How the recommendation relates to the North Star (WEAS).
export type WeasRelationship = "increase" | "protect" | "neutral" | "unknown";

// A recommendation is NEVER detached from its evidence. It cites the
// intelligence (which cites facts), and states how success will be measured.
export interface Recommendation {
  id: string;
  title: string;
  primaryObjective: string; // usually "Increase WEAS sustainably"
  weasRelationship: WeasRelationship;
  module: string; // originating module id
  intelligenceKeys: string[]; // TRACEABILITY → IntelligenceItem.id values
  observed: string; // what was observed
  whyItMatters: string;
  evidence: string; // supporting sample + numbers
  sampleSize: number | null;
  confidence: Confidence;
  expectedImpact: Impact;
  effort: Effort;
  guardrails: string[]; // metrics that must not deteriorate (unsubscribe, complaints, …)
  action: string; // the proposed change
  successMetric: string; // what determines success
  measurementWindow: string; // e.g. "4 weeks"
  reviewOn: string; // ISO date to re-review
}

// ── The standard module contract ─────────────────────────────────────────────
// Every intelligence module returns exactly this. `status` lets a not-yet-built
// module be a first-class citizen of the feed without faking data.
export type ModuleStatus = "ok" | "not_implemented" | "unavailable";

export interface IntelligenceModule {
  moduleId: string;
  moduleName: string;
  schemaVersion: string;
  status: ModuleStatus;
  reason: string | null; // why, when status != "ok"
  period: Period | null;
  refreshedAt: string;
  facts: Fact[];
  intelligence: IntelligenceItem[];
  recommendations: Recommendation[];
  risks: string[];
  opportunities: string[];
  operationalWarnings: string[];
  dataQuality: DataQualityNote[];
  sources: string[];
  sampleSize: number | null;
  confidence: Confidence;
}

// A not-implemented / unavailable module placeholder — explicit, never empty-real.
export interface ModuleStub {
  moduleId: string;
  moduleName: string;
  status: Exclude<ModuleStatus, "ok">;
  reason: string;
}

// ── Data quality ─────────────────────────────────────────────────────────────
export interface DataQualityNote {
  metric: string;
  source: string;
  observability: Observability;
  identityCoverage: number | null;
  coverageStart: string | null;
  limitation: string | null;
  confidence: Confidence;
  definitionVersion: string;
}

// ── North Star — WEAS ────────────────────────────────────────────────────────
// Engagement-confidence grades a single WEAS signal (distinct from metric
// Confidence). Only confirmed/high/medium count toward WEAS; supporting does not.
export type EngagementConfidence = "confirmed" | "high" | "medium" | "supporting";

export interface NorthStar {
  metric: "weekly_engaged_active_subscribers";
  definitionVersion: string;
  value: number | null; // WEAS (distinct engaged subscribers)
  rate: number | null; // WEAS ÷ active subscribers (%)
  previousValue: number | null;
  change: number | null;
  trend: Trend;
  confidence: Confidence;
  coverage: string; // plain-English identity-coverage description
  identityCoverage: number | null; // 0..1 recognised share
  activeSubscribers: number | null;
  tiers: { confirmed: number; high: number; medium: number }; // counted signals by tier
  supportingOnly: { emailOpens: number; signIns: number }; // reported, NOT counted
  isLowerBound: boolean; // true while identity coverage is partial
  notes: string[];
}

// ── The concise Founder Review (one prioritised action) ──────────────────────
export interface FounderReview {
  verdict: string; // executive one-liner
  northStarStatus: string;
  improved: string[];
  deteriorated: string[];
  topOpportunity: string | null;
  topRisk: string | null;
  recommendedAction: Recommendation | null; // ONE action, not a list
  evidence: string;
  confidence: Confidence;
  dataQualityNotes: string[];
}

// ── The whole feed — one structured intelligence object ──────────────────────
export interface FounderIntelligenceFeed {
  schemaVersion: string;
  generatedAt: string;
  period: Period;
  northStar: NorthStar;
  modules: Record<string, IntelligenceModule | ModuleStub>;
  recommendations: Recommendation[]; // merged across modules, ranked
  risks: string[];
  opportunities: string[];
  dataQuality: DataQualityNote[];
  review: FounderReview;
}

// Shared primitives computed once per feed and passed to every module, so the
// North Star and the single canonical conversion are never re-derived divergently.
import type { CanonicalConversion } from "./metrics/conversion";
export interface SharedContext {
  northStar: NorthStar;
  conversion: CanonicalConversion;
}

// A registered module producer: either a real async builder or a planned stub.
export interface ModuleProvider {
  moduleId: string;
  moduleName: string;
  planned?: { status: Exclude<ModuleStatus, "ok">; reason: string }; // present ⇒ not built yet
  build?: (period: Period, now: number, shared: SharedContext) => Promise<IntelligenceModule>;
}
