// Deterministic tests for the /free ad-congruent headline map (message match).
// The map is an allowlist: only exact keys and exact known paid aliases
// resolve; everything else — absent, unknown, attacker-crafted — falls back to
// the default. Every entry must keep the house register: no banned vocabulary,
// no hype, no prediction promises.
// Run: npm run test-free-headlines

import { readFileSync } from "node:fs";
import {
  DEFAULT_FREE_HEADLINE,
  FREE_HEADLINES,
  PAID_CREATIVE_ALIASES,
  canonicalCreative,
  resolveFreeHeadline,
} from "../src/lib/freeHeadlines";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };
const read = (p: string) => readFileSync(p, "utf8");

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

// ── Paid message match: the live creatives, both key spaces ─────────────────
// Pinned from the Meta ad export for 18 Jul – 16 Aug 2026. Each row is ONE
// creative angle: its ad name, every ad ID that has carried it, and the message
// key both must resolve to. If an ad is renamed the ID rows still match; if an
// ad is duplicated into another campaign the name row still matches.

const LIVE_CREATIVES: { name: string; ids: string[]; message: string }[] = [
  { name: "hl_meta_001_ad001_803", ids: ["52532453901711", "52547863281711"], message: "cycle-day" },
  { name: "hl_meta_001_ad002_accumulation17", ids: ["52532999193711", "52547863281311"], message: "accumulation" },
  { name: "hl_meta_001_ad003_clearest_view", ids: ["52532999193911"], message: "clearest-view" },
  { name: "hl_meta_001_ad003_doesnt_care", ids: ["52547863281111"], message: "market-indifferent" },
  { name: "hl_meta_001_ad004_history_context", ids: ["52532999193511"], message: "context" },
  { name: "hl_meta_001_ad004_where_are_we", ids: ["52547863281511"], message: "where-are-we" },
  { name: "hl_meta_001_ad005_should_you_buy", ids: ["52532999194511", "52547863280511"], message: "should-you-buy" },
  { name: "hl_meta_001_ad006_daily_brief", ids: ["52532999194311", "52547863280711"], message: "daily-brief" },
  { name: "hl_meta_001_ad007_crowd_fearful", ids: ["52532999194111"], message: "crowd-fear" },
];

console.log("Paid creatives — every live name and every live ad ID:");
for (const c of LIVE_CREATIVES) {
  const byName = resolveFreeHeadline(c.name);
  assert(byName.key === c.message, `"${c.name}" → "${c.message}"`);
  assert(byName.copy !== DEFAULT_FREE_HEADLINE, `"${c.name}" no longer lands on the default headline`);
  for (const id of c.ids) {
    const byId = resolveFreeHeadline(id);
    assert(byId.key === c.message, `ad ID ${id} → "${c.message}"`);
    // The whole point of the alias layer: name and ID are the SAME message,
    // the same object, not two copies that can drift apart.
    assert(byId.key === byName.key && byId.copy === byName.copy, `ad ID ${id} ≡ "${c.name}" (identical message)`);
  }
}
assert(LIVE_CREATIVES.length === 9, "all nine live ad names are covered");
assert(LIVE_CREATIVES.reduce((n, c) => n + c.ids.length, 0) === 13, "all thirteen live ad IDs are covered");

// ── Alias-map integrity ──────────────────────────────────────────────────────

console.log("Alias map integrity:");
{
  const aliases = Object.keys(PAID_CREATIVE_ALIASES);
  assert(aliases.every((a) => !Object.prototype.hasOwnProperty.call(FREE_HEADLINES, a)),
    "no alias collides with a message key (an alias can never shadow one)");
  assert(Object.values(PAID_CREATIVE_ALIASES).every((k) => Object.prototype.hasOwnProperty.call(FREE_HEADLINES, k)),
    "every alias points at a message that exists");
  assert(aliases.every((a) => canonicalCreative(a) === PAID_CREATIVE_ALIASES[a]),
    "every alias canonicalises to its own message key");
  assert(Object.keys(FREE_HEADLINES).every((k) => canonicalCreative(k) === k),
    "every message key canonicalises to itself");
  assert(canonicalCreative(null) === null && canonicalCreative("") === null && canonicalCreative("nope") === null,
    "canonicalCreative reports null — never a guess — for absent, empty or unknown input");
  // A message key deleted out from under an alias must degrade to the default,
  // not to a blank hero. Proven against a deliberately dangling alias.
  const dangling: Record<string, string> = Object.assign(Object.create(null), { x: "no-such-message" });
  assert(!Object.prototype.hasOwnProperty.call(FREE_HEADLINES, dangling.x),
    "a dangling alias target is genuinely absent from the message map");
  // Every resolvable value produces real copy — there is no blank/error state.
  for (const v of [...aliases, ...Object.keys(FREE_HEADLINES), "", "unknown", "__proto__"]) {
    const r = resolveFreeHeadline(v);
    assert(typeof r.copy.headline === "string" && r.copy.headline.trim().length > 0,
      `"${v}" always yields a real headline (never blank, error or placeholder)`);
  }
}

