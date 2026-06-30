// Admin-side referral analytics — built from first-party events (the first-touch
// `ref` code captured in attribution and attached to landing/signup events).
// Identity-independent: shows which referral codes drive visitors and
// subscribers and a quality-weighted score, without needing accounts.
// (WAES-per-referrer and retention need Phase 2 identity; noted in the UI.)

import { sbSelect } from "./supabase";
import { referralScore } from "./referral";

export interface ReferrerRow {
  code: string;
  visitors: number;
  signups: number;
  score: number;
}

export interface ReferralAnalytics {
  configured: boolean;
  totalReferralVisitors: number;
  totalReferralSubscribers: number;
  referrers: ReferrerRow[]; // leaderboard (anonymous codes), top 20
}

function refOf(props: Record<string, unknown> | null): string | null {
  const r = props?.ref;
  return typeof r === "string" && r.trim() ? r.trim().slice(0, 24) : null;
}

export async function referralAnalytics(): Promise<ReferralAnalytics> {
  const [views, signups] = await Promise.all([
    sbSelect<{ props: Record<string, unknown> | null }[]>("events?select=props&name=eq.landing_view&limit=50000"),
    sbSelect<{ props: Record<string, unknown> | null }[]>("events?select=props&name=eq.signup&limit=50000"),
  ]);
  if (views == null && signups == null) {
    return { configured: false, totalReferralVisitors: 0, totalReferralSubscribers: 0, referrers: [] };
  }

  const map = new Map<string, { visitors: number; signups: number }>();
  const ensure = (code: string) => map.get(code) ?? map.set(code, { visitors: 0, signups: 0 }).get(code)!;
  for (const r of views ?? []) {
    const code = refOf(r.props);
    if (code) ensure(code).visitors += 1;
  }
  for (const r of signups ?? []) {
    const code = refOf(r.props);
    if (code) ensure(code).signups += 1;
  }

  const referrers: ReferrerRow[] = [...map.entries()]
    .map(([code, v]) => ({ code, visitors: v.visitors, signups: v.signups, score: referralScore({ visitors: v.visitors, signups: v.signups }) }))
    .sort((a, b) => b.score - a.score || b.signups - a.signups)
    .slice(0, 20);

  return {
    configured: true,
    totalReferralVisitors: [...map.values()].reduce((s, v) => s + v.visitors, 0),
    totalReferralSubscribers: [...map.values()].reduce((s, v) => s + v.signups, 0),
    referrers,
  };
}
