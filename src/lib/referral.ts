// Referral programme architecture (lightweight — like Morning Brew's). Not
// overbuilt: a stable per-subscriber code, reward tiers, and attribution of
// referred signups via the first-touch `ref` param (captured in attribution.ts
// and attached to the signup event). A subscriber-facing progress dashboard and
// leaderboard need the (future) accounts system — noted, not built here.

export interface RewardTier {
  referrals: number;
  reward: string;
}

export const REWARD_TIERS: RewardTier[] = [
  { referrals: 3, reward: "30 extra Morning Research editions" },
  { referrals: 10, reward: "Weekly PDF archive" },
  { referrals: 25, reward: "Premium Research" },
];

// Deterministic, shareable referral code from an email — no storage needed.
export function referralCode(email: string): string {
  const s = email.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36).slice(0, 8).padStart(6, "0");
}

// The link a subscriber shares. Lands on /start with the ref captured first-touch.
export function referralLink(email: string, base = "https://halvinglens.com"): string {
  return `${base}/start?ref=${referralCode(email)}`;
}

// Reward unlocked at a given successful-referral count (for a future dashboard).
export function rewardFor(referrals: number): RewardTier | null {
  return [...REWARD_TIERS].reverse().find((t) => referrals >= t.referrals) ?? null;
}
