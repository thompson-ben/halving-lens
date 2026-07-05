// Investor Profile aggregator — turns a signed-in member's stored state + identity
// + referral activity into the derived model the profile page and Investor
// Snapshot render. Server-only. Nothing is fabricated: reading stats come from the
// synced visit-day log, referrals from attributed signups, identity from signup
// order. Extensible — add an achievement or completion task in the config arrays.

import { sbSelect } from "./supabase";
import { memberIdentity, type MemberIdentity, type ProfileState } from "./profile";
import { referralLink, rewardFor, nextReward, REWARD_TIERS } from "./referral";
import { referralLeaderboard } from "./referralLeaderboard";
import { entitlementsFor, isFoundingMember, FOUNDING_MEMBER_BENEFITS, type Entitlement } from "./entitlements";
import { streakStats, type StreakStats } from "./streak";
import { SITE_URL } from "./site";
import { YOUTUBE_LIVE } from "./lifecycleConfig";

export interface Achievement {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
}

export interface CompletionTask {
  id: string;
  label: string;
  done: boolean;
  href?: string; // where to go to complete this (or revisit it) — makes the row a quick link
}

export interface TimelineEntry {
  icon: string;
  label: string;
  date?: string; // "July 2026" when known
  done: boolean; // false = a future milestone (shown as upcoming)
}

