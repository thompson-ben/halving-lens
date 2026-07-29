// Product release registry — major launches, annotated on Founder
// Intelligence trend charts so business outcomes can be read against what
// shipped. Dates are the real merge dates on main (git history), one entry
// per initiative rather than per PR. Append new launches at the bottom;
// never backdate or invent entries.

export interface ProductRelease {
  date: string; // ISO day (merge date on main)
  label: string; // short — annotates a chart tick
  detail: string; // one line for tooltips/legends
}

export const RELEASES: ProductRelease[] = [
  { date: "2026-07-26", label: "Journeys", detail: "Continue-your-journey placements on the dead-end pages (#137)" },
  { date: "2026-07-26", label: "Search", detail: "Working site search in the top bar (#139)" },
  { date: "2026-07-27", label: "Four Reference Prices", detail: "The framework page, platform placements and Today's Configuration pack (#143–#146)" },
  { date: "2026-07-28", label: "/free optimisation", detail: "Trust moment, mobile fold, single decision, trust layer, ad-congruent headlines (#151–#155)" },
  { date: "2026-07-28", label: "Start Here", detail: "The beginner narrative — Bitcoin, explained calmly (#156)" },
];

/** Releases inside a window, oldest first. */
export function releasesBetween(fromIso: string, toIso: string): ProductRelease[] {
  return RELEASES.filter((r) => r.date >= fromIso.slice(0, 10) && r.date <= toIso.slice(0, 10));
}
