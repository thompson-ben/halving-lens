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

// Add real campaigns here as you run them. Kept empty until real spend exists —
// the dashboard shows "—" for cost metrics rather than a fabricated figure.
//
// Example (uncomment and edit when you launch a campaign):
// export const AD_SPEND: AdSpend[] = [
//   { campaign: "similar_moments_launch", spend: 250, currency: "GBP", source: "meta",
//     startDate: "2026-07-01", note: "First Meta test — Similar Moments angle" },
// ];
export const AD_SPEND: AdSpend[] = [];

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