export interface InvestorProfile {
  email: string;
  memberSince: string; // "July 2026"
  identity: MemberIdentity;
  entitlements: Entitlement[];
  isFoundingMember: boolean;
  foundingBenefits: string[];
  streak: StreakStats;
  daysActive: number;
  briefsRead: number;
  referral: {
    link: string;
    count: number;
    leaderboardPosition: number | null;
    weeklyRank: number | null;
    rewardsUnlocked: string[];
    next: { reward: string; referrals: number; remaining: number } | null;
    progressPct: number;
  };
  achievements: { list: Achievement[]; earnedCount: number; total: number; latest: Achievement | null; next: Achievement | null };
  completion: { pct: number; tasks: CompletionTask[] };
  timeline: TimelineEntry[];
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function monthYear(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export async function buildInvestorProfile(email: string, state: ProfileState, nowISO: string): Promise<InvestorProfile> {
  const createdRows = await sbSelect<{ created_at: string }[]>(
    `profiles?select=created_at&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`,
  );
  const createdAt = createdRows?.[0]?.created_at ?? null;
  const identity = await memberIdentity(email);
  const streak = streakStats(state.streakDays, nowISO);
  const daysActive = streak.totalDays;
  const briefsRead = (state.recent ?? []).filter((r) => (r.href || "").startsWith("/brief")).length || daysActive;

  const code = referralLink(email).split("ref=")[1] ?? "";
  const lb = await referralLeaderboard(code);
  const count = lb.you?.referrals ?? 0;
  const unlocked = REWARD_TIERS.filter((t) => count >= t.referrals);

  const entitlements = entitlementsFor({ email, memberNo: identity.memberNo, createdAt, referralRank: lb.you?.rank ?? null, stored: state.entitlements });
  const founding = isFoundingMember(identity.memberNo, createdAt);
  const nr = nextReward(count);
  const nextMilestone = nr?.tier.referrals ?? REWARD_TIERS[REWARD_TIERS.length - 1].referrals;
  const progressPct = Math.min(100, Math.round((count / nextMilestone) * 100));

  // ── Completion tasks (derived from real signals) ──
  const recentHrefs = new Set((state.recent ?? []).map((r) => r.href || ""));
  const visited = (pred: (h: string) => boolean) => [...recentHrefs].some(pred);
  // Each actionable task links to the page that completes it (or is worth
  // revisiting), so the checklist doubles as quick navigation. "Email verified"
  // has no destination — it's just a confirmed state.
  const completionTasks: CompletionTask[] = [
    { id: "email", label: "Email verified", done: true }, // signed in ⇒ verified
    { id: "referral", label: "Referral link created", done: !!code, href: "/dashboard/referrals" },
    { id: "brief", label: "Read your first Daily Brief", done: daysActive >= 1 || briefsRead >= 1, href: "/brief" },
    { id: "analysis", label: "Visited today's analysis", done: visited((h) => /^\/(accumulation|cycles|brief|dashboard)/.test(h)), href: "/dashboard" },
    { id: "similar", label: "Explored Similar Moments", done: visited((h) => h.startsWith("/similar-moments")), href: "/similar-moments" },
    { id: "saved", label: "Saved a piece of research", done: (state.saved ?? []).length > 0, href: "/research/findings" },
    { id: "streak7", label: "Reached a 7-day reading streak", done: streak.longest >= 7, href: "/brief" },
  ];
  const completionPct = Math.round((completionTasks.filter((t) => t.done).length / completionTasks.length) * 100);

  // ── Achievements (config-driven, matches the spec) ──
  const achievementDefs: { id: string; name: string; icon: string; description: string; earned: boolean }[] = [
    { id: "first-brief", name: "First Daily Brief", icon: "📖", description: "Read your first brief.", earned: daysActive >= 1 },
    { id: "streak-7", name: "7-Day Reading Streak", icon: "🔥", description: "Seven days running.", earned: streak.longest >= 7 },
    { id: "streak-30", name: "30-Day Reading Streak", icon: "🔥", description: "A full month.", earned: streak.longest >= 30 },
    { id: "streak-100", name: "100-Day Reading Streak", icon: "🔥", description: "One hundred days.", earned: streak.longest >= 100 },
    { id: "veteran", name: "Market Veteran", icon: "📈", description: "90 days active.", earned: daysActive >= 90 },
    { id: "cycle-expert", name: "Cycle Expert", icon: "🧠", description: "180 days active.", earned: daysActive >= 180 },
    { id: "ref-1", name: "First Referral", icon: "👥", description: "Introduced your first member.", earned: count >= 1 },
    { id: "ref-5", name: "Five Referrals", icon: "👥", description: "Five members introduced.", earned: count >= 5 },
    { id: "ref-25", name: "Twenty-Five Referrals", icon: "👥", description: "A leading advocate.", earned: count >= 25 },
    // Only offered once the channel is live — self-attested (see YouTubeSubscribe).
    ...(YOUTUBE_LIVE
      ? [{ id: "youtube", name: "YouTube Subscriber", icon: "📺", description: "Subscribed to the channel.", earned: state.youtubeSubscribed === true }]
      : []),
    { id: "profile-100", name: "Profile Complete", icon: "🎯", description: "100% profile completion.", earned: completionPct >= 100 },
    { id: "early-supporter", name: "Early Supporter", icon: "🏅", description: "One of the first members.", earned: identity.isEarlySupporter },
  ];
  const achievements = achievementDefs.map((a) => ({ ...a }));
  const earned = achievements.filter((a) => a.earned);
  const nextAch = achievements.find((a) => !a.earned) ?? null;

  // ── Journey timeline ──
  const timeline: TimelineEntry[] = [];
  const joinLabel = founding ? "Joined as a Founding Member" : identity.isEarlySupporter ? "Joined as an Early Supporter" : "Joined HalvingLens";
  timeline.push({ icon: founding || identity.isEarlySupporter ? "◆" : "✦", label: joinLabel, date: monthYear(createdAt), done: true });
  if (daysActive >= 1) timeline.push({ icon: "📖", label: "Read your first Daily Brief", done: true });
  if (completionPct >= 100) timeline.push({ icon: "🎯", label: "Completed your profile", done: true });
  if (count >= 1) timeline.push({ icon: "👥", label: "Made your first referral", done: true });
  for (const m of [7, 30, 100]) if (streak.longest >= m) timeline.push({ icon: "🔥", label: `${m}-day reading streak`, done: true });
  for (const t of unlocked) timeline.push({ icon: "🏆", label: `Unlocked ${t.reward}`, done: true });
  // Next upcoming milestone (aspirational).
  if (nextAch) timeline.push({ icon: nextAch.icon, label: `Next: ${nextAch.name}`, done: false });

  return {
    email,
    memberSince: monthYear(createdAt),
    identity,
    entitlements: [...entitlements],
    isFoundingMember: founding,
    foundingBenefits: FOUNDING_MEMBER_BENEFITS,
    streak,
    daysActive,
    briefsRead,
    referral: {
      link: referralLink(email, SITE_URL),
      count,
      // Public ranking is hidden until the community reaches its threshold — no
      // rank is surfaced before then, so early sparsity is never exposed.
      leaderboardPosition: lb.community.unlocked ? (lb.you?.rank ?? null) : null,
      weeklyRank: lb.community.unlocked ? (lb.you?.weeklyRank ?? null) : null,
      rewardsUnlocked: unlocked.map((t) => t.reward),
      next: nr ? { reward: nr.tier.reward, referrals: nr.tier.referrals, remaining: nr.remaining } : null,
      progressPct,
    },
    achievements: { list: achievements, earnedCount: earned.length, total: achievements.length, latest: earned[earned.length - 1] ?? null, next: nextAch },
    completion: { pct: completionPct, tasks: completionTasks },
    timeline,
  };
}

// The reward ladder for display (progress bar on the profile + referral pages).
export function rewardLadder(count: number): { referrals: number; reward: string; unlocked: boolean; current: boolean }[] {
  const nr = nextReward(count);
  return REWARD_TIERS.map((t) => ({
    referrals: t.referrals,
    reward: t.reward,
    unlocked: count >= t.referrals,
    current: nr?.tier.referrals === t.referrals,
  }));
}

export { rewardFor };
