// Ad-congruent headlines for the /free paid landing (message match).
//
// The strongest known lever on paid-landing conversion is repeating the
// clicked ad's promise on arrival. Each paid creative sets `utm_content` and
// the hero repeats that promise; anything else — absent, unknown, retired, or
// attacker-crafted — falls back to the default. The resolved key travels on
// `landing_view` (and `utm_content` rides every funnel event via first-touch
// attribution), so each creative's conversion is measurable end-to-end with no
// new event names.
//
// TWO KEY SPACES, ONE MESSAGE
// ---------------------------
// `utm_content` does not arrive in one shape. Meta substitutes whatever the
// ad's tracking template asks for, so the SAME creative reaches us as either
// the ad NAME (`hl_meta_001_ad001_803`) or the ad ID (`52532453901711`). Ad
// names are not stable identities either: the account has reused the
// `ad003`/`ad004` slots for different angles, and one creative can carry
// several ad IDs (duplicating an ad into another campaign mints a new one). So
// neither the name nor "the" ad ID is a usable canonical identity on its own.
//
// The canonical identity is therefore the MESSAGE, not the ad object: every
// known name and every known ad ID is an alias that resolves to one short
// message key, and the message key owns the copy. That keeps a single
// definition per promise, groups name-arrivals and ID-arrivals together in
// measurement, and survives renames, duplication and re-IDs without touching
// anything in Meta.
//
//   incoming utm_content → PAID_CREATIVE_ALIASES → message key → headline
//
// Unknown, absent, malformed or retired values resolve to DEFAULT_FREE_HEADLINE.
// There is no blank, error or placeholder state.
//
// CURRENT vs HISTORICAL
// ---------------------
// Only CURRENTLY ACTIVE creatives get a message of their own, and every one of
// those messages is written from the ad's real copy — never from its filename.
// Abandoned challengers are NOT current propositions: they get no bespoke
// landing promise and fall through to the default. The one exception is an
// abandoned ad that is a straight duplicate of a current one (same ad name, new
// ad ID); those IDs keep pointing at the current message, because an old paid
// link should not behave worse than a new one and no new promise is invented.
//
// Rules for every entry, enforced by scripts/test-free-headlines.ts:
// same honest register as the site (no hype, no urgency, no prediction
// promises, no trading instruction, none of the banned vocabulary), keys are
// short url-safe slugs, and no paid message may quote a live reading that goes
// stale (a cycle day, a score) or a concept Programme 1 retired from
// acquisition.

export interface FreeHeadline {
  headline: string;
  /** Optional matching subheading; entries without one keep the default. */
  sub?: string;
}

export const DEFAULT_FREE_HEADLINE: FreeHeadline = {
  headline: "Know where Bitcoin sits in its cycle.",
  sub: "Get one clear Bitcoin cycle update each morning — what changed, what history shows, and what to watch next. Free, evidence-led, and written without hype or predictions.",
};

// One entry per MESSAGE. Never remove a key while an alias still points at it.
export const FREE_HEADLINES: Record<string, FreeHeadline> = {
  calm: {
    headline: "Bitcoin research, without the noise.",
  },
  context: {
    headline: "What history says about today's Bitcoin market.",
    sub: "Every morning we compare today against Bitcoin's full recorded history — what changed, what past moments looked similar, and what followed. Free, and written without hype or predictions.",
  },
  morning: {
    headline: "One calm Bitcoin read, every morning.",
  },

  // ── Paid messages, one per CURRENTLY ACTIVE creative ──────────────────────
  // Each is written from the ad's actual primary text, headline and creative —
  // continuing the promise the visitor just clicked, and never making a
  // stronger one. None quotes the ad's live figures (cycle day 803, score
  // 17/100): those were true when the ad was built and are already stale, so
  // repeating them on the landing page would make it false.

  // ad001 · "Most Bitcoin investors know today's price. Very few know where we
  // actually are in the cycle." The landing continues that sentence.
  "cycle-day": {
    headline: "You know the price. Here's where the cycle stands.",
    sub: "Today's cycle day, placed against the same point in every previous Bitcoin cycle — what changed, and what followed. Free each morning, written without hype or predictions.",
  },
  // ad002 · "It becomes attractive when history says it is." Continued verbatim.
  // The ad's "Accumulation Score" is the product's Accumulation Index; the
  // landing uses the product's own name for it.
  accumulation: {
    headline: "Bitcoin becomes attractive when history says it is.",
    sub: "The Accumulation Index places today against Bitcoin's recorded history — historically cheap, neutral or stretched — and shows what similar conditions looked like. How much you buy stays your decision. Free each morning, written without hype or predictions.",
  },
  // ad003 · the Meta headline, continued word for word, with the ad's own
  // question and cadence beneath it.
  "clearest-view": {
    headline: "The clearest view of the Bitcoin cycle.",
    sub: "Where does today's market sit against 13+ years of Bitcoin history? One clear answer, every morning, completely free — written without hype or predictions.",
  },
  // ad005 · "We won't tell you what to do... Then you decide." The ad asks a
  // question the product refuses to answer; the landing refuses it in the open
  // rather than implying an answer.
  "should-you-buy": {
    headline: "We won't tell you what to do.",
    sub: "We'll show you where today's market sits compared to every previous Bitcoin cycle. Then you decide. Free each morning, written without hype or predictions.",
  },
  // ad006 · the creative's own line, then its own primary text.
  "daily-brief": {
    headline: "One clear briefing. Every morning. Free.",
    sub: "One email each morning that explains where Bitcoin sits in its cycle, in plain English — a calm daily briefing grounded in 13+ years of market history. Written without hype or predictions.",
  },
  // ad007 · the Meta headline, continued word for word.
  "crowd-fear": {
    headline: "The crowd is fearful. History wasn't.",
    sub: "The loudest voices arrive when markets are most emotional. Every morning we compare today against 13+ years of Bitcoin history, so you can see where today's price sits in the cycle. Free, and written without hype or predictions.",
  },
};

