// DBV2-C — the Daily Brief V2 edition archive.
//
// Each sent V2 edition is frozen here by the daily sync (persist-edition):
// the subject, the verdict class, the story shape and the exact plain-text
// body. Two jobs:
//   · a permanent record of what was actually EMAILED (the legacy Edition
//     store in data/editions.ts is preserved verbatim but frozen at the
//     cutover — it archives the retired email product, and its pages keep
//     rendering that history);
//   · the subject-freshness memory for briefIntel — merged with the legacy
//     editions' subjects so the freshest-pick discipline carries across the
//     cutover without a cold start.

import { BRIEF_V2_EDITIONS } from "./data/briefV2Editions";
import { recentSubjects as legacyRecentSubjects } from "./editorialVariety";

export interface BriefV2Edition {
  slug: string; // YYYY-MM-DD
  subject: string;
  /** The canonical verdict class the edition was sent under. */
  activity: "quiet" | "mostly_quiet" | "active";
  /** The story shape that led the edition. */
  storyKind: string;
  /** The exact plain-text body that was sent. */
  text: string;
  version: string; // BRIEF_INTEL_VERSION at send time
}

export function allBriefV2Editions(): BriefV2Edition[] {
  return [...BRIEF_V2_EDITIONS].sort((a, b) => (a.slug < b.slug ? 1 : -1));
}

/** The last `n` sent subjects, newest first — V2 editions first, then the
 *  legacy editions' subjects to fill the window across the cutover. */
export function recentBriefSubjects(n: number): string[] {
  const v2 = allBriefV2Editions().map((e) => e.subject);
  if (v2.length >= n) return v2.slice(0, n);
  return [...v2, ...legacyRecentSubjects(n - v2.length)];
}
