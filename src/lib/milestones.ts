// Micro-celebrations — a small, reusable milestone system. A milestone is a
// meaningful step on a member's journey (first brief, a streak, a referral,
// founding status…). When a member earns one, we celebrate it once — a calm,
// premium toast — and record the date on their timeline.
//
// Extensibility: add an entry to MILESTONES and compute its id in
// buildInvestorProfile's `earnedMilestones`. Nothing else needs to change — the
// toaster, the timeline and the detection all read from this list.

import { upsertProfile, type ProfileState } from "./profile";

export interface Milestone {
  id: string;
  icon: string; // emoji
  title: string; // short, e.g. "7-Day Streak"
  message: string; // one calm sentence
}

// Canonical, ordered metadata. Tone is "New achievement", never "UNLOCKED!!!".
export const MILESTONES: Milestone[] = [
  { id: "first-brief", icon: "📖", title: "First Daily Brief", message: "You're officially tracking the Bitcoin cycle. See you tomorrow." },
  { id: "profile-complete", icon: "🎉", title: "Profile Complete", message: "Your HalvingLens profile is now complete. Continue building your Bitcoin journey." },
  { id: "streak-7", icon: "🔥", title: "7-Day Streak", message: "Seven consecutive days. Consistency builds conviction." },
  { id: "streak-30", icon: "🏆", title: "30-Day Streak", message: "A full month of daily Bitcoin intelligence. Excellent consistency." },
  { id: "first-referral", icon: "🤝", title: "First Referral", message: "Your first member has joined through your referral. Thank you for helping grow the community." },
  { id: "referral-5", icon: "🚀", title: "Community Builder", message: "Five successful referrals. You're helping build something special." },
  { id: "founding-member", icon: "⭐", title: "Founding Member", message: "You're one of the earliest supporters of HalvingLens. This recognition stays on your profile permanently." },
  { id: "leaderboard-unlock", icon: "🎯", title: "Community Milestone", message: "The HalvingLens Community Leaderboard is now live." },
  { id: "youtube", icon: "▶️", title: "YouTube Supporter", message: "Thanks for subscribing and supporting the project." },
];

export const MILESTONE_BY_ID = new Map(MILESTONES.map((m) => [m.id, m]));

// Reconcile currently-earned milestones against what's already recorded.
//  • First run (nothing recorded yet): silently seed everything currently earned,
//    so milestones earned *before* this shipped never fire a burst of toasts.
//  • Thereafter: newly-earned ids are recorded with their date and returned to
//    celebrate exactly once.
// Recording always happens (so the timeline gets dates); only *showing* the toast
// is gated by the member's Celebrations preference, handled by the caller.
export async function reconcileMilestones(
  email: string,
  state: ProfileState,
  earnedIds: string[],
  nowMs: number,
): Promise<{ newlyEarned: Milestone[]; milestones: Record<string, number> }> {
  const earned = earnedIds.filter((id) => MILESTONE_BY_ID.has(id));
  const recorded = state.milestones;

  // First run — seed without celebrating.
  if (!recorded) {
    const seeded: Record<string, number> = {};
    for (const id of earned) seeded[id] = nowMs;
    await upsertProfile(email, { ...state, milestones: seeded });
    return { newlyEarned: [], milestones: seeded };
  }

  const fresh = earned.filter((id) => !(id in recorded));
  if (fresh.length === 0) return { newlyEarned: [], milestones: recorded };

  const updated = { ...recorded };
  for (const id of fresh) updated[id] = nowMs;
  await upsertProfile(email, { ...state, milestones: updated });
  // Return in canonical order for a tidy display sequence.
  return { newlyEarned: MILESTONES.filter((m) => fresh.includes(m.id)), milestones: updated };
}
