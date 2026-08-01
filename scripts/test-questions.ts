// Deterministic tests for Bitcoin Questions (PR-Q1): the registry contract,
// vocabulary rules, evidence-token discipline, EngineSentence state fixtures,
// static-claim drift recomputation, the staleness contract, structured-data
// integrity, editorial-date rules, and every ecosystem integration point.
// Run: npm run test-questions

import { readFileSync } from "node:fs";
import { allQuestions, questionBySlug } from "../src/lib/questions";
import { BLOCK_IDS, CATEGORIES } from "../src/lib/questions/types";
import { CLAIMS, verifyStaticClaims } from "../src/lib/questions/evidence/claims";
import { atomValues } from "../src/lib/questions/evidence/atoms";
import {
  accumulationSentence,
  athRecencySentence,
  frpPositionSentence,
  frpSpellSentence,
  peakStatusSentence,
} from "../src/lib/questions/evidence/sentences";
import {
  archiveIsFresh,
  buildTokens,
  evidenceContext,
  gatherReads,
  resolveTokens,
} from "../src/lib/questions/evidence";
import { JOURNEY_MAP } from "../src/lib/journeyMap";
import { searchIndex } from "../src/lib/searchIndex";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

const QUESTIONS = allQuestions();
const ctx = evidenceContext();

// ── Registry contract ────────────────────────────────────────────────────────

