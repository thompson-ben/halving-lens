// Bitcoin Questions — the registry (PR-Q1). Code as content: the aggregated,
// validated question list plus every selector the app and integrations use.
// This module stays free of React/component imports so searchIndex and
// sitemap can consume it; live blocks live in ./blocks.tsx.

import type { Category, QuestionEntry } from "./types";
import { CATEGORIES } from "./types";
import { BUYING_QUESTIONS } from "./content/buying";
import { CYCLES_QUESTIONS } from "./content/cycles";
import { HALVING_QUESTIONS } from "./content/halving";
import { INDICATOR_QUESTIONS } from "./content/indicators";

const ALL: QuestionEntry[] = [
  ...BUYING_QUESTIONS,
  ...CYCLES_QUESTIONS,
  ...HALVING_QUESTIONS,
  ...INDICATOR_QUESTIONS,
];

// Fail fast on duplicate slugs — a duplicate would silently shadow a page.
{
  const seen = new Set<string>();
  for (const q of ALL) {
    if (seen.has(q.slug)) throw new Error(`Duplicate question slug: ${q.slug}`);
    seen.add(q.slug);
  }
}

export function allQuestions(): QuestionEntry[] {
  return ALL;
}

export function questionBySlug(slug: string): QuestionEntry | undefined {
  return ALL.find((q) => q.slug === slug);
}

export function relatedQuestions(entry: QuestionEntry): QuestionEntry[] {
  return entry.related.map((slug) => questionBySlug(slug)).filter((q): q is QuestionEntry => q != null);
}

/** Categories in fixed taxonomy order, but only those with published content —
 *  the hub never renders an empty shelf. */
export function categoriesWithContent(): Array<{ category: Category; questions: QuestionEntry[] }> {
  return CATEGORIES.map((category) => ({ category, questions: ALL.filter((q) => q.category === category) })).filter(
    (g) => g.questions.length > 0,
  );
}

/** Entries for the site search index (title + path only, like every corpus). */
export function questionSearchEntries(): Array<{ title: string; path: string; group: string }> {
  return ALL.map((q) => ({ title: q.question, path: `/questions/${q.slug}`, group: "Questions" }));
}