// ── The pre-existing entries are untouched ───────────────────────────────────
// The default is the promise made to organic and unmatched traffic; the three
// original keys predate the paid repair. All four are pinned byte-exact.

console.log("Pre-existing copy is unchanged:");
assert(DEFAULT_FREE_HEADLINE.headline === "Know where Bitcoin sits in its cycle.",
  "the default headline is unchanged");
assert(DEFAULT_FREE_HEADLINE.sub ===
  "Get one clear Bitcoin cycle update each morning — what changed, what history shows, and what to watch next. Free, evidence-led, and written without hype or predictions.",
  "the default sub is unchanged");
assert(FREE_HEADLINES.calm.headline === "Bitcoin research, without the noise." && FREE_HEADLINES.calm.sub === undefined,
  '"calm" is unchanged');
assert(FREE_HEADLINES.context.headline === "What history says about today's Bitcoin market." &&
  FREE_HEADLINES.context.sub ===
  "Every morning we compare today against Bitcoin's full recorded history — what changed, what past moments looked similar, and what followed. Free, and written without hype or predictions.",
  '"context" is unchanged');
assert(FREE_HEADLINES.morning.headline === "One calm Bitcoin read, every morning." && FREE_HEADLINES.morning.sub === undefined,
  '"morning" is unchanged');

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
// No paid message may answer the question the product refuses to answer, or
// promise a future price. The ad may ask "should you buy?"; the landing may not
// reply with one.
const INSTRUCTION = [/\byou should (buy|sell|hold)\b/i, /\bbuy now\b/i, /\btime to (buy|sell)\b/i, /\bwill (rise|fall|reach|hit)\b/i, /\bgoing to \$?\d/i];
for (const [key, c] of all) {
  const text = `${c.headline} ${c.sub ?? ""}`;
  assert(INSTRUCTION.every((re) => !re.test(text)), `"${key}" gives no trading instruction and no forecast`);
}

// ── Wiring ───────────────────────────────────────────────────────────────────

const heroSrc = read("src/components/LandingClient.tsx");
assert(heroSrc.includes("resolveFreeHeadline"), "FreeHero resolves through the allowlist — never raw URL text");
assert(heroSrc.includes('get("utm_content")'), "the CURRENT visit's utm_content drives the headline (not first-touch)");
assert(/new URLSearchParams\(window\.location\.search\)/.test(heroSrc),
  "the headline is read from the CURRENT landing URL, not from stored attribution");
assert(!/resolveFreeHeadline\(\s*getAttribution/.test(heroSrc),
  "the headline is never resolved from first-touch attribution");
assert(heroSrc.includes("headline: resolved.key"), "landing_view carries the resolved key for per-creative measurement");
assert(!heroSrc.includes("Know where Bitcoin sits in its cycle."), "the default headline lives only in the lib (single source)");

// ── Blast radius: this is a copy/alias change and nothing else ───────────────
// The repair must not reach acquisition attribution, analytics taxonomy or any
// Meta-side configuration.

console.log("Blast radius:");
{
  const lib = read("src/lib/freeHeadlines.ts");
  assert(!/\btrack\(|fetch\(|sendBeacon|localStorage/.test(lib),
    "the headline map is pure data and pure functions — it emits nothing and stores nothing");
  assert(!/import .* from "\.\/(attribution|track|analyticsEvents)"/.test(lib),
    "the headline map does not reach into attribution or the analytics taxonomy");

  const attribution = read("src/lib/attribution.ts");
  assert(/if \(localStorage\.getItem\(KEY\)\) return;/.test(attribution),
    "acquisition attribution is still FIRST-TOUCH and still never overwritten");
  assert(!/freeHeadlines|canonicalCreative|PAID_CREATIVE_ALIASES/.test(attribution),
    "attribution is unaware of message match — the two stay separate concerns");

  const events = read("src/lib/analyticsEvents.ts");
  assert(!/message_match|creative_match|headline_match/.test(events),
    "no new analytics event was introduced");
  assert(/"landing_view"/.test(events),
    "message match still rides the existing landing_view event");
}

console.log(failures === 0 ? "\nAll free-headline tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
