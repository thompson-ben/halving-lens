// Bitcoin Questions — the content model (PR-Q1).
//
// A question is ONE typed registry entry; everything else (page, hub card,
// metadata, OG image, JSON-LD, sitemap, search entry) is generated from it.
// Evidence-dependent text renders through typed tokens only:
//   {{a:<id>}}   AtomicValueToken — a value whose insertion cannot invalidate
//                the surrounding sentence (clock/archival only in prose).
//   {{es:<id>}}  EngineSentence — a complete standalone sentence produced by
//                an engine-owned formatter with controlled vocabulary and an
//                explicit stale/unavailable state. Sentence positions only.
//   {{sc:<id>}}  StaticEvidenceClaim — a fixed historical conclusion held in
//                the claims registry and recomputed by CI on every run.
// The renderer refuses unknown tokens; CI asserts no "{{" ever renders.

export const CATEGORIES = [
  "Buying Bitcoin",
  "Bitcoin Cycles",
  "Bitcoin Investing",
  "Market Psychology",
  "Bitcoin Indicators",
  "Bitcoin ETFs",
  "Halving",
  "Historical Performance",
  "Risk",
  "Portfolio Strategy",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Audience = "beginner" | "intermediate" | "advanced";

/** Live blocks registered in blocks.tsx — a question names ids, never components. */
export const BLOCK_IDS = [
  "todays-configuration",
  "accumulation-index",
  "similar-moments-preview",
  "market-health",
  "cycle-scorecard",
  "downside-context",
] as const;
export type BlockId = (typeof BLOCK_IDS)[number];

export interface HistorySection {
  heading: string;
  /** Paragraphs; may contain tokens. */
  body: string[];
}

export interface WatchLink {
  /** One-line "why watch this" in the house register. */
  text: string;
  /** Must resolve to a real route (CI-checked). */
  href: string;
}

export interface QuestionEntry {
  /** kebab-case of the question (CI-checked); append-only. */
  slug: string;
  /** The H1 — the searcher's question, verbatim. */
  question: string;
  category: Category;
  audience: Audience;
  /** Roadmap priority; internal only, never rendered. */
  tier: 1 | 2 | 3 | 4;
  /** Search-snippet description, ≤160 chars (CI-checked). */
  description: string;
  /** 1–2 paragraphs. The FIRST must be token-free — it is the FAQPage
   *  acceptedAnswer and must stay stable across data refreshes. */
  shortAnswer: string[];
  history: HistorySection[];
  /** 1–4 registered blocks, rendered in order under Today's Data. */
  blocks: BlockId[];
  watch: WatchLink[];
  /** 3–5 slugs of published questions (CI-checked). */
  related: string[];
  /** Article datePublished — the original publication date. */
  added: string;
  /** Article dateModified — moved ONLY on genuine editorial revision to the
   *  written answer, never by a data refresh. */
  revised: string;
  /** Latest founder/editorial review date (displayed, not in Article dates). */
  reviewed: string;
}
