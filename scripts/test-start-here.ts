// Deterministic tests for the Start Here experience — the beginner narrative.
// Structure (seven chapters, numbered eyebrows, approved hero), integration
// (journey map, nav, sitemap, analytics labels), and register (banned
// vocabulary, single-sourced standing close, no prediction promises).
// Run: npm run test-start-here

import { readFileSync } from "node:fs";
import { JOURNEY_MAP } from "../src/lib/journeyMap";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

const pageSrc = readFileSync("src/app/start-here/page.tsx", "utf8");

// ── Structure ────────────────────────────────────────────────────────────────

assert(pageSrc.includes("Bitcoin, explained calmly."), "the approved hero headline is exact");
assert(pageSrc.includes("no one trying to sell you anything"), "the hero sub keeps its disarming promise");
const chapters = pageSrc.match(/CHAPTERS = \[([\s\S]*?)\]/)?.[1] ?? "";
assert((chapters.match(/"/g) ?? []).length === 14, "exactly seven chapters are defined");
assert(pageSrc.includes("Chapter {n} of {CHAPTERS.length}"), "chapter eyebrows carry the N-of-7 wayfinding");
assert(pageSrc.includes("ChapterRail"), "the desktop dot rail is present");
for (const q of [
  "Why does Bitcoin exist?",
  "Why do people think it has value?",
  "Why is it so volatile?",
  "Why does everyone talk about cycles?",
  "Why do ETFs matter?",
  "What are the biggest misconceptions?",
  "Why historical context instead of predictions?",
]) {
  assert(pageSrc.includes(q), `chapter present: "${q}"`);
}

// ── The bridge is the approved ladder ────────────────────────────────────────

assert(pageSrc.includes("TodaysConfigurationCard"), "the bridge reuses the Today's Configuration pack card unchanged");
assert(pageSrc.includes("BriefSignup"), "the bridge ends in the inline brief signup");
assert(pageSrc.includes("Learn as you go"), "the signup heading is the beginner-tuned line");
assert(pageSrc.includes('JourneyNext from="/start-here"'), "the page carries a Continue-your-journey placement");
assert(pageSrc.indexOf("<TodaysConfigurationCard") < pageSrc.indexOf("<BriefSignup"), "configuration comes before the signup in the bridge");

// ── Register ─────────────────────────────────────────────────────────────────

assert(pageSrc.includes("STANDING_CLOSE") && !pageSrc.includes("Historical context, not a prediction."), "the standing close is the shared constant, never a literal");
// Banned vocabulary as market-analysis terms. "no price targets" style negations
// are permitted; this page's copy simply avoids the words entirely.
const copyOnly = pageSrc.replace(/import[\s\S]*?from ".*?";/g, "");
for (const re of [/\bsupport\b/i, /\bfloor\b/i, /fair value/i, /break-?even/i, /price target/i, /\bwill (rise|fall|reach|hit)\b/i, /guarantee/i, /moon\b/i]) {
  assert(!re.test(copyOnly), `copy avoids ${re}`);
}
assert(/pattern, not a law/.test(pageSrc), "the small-sample honesty clause is in the cycles chapter");
assert(/context for the present, not a script/.test(pageSrc), "the ETF chapter carries the history-is-not-a-script caveat");

// ── Integration ──────────────────────────────────────────────────────────────

const entry = JOURNEY_MAP["/start-here" as keyof typeof JOURNEY_MAP] as
  | { primary: { href: string }; secondary: readonly { href: string }[] }
  | undefined;
assert(!!entry, "journey map has a /start-here entry (Growth engine sees it as implemented on day one)");
assert(entry?.primary.href === "/four-reference-prices", "the primary hand-off is Four Reference Prices (the approved ladder)");
assert((entry?.secondary.length ?? 0) <= 2, "at most two secondary destinations (house rule)");

const nav = readFileSync("src/components/navItems.ts", "utf8");
assert(/EXPLORE[\s\S]*?\[\s*\{ href: "\/start-here", label: "Start Here"/.test(nav), "Start Here is first in the Explore nav group (and thus in the search index)");

const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
assert(sitemap.includes('"/start-here"') && /EVERGREEN = new Set\(\[.*"\/start-here"/.test(sitemap), "the page is in the sitemap as evergreen content");

const analytics = readFileSync("src/lib/journeyAnalytics.ts", "utf8");
assert(analytics.includes('"/start-here": "Start Here"'), "founder dashboards label the page by name");

console.log(failures === 0 ? "\nAll start-here tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
