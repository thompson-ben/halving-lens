// Deterministic tests for the /free ad-congruent headline map (message match).
// The map is an allowlist: only exact keys resolve; everything else — absent,
// unknown, attacker-crafted — falls back to the default. Every entry must keep
// the house register: no banned vocabulary, no hype, no prediction promises.
// Run: npm run test-free-headlines

import { readFileSync } from "node:fs";
import { DEFAULT_FREE_HEADLINE, FREE_HEADLINES, resolveFreeHeadline } from "../src/lib/freeHeadlines";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

// ── Allowlist resolution ─────────────────────────────────────────────────────

for (const key of Object.keys(FREE_HEADLINES)) {
  const r = resolveFreeHeadline(key);
  assert(r.key === key && r.copy === FREE_HEADLINES[key], `"${key}" resolves to its own copy`);
}
assert(resolveFreeHeadline(null).key === "default", "null utm_content falls back to default");
assert(resolveFreeHeadline(undefined).key === "default", "absent utm_content falls back to default");
assert(resolveFreeHeadline("").key === "default", "empty utm_content falls back to default");
assert(resolveFreeHeadline("unknown-ad").key === "default", "unknown keys fall back to default");
assert(resolveFreeHeadline("__proto__").key === "default", "prototype keys never resolve (own-property check)");
assert(resolveFreeHeadline("constructor").key === "default", "constructor never resolves");
assert(resolveFreeHeadline("CALM").key === "default", "matching is exact — no case folding of URL input");
assert(resolveFreeHeadline("<script>alert(1)</script>").key === "default", "free text from the URL can never reach the page");

// ── Entry hygiene ────────────────────────────────────────────────────────────

const all = [["default", DEFAULT_FREE_HEADLINE] as const, ...Object.entries(FREE_HEADLINES)];
assert(Object.keys(FREE_HEADLINES).every((k) => /^[a-z0-9-]{2,32}$/.test(k)), "keys are short url-safe slugs");
assert(all.every(([, c]) => c.headline.trim().length >= 8 && c.headline.trim().length <= 80), "headlines are substantial but hero-sized");
assert(!!DEFAULT_FREE_HEADLINE.sub, "the default carries a sub so entries without one always have a fallback");

// The banned vocabulary and hype register, across every headline and sub.
const BANNED = [/\bsupport\b/i, /\bfloor\b/i, /fair value/i, /break-?even/i, /\btarget/i, /predict(?!ions\b)/i, /guarantee/i, /moon/i, /don't miss/i, /last chance/i, /!\s*$/];
for (const [key, c] of all) {
  const text = `${c.headline} ${c.sub ?? ""}`;
  assert(BANNED.every((re) => !re.test(text)), `"${key}" copy avoids banned vocabulary, urgency and hype`);
}
// "predictions" may appear only in the negated house register.
for (const [key, c] of all) {
  const text = `${c.headline} ${c.sub ?? ""}`;
  const mentions = text.match(/predictions/gi) ?? [];
  assert(mentions.length === 0 || /without hype or predictions/i.test(text), `"${key}" mentions predictions only to disclaim them`);
}

// ── Wiring ───────────────────────────────────────────────────────────────────

const heroSrc = readFileSync("src/components/LandingClient.tsx", "utf8");
assert(heroSrc.includes("resolveFreeHeadline"), "FreeHero resolves through the allowlist — never raw URL text");
assert(heroSrc.includes('get("utm_content")'), "the CURRENT visit's utm_content drives the headline (not first-touch)");
assert(heroSrc.includes("headline: resolved.key"), "landing_view carries the resolved key for per-creative measurement");
assert(!heroSrc.includes("Know where Bitcoin sits in its cycle."), "the default headline lives only in the lib (single source)");

console.log(failures === 0 ? "\nAll free-headline tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
