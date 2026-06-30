// Referral programme — configurable rewards + quality scoring. The philosophy:
// reward people for introducing genuinely ENGAGED subscribers, not for spamming
// links. So scoring weights real engagement far above raw signups.
//
// A stable per-subscriber code + first-touch `ref` capture (attribution.ts) work
// today and power the admin referral analytics. The subscriber-facing referral
// DASHBOARD, leaderboard-with-names and reward UNLOCKING need per-user identity
// (Phase 2 / magic-link) — this file defines the engine they'll use.

export interface RewardTier {
  referrals: number; // qualified (WAES) referrals
  reward: string;
  badge?: string;
}

// Editable without code logic changes — just edit this list.
export const REWARD_TIERS: RewardTier[] = [
  { referrals: 1, reward: "Early Supporter badge", badge: "early-supporter" },
  { referrals: 3, reward: "Premium research unlock" },
  { referrals: 5, reward: "Exclusive research report" },
  { referrals: 10, reward: "Founder badge", badge: "founder" },
  { referrals: 20, reward: "One month HalvingLens Pro" },
  { referrals: 50, reward: "Lifetime Founder status", badge: "lifetime-founder" },
  { referrals: 100, reward: "Founding Ambassador", badge: "founding-ambassador" },
];

// Quality scoring — engagement is rewarded far above signups, so spam earns
// little and genuine advocacy earns a lot. Editable without code changes.
export const REFERRAL_POINTS = {
  visitor: 1,
  signup: 5,
  waes: 15, // confirmed Weekly Active Engaged Subscriber
  retainedWaes: 30, // still a WAES after 30 days
} as const;

export function referralScore(parts: { visitors?: number; signups?: number; waes?: number; retainedWaes?: number }): number {
  return (
    (parts.visitors ?? 0) * REFERRAL_POINTS.visitor +
    (parts.signups ?? 0) * REFERRAL_POINTS.signup +
    (parts.waes ?? 0) * REFERRAL_POINTS.waes +
    (parts.retainedWaes ?? 0) * REFERRAL_POINTS.retainedWaes
  );
}

// Deterministic, shareable referral code from an email — no storage needed.
export function referralCode(email: string): string {
  const s = email.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 8).padStart(6, "0");
}

// The link a subscriber shares. The ref is captured first-touch on any landing.
export function referralLink(email: string, base = "https://halvinglens.com"): string {
  return `${base}/?ref=${referralCode(email)}`;
}

// Highest reward unlocked at a given qualified-referral count.
export function rewardFor(referrals: number): RewardTier | null {
  return [...REWARD_TIERS].reverse().find((t) => referrals >= t.referrals) ?? null;
}

// The next reward to aim for, with progress (for a future subscriber dashboard).
export function nextReward(referrals: number): { tier: RewardTier; remaining: number } | null {
  const tier = REWARD_TIERS.find((t) => referrals < t.referrals);
  return tier ? { tier, remaining: tier.referrals - referrals } : null;
}
