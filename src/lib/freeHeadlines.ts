// Ad-congruent headlines for the /free paid landing (message match).
//
// The strongest known lever on paid-landing conversion is repeating the
// clicked ad's promise verbatim on arrival. Each Meta/paid creative sets
// `utm_content` and the hero repeats that promise; anything else — absent,
// unknown, or attacker-crafted — falls back to the default. The resolved key
// travels on `landing_view` (and `utm_content` rides every funnel event via
// first-touch attribution), so each creative's conversion is measurable
// end-to-end with no new event names.
//
// TWO KEY SPACES, ONE MESSAGE
// ---------------------------
// `utm_content` does not arrive in one shape. Meta substitutes whatever the
// ad's tracking template asks for, so the SAME creative reaches us as either
// the ad NAME (`hl_meta_001_ad001_803`) or the immutable ad ID
// (`52532453901711`). Ad names are also not stable identities: the live
// account already reuses the `ad003`/`ad004` slots for different angles across
// campaigns, and one creative angle can carry SEVERAL ad IDs (the same ad
// duplicated into a second campaign gets a new ID). So neither the name nor
// "the" ad ID is a usable canonical identity on its own.
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
// Unknown, absent or malformed values resolve to DEFAULT_FREE_HEADLINE. There
// is no blank, error or placeholder state.
//
// Rules for every entry, enforced by scripts/test-free-headlines.ts:
// same honest register as the site (no hype, no urgency, no prediction
// promises, none of the banned vocabulary), keys are short url-safe slugs.

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

  // ── Paid messages, one per live creative angle ────────────────────────────
  // Each continues the promise the visitor just clicked. None of them makes a
  // claim the product does not already deliver, and none answers a question the
  // product deliberately refuses to answer.

  "cycle-day": {
    headline: "Day by day, where this Bitcoin cycle stands.",
    sub: "We count every day since the halving and compare today against the same day in Bitcoin's previous cycles. One free read each morning, written without hype or predictions.",
  },
  accumulation: {
    headline: "Where today sits in Bitcoin's historical range.",
    sub: "The accumulation reading places today against Bitcoin's recorded history — historically cheap, neutral or stretched — and shows what similar conditions looked like. Free each morning, written without hype or predictions.",
  },
  "clearest-view": {
    headline: "The clearest view of the Bitcoin cycle.",
    sub: "One page for where this cycle stands, what moved today, and how that compares with Bitcoin's earlier cycles. Free each morning, written without hype or predictions.",
  },
  "market-indifferent": {
    headline: "The market doesn't care how the week felt.",
    sub: "We read the record rather than the mood: what actually changed, how unusual it was, and what similar conditions looked like before. Free each morning, written without hype or predictions.",
  },
  "where-are-we": {
    headline: "Where are we in the Bitcoin cycle?",
    sub: "That is the question we answer every morning — how far into this cycle we are, what changed, and how today compares with the same point in earlier cycles. Free, written without hype or predictions.",
  },
  "should-you-buy": {
    headline: "We won't tell you whether to buy Bitcoin.",
    sub: "We show you where this cycle stands, what changed today, and what similar conditions looked like in Bitcoin's history. The decision stays yours. Free each morning, written without hype or predictions.",
  },
  "daily-brief": {
    headline: "One calm Bitcoin read, every morning.",
    sub: "A verdict every morning — including “nothing changed” — the one reading that moved and how unusual it was, and what has held. Thirty seconds, written without hype or predictions.",
  },
  "crowd-fear": {
    headline: "When the crowd is fearful, what does history show?",
    sub: "Sentiment extremes have historically clustered near cycle turning points — a contrarian read, not a timing tool. We show the reading, its history, and what followed. Free each morning, written without hype or predictions.",
  },
};

// Every known paid identity → its message key. BOTH shapes are listed for each
// creative: the ad name as it is authored in Meta, and every ad ID that has
// carried that creative (a creative duplicated into another campaign gets a
// second ID). Adding an alias is the whole cost of a new creative; nothing in
// Meta has to change, and an ad can be renamed without breaking its ID alias.
//
// Verified against the Meta ad export for 18 Jul – 16 Aug 2026: 9 distinct ad
// names, 13 distinct ad IDs, 9 message angles.
export const PAID_CREATIVE_ALIASES: Record<string, string> = {
  // ad001 — cycle-day count
  hl_meta_001_ad001_803: "cycle-day",
  "52532453901711": "cycle-day",
  "52547863281711": "cycle-day",

  // ad002 — accumulation reading
  hl_meta_001_ad002_accumulation17: "accumulation",
  "52532999193711": "accumulation",
  "52547863281311": "accumulation",

  // ad003 (campaign 1) — the clearest view
  hl_meta_001_ad003_clearest_view: "clearest-view",
  "52532999193911": "clearest-view",

  // ad003 (campaign 2) — the slot is REUSED for a different angle
  hl_meta_001_ad003_doesnt_care: "market-indifferent",
  "52547863281111": "market-indifferent",

  // ad004 (campaign 1) — history as context
  hl_meta_001_ad004_history_context: "context",
  "52532999193511": "context",

  // ad004 (campaign 2) — the slot is REUSED for a different angle
  hl_meta_001_ad004_where_are_we: "where-are-we",
  "52547863281511": "where-are-we",

  // ad005 — the question we decline to answer
  hl_meta_001_ad005_should_you_buy: "should-you-buy",
  "52532999194511": "should-you-buy",
  "52547863280511": "should-you-buy",

  // ad006 — the daily brief itself
  hl_meta_001_ad006_daily_brief: "daily-brief",
  "52532999194311": "daily-brief",
  "52547863280711": "daily-brief",

  // ad007 — sentiment extremes
  hl_meta_001_ad007_crowd_fearful: "crowd-fear",
  "52532999194111": "crowd-fear",
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
