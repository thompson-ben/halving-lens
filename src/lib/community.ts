// Community-maturity gating. Early on, a public leaderboard with only a handful
// of members reads as "small" rather than "exclusive" — so the public
// leaderboard stays behind a member-count threshold and shows a premium
// "coming soon" teaser until then. Personal referral stats, the Hall of Founders
// and referral tools remain visible throughout; only the public ranking is
// gated. Crossing the threshold unlocks it automatically — no code change.
//
// The threshold is configurable via COMMUNITY_LEADERBOARD_THRESHOLD (default 50).

import { sbCount } from "./supabase";

export const LEADERBOARD_MIN_MEMBERS = Math.max(1, Number(process.env.COMMUNITY_LEADERBOARD_THRESHOLD) || 50);

// Verified members = profiles created via magic-link sign-in.
export async function communityMemberCount(): Promise<number> {
  return (await sbCount("profiles")) ?? 0;
}

export interface CommunityStatus {
  memberCount: number;
  threshold: number;
  unlocked: boolean;
  remaining: number; // members still needed to unlock (0 once unlocked)
  progressPct: number; // 0–100, for the "coming soon" growth bar
}

// Resolve the current gate state. Pass a known count to avoid a re-query.
export async function communityStatus(count?: number): Promise<CommunityStatus> {
  const memberCount = count ?? (await communityMemberCount());
  const threshold = LEADERBOARD_MIN_MEMBERS;
  return {
    memberCount,
    threshold,
    unlocked: memberCount >= threshold,
    remaining: Math.max(0, threshold - memberCount),
    progressPct: Math.min(100, Math.round((memberCount / threshold) * 100)),
  };
}
