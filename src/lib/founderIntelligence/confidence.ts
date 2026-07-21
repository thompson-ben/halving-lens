// The single confidence framework, shared by every module.
//
// Confidence is grounded in EVIDENCE, not effect size: a large percentage move
// from a tiny sample must never read "high". Sample size sets the ceiling;
// modeled data, thin history, low coverage and inconsistency can only pull it
// DOWN, never up.

import type { Confidence } from "./types";

const ORDER: Confidence[] = ["insufficient", "early", "medium", "high"];
const rank = (c: Confidence): number => ORDER.indexOf(c);
const at = (i: number): Confidence => ORDER[Math.max(0, Math.min(ORDER.length - 1, i))];

// Weakest of several confidences — use when a fact depends on multiple inputs.
export function minConfidence(...cs: Confidence[]): Confidence {
  if (!cs.length) return "insufficient";
  return cs.reduce((a, b) => (rank(b) < rank(a) ? b : a));
}

export interface ConfidenceInputs {
  sampleSize?: number | null; // the n behind the value (events, subscribers, sessions)
  periods?: number | null; // # of comparable periods/editions observed
  magnitude?: number | null; // |pct change| or effect size — informational only
  consistency?: number | null; // 0..1, how consistent across periods
  coverage?: number | null; // 0..1, identity/tracking coverage
  observed?: boolean; // false ⇒ modeled (capped at medium)
}

// Sample size sets the ceiling. Thresholds match journeyAnalytics.confidenceFromSample
// (n>=30 strong, >=10 medium) with an "early" tier for small-but-nonzero samples.
function ceilingFromSample(n: number | null | undefined): Confidence {
  if (n == null) return "insufficient";
  if (n >= 30) return "high";
  if (n >= 10) return "medium";
  if (n >= 3) return "early";
  return "insufficient";
}

export function confidenceFrom(i: ConfidenceInputs): Confidence {
  let c = ceilingFromSample(i.sampleSize);
  // Modeled data can never be "high".
  if (i.observed === false && rank(c) > rank("medium")) c = "medium";
  // A single period can't confirm a trend.
  if (i.periods != null && i.periods < 2) c = at(rank(c) - 1);
  // Low identity/tracking coverage undercuts attribution.
  if (i.coverage != null && i.coverage < 0.3) c = at(rank(c) - 1);
  // Inconsistent readings across periods.
  if (i.consistency != null && i.consistency < 0.5) c = at(rank(c) - 1);
  return c;
}

// Human label (for UI / email / API).
export function confidenceLabel(c: Confidence): string {
  return c === "high" ? "High confidence" : c === "medium" ? "Medium confidence" : c === "early" ? "Early signal" : "Insufficient evidence";
}
