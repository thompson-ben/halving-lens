// Acquisition-quality analytics — the "which spend produces the best users"
// layer of the Founder Dashboard (Part 10). Everything here is derived from real
// first-party events joined with the manual ad spend; nothing is inferred or
// fabricated. ROI stays blank until a subscriber value is set.
//
// Attribution model (mirrors analytics.ts):
//   • visitors  = landing_view events, keyed by utm_campaign / utm_content / utm_term
//   • signups   = signup events, same keys
//   • engaged   = a session that fired an `engagement` event (≥2s dwell), mapped
//                 back to its campaign via the session's landing_view
//   Meta convention: utm_content = ad (creative), utm_term = adset (audience).

import { sbSelect, supabaseConfigured } from "./supabase";
import { AD_SPEND, SUBSCRIBER_VALUE_GBP, adSpendCurrency, usableSpend } from "./data/adSpend";

interface PropRow {
  session_id: string | null;
  props: Record<string, unknown> | null;
}

export interface CampaignQuality {
  campaign: string;
  spend: number | null;
  visitors: number;
  signups: number;
  engagedUsers: number;
  cps: number | null; // cost per subscriber
  cpe: number | null; // cost per engaged user
  roiPct: number | null; // (signups × value − spend) ÷ spend, if value set
}

export interface DimensionRow {
  key: string; // the creative (ad) or audience (adset) name
  visitors: number;
  signups: number;
  conversionPct: number | null;
}

export interface AcquisitionQuality {
  configured: boolean;
  currency: string;
  subscriberValue: number;
  totalSpend: number;
  totalEngagedUsers: number;
  costPerEngagedUser: number | null; // spend ÷ engaged users from paid campaigns
  campaigns: CampaignQuality[];
  topCreatives: DimensionRow[]; // utm_content
  topAudiences: DimensionRow[]; // utm_term
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Group visitors + signups by a props key (utm_content / utm_term), rank by
// conversion then volume. Only dimensions with at least one visitor are shown.
function byDimension(landing: PropRow[], signups: PropRow[], key: string): DimensionRow[] {
  const m = new Map<string, { visitors: number; signups: number }>();
  const bump = (rows: PropRow[], field: "visitors" | "signups") => {
    for (const r of rows) {
      const v = r.props?.[key];
      if (v == null || v === "") continue;
      const k = String(v).slice(0, 60);
      const e = m.get(k) ?? { visitors: 0, signups: 0 };
      e[field] += 1;
      m.set(k, e);
    }
  };
  bump(landing, "visitors");
  bump(signups, "signups");
  return [...m.entries()]
    .map(([k, v]) => ({ key: k, visitors: v.visitors, signups: v.signups, conversionPct: v.visitors > 0 ? Math.round((v.signups / v.visitors) * 1000) / 10 : null }))
    .filter((r) => r.visitors > 0)
    .sort((a, b) => (b.conversionPct ?? 0) - (a.conversionPct ?? 0) || b.signups - a.signups)
    .slice(0, 8);
}

const EMPTY: AcquisitionQuality = {
  configured: false,
  currency: adSpendCurrency(),
  subscriberValue: SUBSCRIBER_VALUE_GBP,
  totalSpend: 0,
  totalEngagedUsers: 0,
  costPerEngagedUser: null,
  campaigns: [],
  topCreatives: [],
  topAudiences: [],
};

export async function acquisitionQuality(): Promise<AcquisitionQuality> {
  if (!supabaseConfigured) return EMPTY;

  const [landing, signups, engagement] = await Promise.all([
    sbSelect<PropRow[]>("events?name=eq.landing_view&select=session_id,props&limit=40000"),
    sbSelect<PropRow[]>("events?name=eq.signup&select=session_id,props&limit=40000"),
    sbSelect<PropRow[]>("events?name=eq.engagement&select=session_id,props&limit=40000"),
  ]);
  const landingRows = landing ?? [];
  const signupRows = signups ?? [];
  const engRows = engagement ?? [];

  // session → campaign, from the session's landing view (first touch wins).
  const sessionCampaign = new Map<string, string>();
  for (const r of landingRows) {
    const c = String(r.props?.utm_campaign ?? "");
    if (r.session_id && c && !sessionCampaign.has(r.session_id)) sessionCampaign.set(r.session_id, c);
  }

  // Engaged users per campaign = distinct sessions with an engagement event.
  const engagedSessions = new Set<string>();
  for (const r of engRows) if (r.session_id) engagedSessions.add(r.session_id);
  const engagedByCampaign = new Map<string, number>();
  for (const sid of engagedSessions) {
    const c = sessionCampaign.get(sid);
    if (c) engagedByCampaign.set(c, (engagedByCampaign.get(c) ?? 0) + 1);
  }

  // Visitors + signups per campaign.
  const camp = new Map<string, { visitors: number; signups: number }>();
  const bump = (rows: PropRow[], field: "visitors" | "signups") => {
    for (const r of rows) {
      const c = String(r.props?.utm_campaign ?? "");
      if (!c) continue;
      const e = camp.get(c) ?? { visitors: 0, signups: 0 };
      e[field] += 1;
      camp.set(c, e);
    }
  };
  bump(landingRows, "visitors");
  bump(signupRows, "signups");

  const spendByCamp = new Map(AD_SPEND.map((a) => [a.campaign, a.spend]));
  for (const a of AD_SPEND) if (!camp.has(a.campaign)) camp.set(a.campaign, { visitors: 0, signups: 0 });

  const value = SUBSCRIBER_VALUE_GBP;
  const campaigns: CampaignQuality[] = [...camp.entries()]
    .map(([campaign, v]) => {
      // D-1: an un-entered (0) or invalid spend is UNKNOWN, never a real cost.
      // `spend` itself reports null too, so the dashboard shows "—" rather
      // than a £0 that reads as "this campaign was free".
      const spend = usableSpend(spendByCamp.get(campaign));
      const engagedUsers = engagedByCampaign.get(campaign) ?? 0;
      return {
        campaign,
        spend,
        visitors: v.visitors,
        signups: v.signups,
        engagedUsers,
        cps: spend != null && v.signups > 0 ? round2(spend / v.signups) : null,
        cpe: spend != null && engagedUsers > 0 ? round2(spend / engagedUsers) : null,
        roiPct: spend != null && value > 0 ? Math.round(((v.signups * value - spend) / spend) * 100) : null,
      };
    })
    .sort((a, b) => b.signups - a.signups || b.engagedUsers - a.engagedUsers);

  // Aggregate cost-per-engaged-user across paid campaigns only.
  const paidEngaged = campaigns.reduce((n, c) => (c.spend != null ? n + c.engagedUsers : n), 0);
  // Only usable spend contributes to the total, so an all-zero file totals 0
  // and every downstream cost stays "—".
  const totalSpend = AD_SPEND.reduce((s, a) => s + (usableSpend(a.spend) ?? 0), 0);

  return {
    configured: true,
    currency: adSpendCurrency(),
    subscriberValue: value,
    totalSpend,
    totalEngagedUsers: engagedSessions.size,
    costPerEngagedUser: totalSpend > 0 && paidEngaged > 0 ? round2(totalSpend / paidEngaged) : null,
    campaigns,
    topCreatives: byDimension(landingRows, signupRows, "utm_content"),
    topAudiences: byDimension(landingRows, signupRows, "utm_term"),
  };
}
