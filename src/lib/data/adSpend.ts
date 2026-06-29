// Manual advertising spend, entered by the founder. The growth dashboard joins
// this with attributed signups per campaign to compute cost-per-subscriber.
// Edit by hand: match `campaign` to the utm_campaign used in your ad links.
// Example: { campaign: "similar_moments_launch", spend: 250, currency: "GBP" }

export interface AdSpend {
  campaign: string; // matches utm_campaign
  spend: number;
  currency?: string; // default GBP
  note?: string;
}

export const AD_SPEND: AdSpend[] = [];
