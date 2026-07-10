// Referral programme — configurable rewards + quality scoring. The philosophy:
// reward people for introducing genuinely ENGAGED subscribers, not for spamming
// links. So scoring weights real engagement far above raw signups.
//
// A stable per-subscriber code + first-touch `ref` capture (attribution.ts) work
// today and power the admin referral analytics. The subscriber-facing referral
// DASHBOARD, leaderboard-with-names and reward UNLOCKING need per-user identity
// (Phase 2 / magic-link) — this file defines the engine they'll use.

// How a reward is delivered when it's unlocked:
//   • "instant"    — we can fulfil it right now, in-product (e.g. a download).
//                    The UI surfaces a direct access link.
//   • "recognition"— recognition / manual fulfilment. The UI confirms the unlock
//                    immediately and promises an email — never a live feature we
//                    can't yet honour. This is the safety net (see below).
export type Fulfilment = "instant" | "recognition";

export interface RewardTier {
  referrals: number; // qualified (WAES) referrals
  reward: string;
  badge?: string;
  fulfilment: Fulfilment;
  href?: string; // where an "instant" reward is accessed in-product
  detail?: string; // one calm line describing what the reward actually is
}

// Premium is intentionally NOT built yet — we validate what members value before
// promising Premium functionality. Until Premium genuinely exists this stays
// false, and the top tier presents as Hall of Fame recognition only; Lifetime
// Premium is named as "arriving with Premium", never offered as if it were live.
// Flip via env once Premium ships — no code change needed.
export const PREMIUM_LIVE = process.env.PREMIUM_LIVE === "1" || process.env.PREMIUM_LIVE === "true";

// The safety net. Any recognition reward, the moment it unlocks, shows this and
// nothing more — we confirm the achievement and fulfil by email rather than
// exposing a feature we can't hand over today. Trust before growth: over-deliver
// quietly, never over-promise in the UI.
export const REWARD_SAFETY_NET = "Reward unlocked — we're preparing your reward and will email it shortly.";

// Editable without code logic changes — just edit this list. Reward badges use
// the REFERRAL family only; "◆ Founder" and "◆ Early Supporter" are identity
// credentials (earned by being the founder / an early member), never by
// referring people, so they're intentionally not reward names here.
//
// The referral ladder favours recognition over expensive fulfilment. Only the
// Founder's Collection is "instant" today (a genuine, low-maintenance download
// built from our existing chart pipeline); everything above it is recognition,
// fulfilled by email via the safety net so we never expose an unfulfillable
// promise. The programme should always over-deliver, never over-promise.
export const REWARD_TIERS: RewardTier[] = [
  {
    referrals: 3,
    reward: "HalvingLens Founder's Collection",
    badge: "referral-supporter",
    fulfilment: "instant",
    href: "/dashboard/founders-collection",
    detail: "Downloadable premium branded assets — cycle cards, wallpapers and a printable summary.",
  },
  {
    referrals: 10,
    reward: "Early Access recognition",
    badge: "referral-champion",
    fulfilment: "recognition",
    detail: "Recognised as an early-access member — first to see new indicators and betas.",
  },
  {
    referrals: 25,
    reward: "Ambassador status",
    badge: "ambassador",
    fulfilment: "recognition",
    detail: "Official recognition as a HalvingLens Ambassador.",
  },
  {
    referrals: 50,
    reward: "Lifetime Early Access",
    fulfilment: "recognition",
    detail: "Permanent early access to everything new as it ships.",
  },
  {
    referrals: 100,
    reward: PREMIUM_LIVE ? "Hall of Fame · Lifetime Premium" : "Hall of Fame",
    badge: "founding-ambassador",
    fulfilment: "recognition",
    detail: PREMIUM_LIVE
      ? "A permanent place in the Hall of Fame, with Lifetime Premium."
      : "A permanent place in the Hall of Fame. Lifetime Premium joins this reward once Premium launches.",
  },
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

// How to present an UNLOCKED reward. Instant rewards get a direct access link;
// recognition rewards get the safety-net confirmation (fulfilled by email). This
// is the single source of truth the UI reads, so no page can accidentally expose
// a reward we can't hand over.
export type UnlockedReward =
  | { tier: RewardTier; kind: "access"; href: string; label: string }
  | { tier: RewardTier; kind: "recognition"; message: string };

export function presentReward(tier: RewardTier): UnlockedReward {
  if (tier.fulfilment === "instant" && tier.href) {
    return { tier, kind: "access", href: tier.href, label: `Open your ${tier.reward}` };
  }
  return { tier, kind: "recognition", message: REWARD_SAFETY_NET };
}

// Every reward the member has unlocked, ready to present (highest first).
export function unlockedRewards(referrals: number): UnlockedReward[] {
  return [...REWARD_TIERS]
    .reverse()
    .filter((t) => referrals >= t.referrals)
    .map(presentReward);
}
