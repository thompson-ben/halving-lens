// Deterministic tests for the /free ad-congruent headline map (message match).
// The map is an allowlist: only exact keys and exact known paid aliases
// resolve; everything else — absent, unknown, abandoned, attacker-crafted —
// falls back to the default. Every entry must keep the house register: no
// banned vocabulary, no hype, no prediction promises, no trading instruction,
// and no concept Programme 1 retired from acquisition.
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

// ── The six CURRENTLY ACTIVE paid creatives ─────────────────────────────────
// Pinned from the supplied ad-copy export (17 Aug 2026) and the delivery report
// for 18 Jul – 16 Aug 2026. `adLine` is the ad's own wording that the landing
// headline continues — quoted here so a copy change cannot silently break the
// link between the ad and the page.

const CURRENT_ACTIVE: { name: string; id: string; message: string; headline: string; adLine: string }[] = [
  {
    name: "hl_meta_001_ad001_803", id: "52532453901711", message: "cycle-day",
    headline: "You know the price. Here's where the cycle stands.",
    adLine: "Most Bitcoin investors know today's price. Very few know where we actually are in the cycle.",
  },
  {
    name: "hl_meta_001_ad002_accumulation17", id: "52532999193711", message: "accumulation",
    headline: "Bitcoin becomes attractive when history says it is.",
    adLine: "It becomes attractive when history says it is.",
  },
  {
    name: "hl_meta_001_ad003_clearest_view", id: "52532999193911", message: "clearest-view",
    headline: "The clearest view of the Bitcoin cycle.",
    adLine: "The clearest view of the Bitcoin cycle.",
  },
  {
    name: "hl_meta_001_ad005_should_you_buy", id: "52532999194511", message: "should-you-buy",
    headline: "We won't tell you what to do.",
    adLine: "We won't tell you what to do.",
  },
  {
    name: "hl_meta_001_ad006_daily_brief", id: "52532999194311", message: "daily-brief",
    headline: "One clear briefing. Every morning. Free.",
    adLine: "One clear briefing. Every morning.",
  },
  {
    name: "hl_meta_001_ad007_crowd_fearful", id: "52532999194111", message: "crowd-fear",
    headline: "The crowd is fearful. History wasn't.",
    adLine: "The Crowd Is Fearful. History Wasn't.",
  },
];

console.log("Currently active paid creatives:");
for (const c of CURRENT_ACTIVE) {
  const byName = resolveFreeHeadline(c.name);
  const byId = resolveFreeHeadline(c.id);
  assert(byName.key === c.message, `"${c.name}" → "${c.message}"`);
  assert(byId.key === c.message, `ad ID ${c.id} → "${c.message}"`);
  // The whole point of the alias layer: name and ID are the SAME message, the
  // same object, not two copies that can drift apart.
  assert(byId.copy === byName.copy, `ad ID ${c.id} ≡ "${c.name}" (identical message object)`);
  assert(byName.copy.headline === c.headline, `"${c.message}" shows the approved headline`);
  assert(byName.copy !== DEFAULT_FREE_HEADLINE, `"${c.message}" no longer lands on the default headline`);
  assert(!!byName.copy.sub, `"${c.message}" carries its own sub (continues the ad's own body copy)`);
}
assert(CURRENT_ACTIVE.length === 6, "all six currently active creatives are covered");

// ── Historical duplicates keep working; abandoned challengers do not ─────────

const HISTORICAL_DUPLICATES: [string, string][] = [
  ["52547863281711", "cycle-day"],
  ["52547863281311", "accumulation"],
  ["52547863280511", "should-you-buy"],
  ["52547863280711", "daily-brief"],
];
// Abandoned challengers and never-run ads. Their copy was never supplied, so
// there is no promise to continue: they MUST reach the default rather than
// inherit a message invented from their filename.
const ABANDONED = [
  "hl_meta_001_ad003_doesnt_care", "52547863281111",
  "hl_meta_001_ad004_where_are_we", "52547863281511",
  "hl_meta_001_ad004_history_context", "52532999193511",
];

console.log("Historical identities:");
for (const [id, message] of HISTORICAL_DUPLICATES) {
  assert(resolveFreeHeadline(id).key === message,
    `historical duplicate ${id} still resolves to "${message}" (old paid links do not degrade)`);
}
for (const v of ABANDONED) {
  assert(resolveFreeHeadline(v).key === "default", `abandoned identity "${v}" falls back to the default`);
}
assert(!Object.values(PAID_CREATIVE_ALIASES).includes("market-indifferent") &&
  !Object.values(PAID_CREATIVE_ALIASES).includes("where-are-we"),
  "no landing promise was invented for an abandoned creative");
assert(!("market-indifferent" in FREE_HEADLINES) && !("where-are-we" in FREE_HEADLINES),
  "the filename-inferred messages were removed, not merely unlinked");

// ── Alias-map integrity ──────────────────────────────────────────────────────

console.log("Alias map integrity:");
{
  const aliases = Object.keys(PAID_CREATIVE_ALIASES);
  assert(aliases.length === 16, "16 aliases: 6 active names + 6 active IDs + 4 historical duplicate IDs");
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
  // Every resolvable value produces real copy — there is no blank/error state.
  for (const v of [...aliases, ...Object.keys(FREE_HEADLINES), ...ABANDONED, "", "unknown", "__proto__"]) {
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
const paid = Object.entries(FREE_HEADLINES).filter(([k]) => CURRENT_ACTIVE.some((c) => c.message === k));
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

// ── Programme 1 is not undone by the message-match repair ────────────────────
// Two of the live creatives still show readings Programme 1 removed from
// acquisition, and one shows a Daily Brief section the shipped V2 email no
// longer contains. Continuing those ads must NOT mean putting the retired
// concepts back on /free. This is the guard that keeps the landing page honest
// even while the creative catches up.

console.log("Programme 1 retirements hold:");
const RETIRED_ON_ACQUISITION = [/context score/i, /what to watch/i, /high conviction/i, /low risk/i];
for (const [key, c] of paid) {
  const text = `${c.headline} ${c.sub ?? ""}`;
  assert(RETIRED_ON_ACQUISITION.every((re) => !re.test(text)),
    `"${key}" does not resurrect a retired acquisition promise`);
}
// A paid headline must not quote a reading that goes stale. The ads say "803"
// and "17/100"; both were true when built and are not true now.
for (const [key, c] of paid) {
  const text = `${c.headline} ${c.sub ?? ""}`;
  assert(!/\b803\b/.test(text) && !/\b17\s*\/\s*100\b/.test(text) && !/\b78\s*\/\s*100\b/.test(text),
    `"${key}" quotes no frozen live reading from the creative`);
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
