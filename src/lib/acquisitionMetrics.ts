// Pure acquisition-metric helpers — the two rules that the Acquisition Evidence
// Review found broken, extracted so they have ONE definition and can be tested
// without a database.
//
// RULE 1 (defect D-1) — spend that is missing, zero or nonsensical is UNKNOWN,
// never a real cost. Before this, `spend: 0` in the hand-maintained ad-spend
// file was not null, so cost-per-subscriber divided zero by the signup count and
// reported a confident "£0.00 per subscriber" in the founder dashboard. Missing
// data that renders as a precise number is worse than missing data that renders
// as "—".
//
// RULE 2 (defect D-2) — a conversion rate's numerator and denominator must
// describe the SAME eligible population. Before this, landing conversion counted
// landing views from every landing but only signups whose source was "/start",
// so /free — the primary paid destination — contributed visitors and no
// conversions and showed a structural 0%.
//
// Neither rule invents data. Both make the absence of data visible.

/** A landing-page funnel row: views and signups from the SAME source. */
export interface LandingFunnelRow {
  /** The landing's own `source` value, e.g. "/free" or "/start". */
  landing: string;
  views: number;
  signups: number;
  /** signups ÷ views, as a percentage — null when there are no views. */
  conversionRate: number | null;
}

export interface LandingFunnel {
  /** Per-landing rows, busiest first. */
  byLanding: LandingFunnelRow[];
  /** Views across landings that actually have landing views. */
  views: number;
  /** Signups from THOSE SAME landings — never a wider or narrower set. */
  signups: number;
  conversionRate: number | null;
  /** Signups whose source is not a measured landing (organic/article surfaces). */
  signupsOutsideLandings: number;
}

interface PropsRow {
  props?: Record<string, unknown> | null;
}

const sourceOf = (r: PropsRow): string => {
  const s = r.props?.source;
  return typeof s === "string" && s.trim() !== "" ? s.trim() : "";
};

const pct = (num: number, den: number): number | null =>
  den > 0 ? Math.round((num / den) * 1000) / 10 : null;

/**
 * Build the landing funnel with a matched numerator and denominator.
 *
 * The ELIGIBLE POPULATION is defined by the landing views: a landing counts
 * only if it produced at least one `landing_view`. Signups are then attributed
 * to those same landings by their own `source`. Signups from anywhere else —
 * the homepage block, article subscribe forms — are reported separately rather
 * than silently inflating or deflating the rate.
 */
export function landingFunnel(
  landingViewRows: readonly PropsRow[],
  signupRows: readonly PropsRow[],
): LandingFunnel {
  const views = new Map<string, number>();
  for (const r of landingViewRows) {
    const s = sourceOf(r);
    if (!s) continue;
    views.set(s, (views.get(s) ?? 0) + 1);
  }

  const signups = new Map<string, number>();
  let outside = 0;
  for (const r of signupRows) {
    const s = sourceOf(r);
    if (s && views.has(s)) signups.set(s, (signups.get(s) ?? 0) + 1);
    else outside += 1;
  }

  const byLanding: LandingFunnelRow[] = [...views.entries()]
    .map(([landing, v]) => {
      const c = signups.get(landing) ?? 0;
      return { landing, views: v, signups: c, conversionRate: pct(c, v) };
    })
    .sort((a, b) => b.views - a.views || a.landing.localeCompare(b.landing));

  const totalViews = byLanding.reduce((n, r) => n + r.views, 0);
  const totalSignups = byLanding.reduce((n, r) => n + r.signups, 0);

  return {
    byLanding,
    views: totalViews,
    signups: totalSignups,
    conversionRate: pct(totalSignups, totalViews),
    signupsOutsideLandings: outside,
  };
}

export interface VariantRow {
  variant: string;
  views: number;
  ctaClicks: number;
  signups: number;
  cvr: number | null;
}

/**
 * A/B arm performance under the same matched-population contract: an arm's
 * views and its signups are both selected by `props.variant` and nothing else.
 *
 * Filtering the signups by landing source (as the previous implementation did)
 * broke this: arms belonging to a different landing kept their views and lost
 * every conversion. Variant values are already disjoint per surface — "a"/"b"
 * are /start, "free" is /free — so the variant key alone is the correct and
 * sufficient selector.
 */
export function variantFunnel(
  landingViewRows: readonly PropsRow[],
  landingCtaRows: readonly PropsRow[],
  signupRows: readonly PropsRow[],
): VariantRow[] {
  const m = new Map<string, { views: number; ctaClicks: number; signups: number }>();
  const blank = () => ({ views: 0, ctaClicks: 0, signups: 0 });
  const bump = (rows: readonly PropsRow[], field: "views" | "ctaClicks" | "signups") => {
    for (const r of rows) {
      const v = r.props?.variant;
      if (typeof v !== "string" || v === "") continue;
      const e = m.get(v) ?? blank();
      e[field] += 1;
      m.set(v, e);
    }
  };
  bump(landingViewRows, "views");
  bump(landingCtaRows, "ctaClicks");
  bump(signupRows, "signups");

  return [...m.entries()]
    .map(([variant, v]) => ({ variant, views: v.views, ctaClicks: v.ctaClicks, signups: v.signups, cvr: pct(v.signups, v.views) }))
    .sort((a, b) => a.variant.localeCompare(b.variant));
}