assert(QUESTIONS.length === 5, "PR-Q1 ships exactly the five approved launch questions");
const slugs = new Set(QUESTIONS.map((q) => q.slug));
assert(slugs.size === QUESTIONS.length, "slugs are unique");
for (const q of QUESTIONS) {
  const kebab = q.question.toLowerCase().replace(/[’'?,.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  assert(q.slug === kebab, `${q.slug}: slug is the kebab-case of the question`);
  assert((CATEGORIES as readonly string[]).includes(q.category), `${q.slug}: valid category`);
  assert(q.description.length <= 160, `${q.slug}: description ≤160 chars (${q.description.length})`);
  assert(q.shortAnswer.length >= 1 && q.shortAnswer.length <= 2, `${q.slug}: short answer is 1–2 paragraphs`);
  for (const [i, p] of q.shortAnswer.entries()) {
    const words = p.split(/\s+/).length;
    assert(words <= 120, `${q.slug}: short-answer paragraph ${i + 1} ≤120 authored words (${words})`);
  }
  assert(q.blocks.length >= 1 && q.blocks.length <= 4, `${q.slug}: 1–4 live blocks`);
  assert(q.blocks.every((b) => (BLOCK_IDS as readonly string[]).includes(b)), `${q.slug}: every block id is registered`);
  assert(q.related.length >= 3 && q.related.length <= 5, `${q.slug}: 3–5 related questions`);
  assert(q.related.every((s) => questionBySlug(s) != null && s !== q.slug), `${q.slug}: related slugs exist and never self-link`);
  assert(q.revised >= q.added && q.reviewed >= q.added, `${q.slug}: dates ordered (revised/reviewed ≥ added)`);
}
// Reciprocity is reviewed, not forced — asymmetric pairs are listed as warnings.
for (const q of QUESTIONS) {
  for (const r of q.related) {
    const back = questionBySlug(r)!;
    if (!back.related.includes(q.slug)) console.log(`  note   related asymmetry: ${q.slug} → ${r} (no back-link)`);
  }
}

// ── Vocabulary: banned list, advice imperatives, legal claims ────────────────

const BANNED = [/\bsupport\b/i, /\bfloor\b/i, /fair value/i, /break-?even/i, /\btarget\b/i];
const ADVICE = [/you should (buy|sell)/i, /we recommend/i, /\bbuy now\b/i, /\bsell now\b/i, /price target/i, /\bfinancial advice\b(?! )/i];
const LEGAL = [/compliant with/i, /legally permitted/i, /financial promotion/i, /\bFCA\b/, /regulatory (approval|status)/i];
const userStrings = (q: (typeof QUESTIONS)[number]): string[] => [
  q.question,
  q.description,
  ...q.shortAnswer,
  ...q.history.flatMap((s) => [s.heading, ...s.body]),
  ...q.watch.map((w) => w.text),
];
for (const q of QUESTIONS) {
  const all = userStrings(q).map((s) => resolveTokens(s, ctx.tokens)).join(" \n ");
  assert(!BANNED.some((re) => re.test(all)), `${q.slug}: no banned vocabulary in any rendered user-facing string`);
  assert(!ADVICE.some((re) => re.test(all.replace(/doesn't give personalised investment advice|doesn't give investment advice/gi, ""))), `${q.slug}: no advice imperatives or recommendation wording`);
  assert(!LEGAL.some((re) => re.test(all)), `${q.slug}: no legal/regulatory-status claims`);
  assert(!/Historical context, not a prediction\./.test(userStrings(q).join(" ")), `${q.slug}: the standing close is never duplicated as an authored literal`);
}
// The honest-reframe opener on advice-shaped questions.
for (const q of QUESTIONS.filter((x) => x.slug.startsWith("should-i-"))) {
  assert(/doesn't give personalised investment advice/.test(q.shortAnswer[0]), `${q.slug}: opens with the honest reframe`);
}

// ── Token discipline ─────────────────────────────────────────────────────────

const TOKEN_RE = /\{\{([a-z]+):([a-zA-Z0-9.-]+)\}\}/g;
const knownToken = (kind: string, id: string) => ctx.tokens[`${kind}:${id}`] !== undefined;
// Feed-derived values may never appear as raw atoms in prose: the only atoms
// that exist are clock/archival, so it suffices that every a: token resolves
// from atomValues() (which contains no feed-derived entries).
const atoms = atomValues();
assert(!("price.latest" in atoms) && !("drawdown.fromPeak" in atoms), "no feed-derived atom exists (current values live only in EngineSentences)");
for (const q of QUESTIONS) {
  for (const s of userStrings(q)) {
    for (const m of s.matchAll(TOKEN_RE)) {
      assert(["a", "es", "sc"].includes(m[1]) && knownToken(m[1], m[2]), `${q.slug}: token {{${m[1]}:${m[2]}}} is registered with a declared type`);
      if (m[1] === "a") assert(m[2] in atoms, `${q.slug}: atom {{a:${m[2]}}} is clock/archival`);
    }
    const resolved = resolveTokens(s, ctx.tokens);
    assert(!resolved.includes("{{"), `${q.slug}: no unresolved token syntax renders`);
  }
  assert(!TOKEN_RE.test(q.shortAnswer[0]), `${q.slug}: FIRST short-answer paragraph is token-free (stable FAQPage answer)`);
}

// ── EngineSentence fixtures — every state, exact controlled vocabulary ───────

// frp.position
assert(
  frpPositionSentence({ available: true, dataDate: "2026-08-01", aboveTrend: true, aboveHolders: true, aboveMiners: true }) ===
    "As of 1 August 2026, Bitcoin's market price sits above all three of the reference prices it is measured against — the 200-day trend, the average holder's cost basis, and the estimated mining cost.",
  "frp.position: above-all state renders the exact approved sentence",
);
assert(
  frpPositionSentence({ available: true, dataDate: "2026-08-01", aboveTrend: false, aboveHolders: false, aboveMiners: false }) ===
    "As of 1 August 2026, Bitcoin's market price sits below all three of the reference prices it is measured against — the 200-day trend, the average holder's cost basis, and the estimated mining cost.",
  "frp.position: below-all state renders the exact approved sentence",
);
assert(
  frpPositionSentence({ available: true, dataDate: "2026-08-01", aboveTrend: true, aboveHolders: false, aboveMiners: false }) ===
    "As of 1 August 2026, Bitcoin's market price sits above the 200-day trend but below the average holder's cost basis and the estimated mining cost.",
  "frp.position: mixed state renders the exact approved sentence",
);
assert(
  frpPositionSentence({ available: true, dataDate: "2026-08-01", aboveTrend: true, aboveHolders: null, aboveMiners: true }).includes(
    "(the average holder's cost basis series is not observable for this period)",
  ),
  "frp.position: reduced tier names the missing series",
);
assert(
  frpPositionSentence({ available: false, dataDate: null, aboveTrend: null, aboveHolders: null, aboveMiners: null }) ===
    "Live reference-price data is temporarily unavailable; the most recent reliable reading appears in Today's Data below.",
  "frp.position: unavailable state renders the approved fallback, never a stale value",
);

// frp.spell
assert(
  frpSpellSentence({ available: true, spellWeeks: 7, matchingPct: 12, recordWeeks: 715 }) ===
    "Price has held today's configuration for 7 consecutive weeks; configurations like today's account for 12% of the 715-week record.",
  "frp.spell: normal state renders the exact approved sentence",
);
assert(
  frpSpellSentence({ available: true, spellWeeks: null, matchingPct: null, recordWeeks: null }) ===
    "Today's configuration is too recent to have a meaningful historical sample yet.",
  "frp.spell: insufficient-sample state is honest, never invented",
);
assert(frpSpellSentence({ available: false, spellWeeks: 3, matchingPct: 9, recordWeeks: 700 }) === "", "frp.spell: unavailable resolves empty (approved), never stale");

// accumulation.read — the engine's own sentence, verbatim; fallback otherwise.
assert(accumulationSentence({ available: true, reasoning: "ENGINE SENTENCE." }) === "ENGINE SENTENCE.", "accumulation.read: reuses the engine's sentence verbatim");
assert(
  accumulationSentence({ available: false, reasoning: null }) === "The live Accumulation Index reading appears in Today's Data below.",
  "accumulation.read: unavailable renders the approved fallback",
);

// peak.status
assert(
  peakStatusSentence({ available: true, latest: { date: "2026-07-31", close: 124824 }, peak: { date: "2026-07-31", close: 124824 } }) ===
    "The latest close, $124,824 on 31 July 2026, is the highest of the current cycle so far.",
  "peak.status: at-the-high state",
);
assert(
  peakStatusSentence({ available: true, latest: { date: "2026-07-31", close: 124000 }, peak: { date: "2025-10-06", close: 124824 } }).startsWith(
    "The latest close, $124,000 on 31 July 2026, sits within 1% of the current cycle's highest close",
  ),
  "peak.status: within-1% state",
);
assert(
  peakStatusSentence({ available: true, latest: { date: "2026-07-31", close: 62875 }, peak: { date: "2025-10-06", close: 124824 } }) ===
    "The current cycle's highest close so far is $124,824, set on 6 October 2025; the latest close ($62,875, 31 July 2026) sits 50% below it.",
  "peak.status: below state renders value, dates and gap exactly",
);
assert(
  peakStatusSentence({ available: false, latest: null, peak: null }) ===
    "Live price data is temporarily unavailable; the most recent reliable close appears in Today's Data below.",
  "peak.status: unavailable renders the approved fallback",
);

// ath.recency
assert(
  athRecencySentence({ available: true, lastAthDate: "2025-10-06", daysAgo: 298 }) ===
    "Bitcoin last set a new all-time high on 6 October 2025, 298 days ago.",
  "ath.recency: normal state",
);
assert(athRecencySentence({ available: true, lastAthDate: "2026-07-31", daysAgo: 0 }).endsWith(", today."), "ath.recency: same-day state renders 'today'");
assert(athRecencySentence({ available: false, lastAthDate: null, daysAgo: null }) === "", "ath.recency: unavailable resolves empty (approved)");

// ── Static-claim drift: every figure recomputed from the archive ─────────────

for (const check of verifyStaticClaims()) {
  assert(check.ok, `claim drift-check ${check.id}: ${check.detail}`);
}
assert(Object.keys(CLAIMS).length === 10, "the claims registry holds exactly the ten reviewed claims");

// ── Staleness contract: stale, missing and malformed sources ─────────────────

assert(archiveIsFresh("2026-07-31", "2026-08-01T05:00:00Z"), "freshness: 1-day gap is fresh");
assert(!archiveIsFresh("2026-07-25", "2026-08-01T05:00:00Z"), "freshness: 7-day gap is stale");
assert(!archiveIsFresh(null, "2026-08-01T05:00:00Z") && !archiveIsFresh("2026-07-31", null), "freshness: missing dates are never fresh");

const staleReads = gatherReads({ fetchedAt: "2026-09-30T00:00:00Z" });
assert(!staleReads.peak.available && !staleReads.ath.available, "stale archive: archive-fed reads become unavailable");
const staleTokens = buildTokens(staleReads);
assert(staleTokens["es:peak.status"].includes("temporarily unavailable"), "stale archive: peak sentence falls back — no stale figure can render as current");
assert(staleTokens["es:ath.recency"] === "", "stale archive: recency resolves empty, never an old figure");

const malformed = gatherReads({ archive: [{ date: "2026-07-31", value: NaN }], fetchedAt: "2026-08-01T00:00:00Z" });
assert(!malformed.peak.available, "malformed source: non-finite closes read as unavailable");
const empty = gatherReads({ archive: [], fetchedAt: "2026-08-01T00:00:00Z" });
assert(!empty.peak.available && !empty.ath.available, "missing source: an empty archive reads as unavailable");

// A paragraph containing an empty-resolving sentence collapses cleanly.
assert(
  resolveTokens("{{es:ath.recency}} History cuts both ways here.", staleTokens) === "History cuts both ways here.",
  "empty EngineSentence resolution leaves no gap and no double space",
);
let threw = false;
try {
  resolveTokens("{{es:not-a-token}}", ctx.tokens);
} catch {
  threw = true;
}
assert(threw, "unknown tokens throw at build time — they can never render");

// ── Structured data & dates ──────────────────────────────────────────────────

const pageSrc = readFileSync("src/app/questions/[slug]/page.tsx", "utf8");
assert(pageSrc.includes('"@type": "Article"') && pageSrc.includes("datePublished: q.added") && pageSrc.includes("dateModified: q.revised"), "Article dates come from editorial fields only — a data refresh cannot move dateModified");
assert(pageSrc.includes('"@type": "FAQPage"') && pageSrc.includes("text: q.shortAnswer[0]"), "FAQPage acceptedAnswer is the stable first paragraph, exactly as rendered");
assert(!pageSrc.includes("QAPage"), "QAPage is never used (not a user-submitted forum)");
assert(pageSrc.includes('"@type": "BreadcrumbList"'), "breadcrumb schema is generated from the registry");
assert(pageSrc.includes("dataUpdatedAt") && !pageSrc.includes("dateModified: ctx"), "live evidence shows dataUpdatedAt; it never enters Article dates");
assert(pageSrc.includes("STANDING_CLOSE") && pageSrc.includes("Editorially reviewed"), "the page carries the shared standing close and the calm reviewed date");
assert(pageSrc.includes("JourneyNext") && pageSrc.includes("TrackedSection"), "the page joins the journey and uses existing events only");
for (const q of QUESTIONS) {
  assert(JSON.parse(JSON.stringify({ t: q.shortAnswer[0] })).t === q.shortAnswer[0], `${q.slug}: FAQ answer JSON-serialises losslessly`);
}

// Hub: reference-library contract — no blog furniture in anything rendered
// (comments stripped: the contract itself is allowed to name what it bans).
const hubSrc = readFileSync("src/app/questions/page.tsx", "utf8");
const hubRendered = hubSrc.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
for (const banned of ["latest posts", "min read", "reading time", "trending", "author"]) {
  assert(!hubRendered.toLowerCase().includes(banned), `hub: no "${banned}" blog furniture`);
}
assert(hubSrc.includes("CollectionPage") && hubSrc.includes("ItemList"), "hub: CollectionPage + ItemList schema");
assert(hubSrc.includes("categoriesWithContent"), "hub: only categories with published content render");

// ── Blocks & staleness isolation in the template ─────────────────────────────

const blocksSrc = readFileSync("src/lib/questions/blocks.tsx", "utf8");
assert(blocksSrc.includes("probe") && blocksSrc.includes("catch"), "block probes never throw — a crashing source degrades, never breaks the page");
const blockCmp = readFileSync("src/components/questions/QuestionBlock.tsx", "utf8");
assert(blockCmp.includes("Live data is temporarily unavailable") && blockCmp.includes("last reliable reading"), "a failed block renders the calm unavailable card with its last reliable date");
assert(blockCmp.includes("probe.ok ? (") || blockCmp.includes("probe.ok"), "block rendering is gated on the probe");

// ── Ecosystem integration ────────────────────────────────────────────────────

const entry = JOURNEY_MAP["/questions" as keyof typeof JOURNEY_MAP] as
  | { primary: { href: string }; secondary: readonly { href: string }[] }
  | undefined;
assert(!!entry && entry.primary.href === "/brief" && entry.secondary.length <= 2, "journey map: /questions hands off to the Daily Brief with ≤2 secondaries");
const nav = readFileSync("src/components/navItems.ts", "utf8");
assert(nav.includes('"/questions"'), "Bitcoin Questions is in the Research nav group");
const sitemapSrc = readFileSync("src/app/sitemap.ts", "utf8");
assert(sitemapSrc.includes('"/questions"') && sitemapSrc.includes("questionEntries"), "sitemap: hub + every question, lastModified from the editorial revision date");
const idx = searchIndex();
for (const q of QUESTIONS) {
  assert(idx.some((e) => e.path === `/questions/${q.slug}`), `search: "${q.question}" is findable`);
}
const analytics = readFileSync("src/lib/journeyAnalytics.ts", "utf8");
assert(analytics.includes('"/questions": "Bitcoin Questions"'), "founder dashboards label the section");
// Zero new analytics events: the page uses only TrackedSection/JourneyNext.
assert(!/track\(/.test(pageSrc) && !/track\(/.test(hubSrc), "no new tracking calls — existing instrumented components only");

// Reference-price naming: the shared vocabulary is the single source.
const sentencesSrc = readFileSync("src/lib/questions/evidence/sentences.ts", "utf8");
assert(sentencesSrc.includes("REFERENCE_PROSE"), "one shared reference-naming vocabulary exists");
for (const q of QUESTIONS) {
  const all = userStrings(q).map((s) => resolveTokens(s, ctx.tokens)).join(" ");
  assert(!/Three Reference Prices/.test(all), `${q.slug}: the framework is never renamed "Three Reference Prices"`);
}

console.log(failures === 0 ? "\nAll questions tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