// Every known paid identity → its message key. BOTH shapes are listed for each
// creative: the ad name as authored in Meta, and every ad ID that has carried
// it. Adding a creative costs one line here; nothing in Meta has to change, and
// an ad can be renamed without breaking its ID alias.
//
// Verified against the ad-copy export of 17 Aug 2026 and the delivery report
// for 18 Jul – 16 Aug 2026.
export const PAID_CREATIVE_ALIASES: Record<string, string> = {
  // ── CURRENTLY ACTIVE (campaign hl_meta_001) ─────────────────────────────
  hl_meta_001_ad001_803: "cycle-day",
  "52532453901711": "cycle-day",

  hl_meta_001_ad002_accumulation17: "accumulation",
  "52532999193711": "accumulation",

  hl_meta_001_ad003_clearest_view: "clearest-view",
  "52532999193911": "clearest-view",

  hl_meta_001_ad005_should_you_buy: "should-you-buy",
  "52532999194511": "should-you-buy",

  hl_meta_001_ad006_daily_brief: "daily-brief",
  "52532999194311": "daily-brief",

  hl_meta_001_ad007_crowd_fearful: "crowd-fear",
  "52532999194111": "crowd-fear",

  // ── HISTORICAL DUPLICATES (campaign hl_meta_002, no longer delivering) ───
  // Same ad NAME as a current creative, new ad ID because the ad was
  // duplicated into a challenger campaign that was not continued. They keep
  // the current message: it is the same creative, so no new promise is
  // invented, and an old paid link keeps working rather than degrading to the
  // generic default.
  "52547863281711": "cycle-day", // dup of ad001_803
  "52547863281311": "accumulation", // dup of ad002_accumulation17
  "52547863280511": "should-you-buy", // dup of ad005_should_you_buy
  "52547863280711": "daily-brief", // dup of ad006_daily_brief

  // ── DELIBERATELY ABSENT ─────────────────────────────────────────────────
  // hl_meta_001_ad003_doesnt_care  / 52547863281111  — abandoned challenger
  // hl_meta_001_ad004_where_are_we / 52547863281511  — abandoned challenger
  // hl_meta_001_ad004_history_context / 52532999193511 — inactive, never spent
  //
  // These are not current propositions and their copy has never been supplied,
  // so there is nothing to continue truthfully. They resolve to the existing
  // default, which is the correct behaviour for a promise we cannot verify.
};

const own = (o: Record<string, unknown>, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * Resolve any incoming `utm_content` to a canonical MESSAGE key, or null when
 * it is absent, malformed or not a known identity.
 *
 * A message key resolves to itself, so the pre-existing organic keys keep
 * working and an alias can never shadow one. An alias resolves to its message
 * key — and only if that key still exists, so a stale alias degrades to the
 * default rather than to nothing. Matching is exact: no case folding, no
 * trimming, no fuzzy matching. Free text from the URL can never reach the page.
 */
export function canonicalCreative(utmContent: string | null | undefined): string | null {
  if (typeof utmContent !== "string" || utmContent === "") return null;
  if (own(FREE_HEADLINES, utmContent)) return utmContent;
  if (!own(PAID_CREATIVE_ALIASES, utmContent)) return null;
  const key = PAID_CREATIVE_ALIASES[utmContent];
  return own(FREE_HEADLINES, key) ? key : null;
}

/** Resolve a utm_content value to a headline, falling back to the default.
 *  Only exact allowlisted keys and aliases resolve — never free text. */
export function resolveFreeHeadline(utmContent: string | null | undefined): { key: string; copy: FreeHeadline } {
  const key = canonicalCreative(utmContent);
  if (key) return { key, copy: FREE_HEADLINES[key] };
  return { key: "default", copy: DEFAULT_FREE_HEADLINE };
}
