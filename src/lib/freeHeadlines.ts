// Ad-congruent headlines for the /free paid landing (message match).
//
// The strongest known lever on paid-landing conversion is repeating the
// clicked ad's promise verbatim on arrival. Each Meta/paid creative sets
// `utm_content` to one of the allowlisted keys below and the hero repeats
// that promise; anything else — absent, unknown, or attacker-crafted — falls
// back to the default. The key travels on `landing_view` (and `utm_content`
// rides every funnel event via first-touch attribution), so each creative's
// conversion is measurable end-to-end with no new event names.
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

// Starter set — one per ad angle currently in use. Extend as creatives are
// added; never remove a key while an ad still points at it.
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
};

/** Resolve a utm_content value to a headline, falling back to the default.
 *  Only exact allowlisted keys resolve — never free text from the URL. */
export function resolveFreeHeadline(utmContent: string | null | undefined): { key: string; copy: FreeHeadline } {
  if (utmContent && Object.prototype.hasOwnProperty.call(FREE_HEADLINES, utmContent)) {
    return { key: utmContent, copy: FREE_HEADLINES[utmContent] };
  }
  return { key: "default", copy: DEFAULT_FREE_HEADLINE };
}
