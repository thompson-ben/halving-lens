// Small builders so module mappers stay declarative. Every Fact defaults to the
// honest baseline (value present, confidence explicit); comparedFact fills the
// period delta from the shared compare() substrate.

import { compare } from "../period";
import { confidenceFrom } from "../confidence";
import type { Confidence, Fact, Recommendation, Unit } from "../types";

const DAY = 86_400_000;

export function mkFact(f: Partial<Fact> & Pick<Fact, "key" | "label" | "value" | "unit" | "definition" | "sources">): Fact {
  return {
    previous: null,
    absChange: null,
    pctChange: null,
    trend: "unknown",
    sampleSize: null,
    observability: "observed",
    confidence: "insufficient",
    definitionVersion: "1.0",
    coverageStart: null,
    identityCoverage: null,
    notes: null,
    ...f,
  };
}

// A fact with a prior-period value → auto-fills absChange/pctChange/trend and a
// sample-grounded confidence.
export function comparedFact(o: {
  key: string;
  label: string;
  unit: Unit;
  value: number | null;
  previous: number | null;
  sampleSize?: number | null;
  observability?: Fact["observability"];
  definition: string;
  sources: string[];
  coverageStart?: string | null;
  identityCoverage?: number | null;
  notes?: string | null;
  periods?: number;
  confidence?: Confidence; // override if the caller knows better
}): Fact {
  const cmp = compare(o.value, o.previous, o.unit === "pct" ? 0.05 : 0.5);
  const confidence =
    o.confidence ??
    confidenceFrom({
      sampleSize: o.sampleSize ?? null,
      periods: o.periods ?? 2,
      coverage: o.identityCoverage ?? undefined,
      observed: (o.observability ?? "observed") === "observed",
    });
  return mkFact({
    key: o.key,
    label: o.label,
    unit: o.unit,
    value: o.value,
    previous: o.previous,
    absChange: cmp.absChange,
    pctChange: cmp.pctChange,
    trend: cmp.trend,
    sampleSize: o.sampleSize ?? null,
    observability: o.observability ?? "observed",
    confidence,
    definition: o.definition,
    sources: o.sources,
    coverageStart: o.coverageStart ?? null,
    identityCoverage: o.identityCoverage ?? null,
    notes: o.notes ?? null,
  });
}

// ISO date `weeks` from `now` — for Recommendation.reviewOn.
export function reviewOn(now: number, weeks: number): string {
  return new Date(now + weeks * 7 * DAY).toISOString().slice(0, 10);
}

export function mkRecommendation(r: Partial<Recommendation> & Pick<Recommendation, "id" | "title" | "module" | "observed" | "evidence" | "action" | "successMetric">): Recommendation {
  return {
    primaryObjective: "Increase WEAS sustainably",
    weasRelationship: "increase",
    intelligenceKeys: [],
    whyItMatters: "",
    sampleSize: null,
    confidence: "early",
    expectedImpact: "medium",
    effort: "medium",
    guardrails: ["unsubscribe rate", "spam complaints", "7/30-day retention"],
    measurementWindow: "4 weeks",
    reviewOn: "",
    ...r,
  };
}
