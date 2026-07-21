// Data-quality helpers — so every consumer (especially an AI reviewer) can tell
// mature evidence from partial evidence, modeled estimates, unavailable data and
// newly-accruing instrumentation.

import type { DataQualityNote, Fact } from "./types";

// Derive a data-quality note from a Fact (its provenance travels with it).
export function factToDataQuality(f: Fact): DataQualityNote {
  return {
    metric: f.key,
    source: f.sources.join(", ") || "unknown",
    observability: f.observability,
    identityCoverage: f.identityCoverage,
    coverageStart: f.coverageStart,
    limitation: f.notes,
    confidence: f.confidence,
    definitionVersion: f.definitionVersion,
  };
}

// Merge notes from many modules, keeping the first per metric.
export function dedupeDataQuality(notes: DataQualityNote[]): DataQualityNote[] {
  const seen = new Set<string>();
  const out: DataQualityNote[] = [];
  for (const n of notes) {
    if (seen.has(n.metric)) continue;
    seen.add(n.metric);
    out.push(n);
  }
  return out;
}
