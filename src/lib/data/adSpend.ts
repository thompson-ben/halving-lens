// Manual advertising spend, entered by the founder. The growth dashboard joins
// this with attributed visitors/signups per campaign (via utm_campaign on the
// tracked events) to compute conversion rate, cost-per-subscriber and
// cost-per-CTA-click. Nothing here is inferred or fabricated — you type in what
// you actually spent.
//
// HOW TO USE
//   1. Use a utm_campaign on every ad link, e.g.
//      https://halvinglens.com/start?utm_source=meta&utm_campaign=similar_moments_launch
//   2. Add one row below per campaign with the amount spent. `campaign` MUST match
//      the utm_campaign exactly. Spend is cumulative for that campaign.
//   3. The Founder Analytics → Growth dashboard does the rest (visitors, signups,
//      conversion %, £/subscriber, £/CTA click).

export interface AdSpend {
  campaign: string; // MUST match the utm_campaign on the ad links
  spend: number; // total amount spent on this campaign, in `currency`
  currency?: string; // default "GBP"
  source?: string; // optional: utm_source (e.g. "meta", "x", "google") for notes
  startDate?: string; // optional YYYY-MM-DD, for your own records
  endDate?: string; // optional YYYY-MM-DD
  note?: string; // optional free-text note
}

// Add real campaigns here as you run them. `spend` is the running total you've
// spent so far — update it as the campaign runs and the dashboard recomputes
// cost-per-subscriber and cost-per-WAES automatically.
// JOIN KEY (documented for the Acquisition Evidence Review): `campaign` below
// must equal, character for character, the `utm_campaign` value configured in
// the live ad's URL Parameters. If Meta is auto-populating {{campaign.name}}
// instead, the two will not match and every spend join silently returns
// nothing — no error, just an empty table. Verify the live URL Parameters
// before trusting any cost figure derived from this file.
export const AD_SPEND: AdSpend[] = [
  {
    campaign: "meta_learn_jul26",
    spend: 0, // ← update this to your running Meta spend (GBP) as the campaign runs
    currency: "GBP",
    source: "meta",
    startDate: "2026-07-01",
    note: "Meta learning campaign → /free. Update `spend` as it runs.",
  },
];

// Assumed value of one subscriber, for ROI. Left at 0 by default so ROI stays
// blank ("—") until you set a real number — nothing is fabricated. Set this to
// your best estimate of what a subscriber is worth (e.g. expected premium LTV,
// or an internal value-per-engaged-reader) and the dashboard computes ROI as
// (subscribers × value − spend) ÷ spend. Override via env without a code change.
export const SUBSCRIBER_VALUE_GBP: number = Number(process.env.SUBSCRIBER_VALUE_GBP) || 0;

/**
 * THE spend-validity rule (defect D-1, Acquisition Evidence Review).
 *
 * Spend is USABLE only when it is a finite, strictly positive number. Zero
 * means "not entered yet" — it is the file's own default and it is NOT a real
 * cost of nothing. Before this rule existed, cost-per-subscriber divided that
 * zero by the signup count and reported a confident "£0.00 per subscriber" in
 * the founder dashboard: missing data rendered as a precise number.
 *
 * Every cost calculation must pass its spend through here first, so an
 * un-entered campaign reports UNKNOWN ("—") rather than free.
 *
 * This never invents, estimates or defaults a figure — it only decides whether
 * the figure we have can honestly be divided by anything.
 */
export function usableSpend(spend: number | null | undefined): number | null {
  return typeof spend === "number" && Number.isFinite(spend) && spend > 0 ? spend : null;
}

// Total spend across all campaigns (single currency assumed; default GBP).
export function adSpendTotal(): number {
  return AD_SPEND.reduce((s, a) => s + (a.spend || 0), 0);
}

// Spend keyed by campaign, for joins in the growth dashboard.
export function adSpendByCampaign(): Map<string, number> {
  return new Map(AD_SPEND.map((a) => [a.campaign, a.spend]));
}

// The currency in use (first row wins; defaults to GBP). Display-only.
export function adSpendCurrency(): string {
  return AD_SPEND[0]?.currency || "GBP";
}
