// Deterministic editorial variety engine for the Daily Research Brief email.
//
// The email is entirely templated and rule-based. Within a persistent market
// state, the old logic cycled only a handful of variants per branch and so
// repeated the same subject/opening every few days. This module widens the
// candidate space and picks the phrasing that is FRESHEST versus the last ~10
// editions — deterministically, reproducibly, from the brief's date alone.
//
// HARD RULES (see brief spec): no LLM, no network, no Math.random, no
// `new Date()`/`Date.now()` for logic. Every seed derives from the brief date
// via `dateSeed()`. Truthfulness is the caller's responsibility — this module
// only ranks and rotates strings; it never invents facts. Callers must gate
// each candidate on the data that makes it true.

import { briefDate, todaySlug } from "./briefArchive";
import { allEditions } from "./research";

// A small stopword set — dropped before token comparison so that phrasings
// that share the same meaningful words score as similar even when the
// connective tissue differs.
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "in", "on", "at", "of", "to", "for", "and", "or", "but", "as", "by",
  "with", "from", "into", "that", "this", "these", "those", "it", "its",
  "while", "even", "still", "again", "than", "then", "so", "not", "no",
  "today", "todays", "s",
]);

// Deterministic 32-bit string hash — the ONLY hash precedent in this codebase
// (referral.ts). Reused so all seeds share one shape.
export function seedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// The same integer day-index emailBrief has always seeded on, so callers share
// one seed basis. Uses briefDate() (never `new Date()`), so it is stable for a
// given edition and reproducible.
export function dateSeed(): number {
  return Math.floor(briefDate().getTime() / 86_400_000);
}

function normTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9%$\s]/g, " ") // strip punctuation, keep %/$ so "$2.1b"/"25%" survive
    .split(/\s+/)
    .filter(Boolean);
}

// Normalized token Jaccard (0..1) with a light bonus when the two strings share
// their leading word / leading bigram, so "Bitcoin remains…" and "Bitcoin
// still…" read as related rather than distinct.
export function similarity(a: string, b: string): number {
  const rawA = normTokens(a);
  const rawB = normTokens(b);
  const tokA = rawA.filter((t) => !STOPWORDS.has(t));
  const tokB = rawB.filter((t) => !STOPWORDS.has(t));

  const setA = new Set(tokA);
  const setB = new Set(tokB);
  if (setA.size === 0 && setB.size === 0) return 1; // two empties are identical
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const union = setA.size + setB.size - inter;
  const jaccard = union === 0 ? 0 : inter / union;

  // Leading-word / leading-bigram bonus (uses raw tokens, incl. stopwords, so
  // the true sentence openings are compared).
  let bonus = 0;
  if (rawA.length && rawB.length && rawA[0] === rawB[0]) {
    bonus += 0.08;
    if (rawA.length > 1 && rawB.length > 1 && rawA[1] === rawB[1]) bonus += 0.08;
  }

  return Math.min(1, jaccard + bonus);
}

// Freshness of a candidate versus recent history: 100 = fully fresh (nothing
// like it recently), 0 = a verbatim recent repeat. 100 when there is no history.
export function freshnessVs(candidate: string, recent: string[]): number {
  const pool = recent.filter((r) => r && r.trim().length > 0);
  if (pool.length === 0) return 100;
  let max = 0;
  for (const r of pool) {
    const sim = similarity(candidate, r);
    if (sim > max) max = sim;
  }
  return Math.round((1 - max) * 100);
}

// Pick the freshest candidate versus `recent`. Ties (equal freshness) are broken
// deterministically by rotating with `seed`, so the choice still varies day to
// day. Empty/duplicate candidates are ignored. Never returns undefined — falls
// back to the first candidate if all are empty.
export function pickFreshest(
  candidates: string[],
  recent: string[],
  seed: number,
): { value: string; freshness: number } {
  // De-dupe (first occurrence wins) and drop empties, preserving order.
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const c of candidates) {
    const t = (c ?? "").trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    clean.push(t);
  }
  if (clean.length === 0) {
    const fallback = (candidates.find((c) => (c ?? "").trim().length > 0) ?? candidates[0] ?? "").trim();
    return { value: fallback, freshness: freshnessVs(fallback, recent) };
  }

  const scored = clean.map((value) => ({ value, freshness: freshnessVs(value, recent) }));
  const best = Math.max(...scored.map((s) => s.freshness));
  const tied = scored.filter((s) => s.freshness === best);
  if (tied.length === 1) return tied[0];
  const idx = ((seed % tied.length) + tied.length) % tied.length;
  return tied[idx];
}

// ── Recent-history readers ────────────────────────────────────────────────────
// The "previous ~10" anti-repetition source. Skips any persisted copy of the
// in-progress edition (same slug as today) so today is never compared to itself.
function recentEditions(n: number) {
  const today = todaySlug();
  return allEditions()
    .filter((e) => e.slug !== today)
    .slice(0, Math.max(0, n));
}

export function recentSubjects(n = 10): string[] {
  return recentEditions(n).map((e) => e.subject).filter((s): s is string => !!s);
}
export function recentTakes(n = 10): string[] {
  return recentEditions(n).map((e) => e.take).filter((s): s is string => !!s);
}
export function recentOneThings(n = 10): string[] {
  return recentEditions(n).map((e) => e.oneThing).filter((s): s is string => !!s);
}

// Seed offsets so that the subject, take and lead insight don't move in lockstep
// (a tie in one dimension shouldn't force the same rotation in another).
export const SEED_OFFSET = { subject: 0, take: 17, oneThing: 41, cta: 71 } as const;
