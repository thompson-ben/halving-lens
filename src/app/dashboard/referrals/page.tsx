import Link from "next/link";
import type { Metadata } from "next";
import { currentProfile } from "@/lib/profile";
import { referralLink, REWARD_TIERS, rewardFor, nextReward } from "@/lib/referral";
import { referralAnalytics } from "@/lib/referralAnalytics";
import { referralLeaderboard } from "@/lib/referralLeaderboard";
import { SITE_URL } from "@/lib/site";
import { ReferralShare } from "@/components/ReferralShare";
import { ProfileSignInForm } from "@/components/ProfileSignInForm";
import { CommunityLeaderboardTeaser } from "@/components/CommunityLeaderboardTeaser";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Referrals · Your HalvingLens Profile",
  description: "Share HalvingLens and earn rewards for introducing genuinely engaged readers.",
  robots: { index: false },
};

const GOLD = "#d9b96a";

export default async function ReferralsPage() {
  const p = currentProfile();

  if (!p) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <header>
          <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Referrals</div>
          <h1 className="mt-3 font-display text-[30px] text-ink-50 tracking-tight-2">Earn rewards for sharing research</h1>
        </header>
        <div className="card-glow p-6">
          <p className="text-[14px] text-ink-300 leading-relaxed mb-4">
            Create your free HalvingLens Profile to get your personal referral link, track your impact, and unlock
            rewards for introducing genuinely engaged readers.
          </p>
          <ProfileSignInForm next="/dashboard/referrals" />
        </div>
      </div>
    );
  }

  const link = referralLink(p.email, SITE_URL);
  const [analytics, lb] = await Promise.all([referralAnalytics(), referralLeaderboard(p.referralCode)]);
  const mine = analytics.referrers.find((r) => r.code === p.referralCode) ?? { code: p.referralCode, visitors: 0, signups: 0, score: 0 };
  const qualified = lb.you?.referrals ?? mine.signups; // session-deduped confirmed referrals
  const unlocked = rewardFor(qualified);
  const next = nextReward(qualified);

  return (
    <div className="max-w-2xl mx-auto space-y-9">
      <header className="border-b border-white/[0.08] pb-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Your HalvingLens Profile · Referrals</div>
        <h1 className="mt-3 font-display text-[28px] lg:text-[34px] text-ink-50 tracking-tight-2">Share research, earn rewards</h1>
        <p className="mt-2 text-[13px] text-ink-400 max-w-xl">Rewards are for introducing genuinely engaged readers — not for spamming links. Quality is scored far above raw signups.</p>
      </header>

      <section>
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Your link</div>
        <ReferralShare link={link} />
      </section>

      {/* Stats — public rankings only appear once the community leaderboard has unlocked. */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Stat label="Referrals" value={qualified} />
        <Stat label="Visitors referred" value={mine.visitors} />
        {lb.community.unlocked ? (
          <>
            <Stat label="Leaderboard" value={lb.you?.rank != null ? `#${lb.you.rank}` : "—"} />
            <Stat label="This week" value={lb.you?.weeklyRank != null ? `#${lb.you.weeklyRank}` : "—"} />
          </>
        ) : (
          <>
            <Stat label="Community" value={`${lb.community.memberCount}/${lb.community.threshold}`} />
            <Stat label="To unlock" value={lb.community.remaining} />
          </>
        )}
      </section>

      {/* Rewards */}
      <section>
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Rewards</div>
        {next && (
          <div className="card p-4 mb-3">
            <div className="flex items-center justify-between text-[12.5px] mb-2">
              <span className="text-ink-300">Next: {next.tier.reward}</span>
              <span className="text-ink-500">{qualified}/{next.tier.referrals}</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
              <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.round((qualified / next.tier.referrals) * 100))}%` }} />
            </div>
            <div className="mt-1.5 text-[11px] text-ink-500">{next.remaining} more to unlock.</div>
          </div>
        )}
        <div className="space-y-1.5">
          {REWARD_TIERS.map((t) => {
            const got = qualified >= t.referrals;
            return (
              <div key={t.referrals} className="flex items-center justify-between text-[13px] py-1.5 border-b border-white/[0.05]">
                <span className={got ? "text-ink-100" : "text-ink-400"}>{t.referrals} · {t.reward}</span>
                <span className={got ? "text-signal-green text-[12px]" : "text-ink-600 text-[12px]"}>{got ? "Unlocked" : "Locked"}</span>
              </div>
            );
          })}
        </div>
        {unlocked && <p className="mt-3 text-[12px] text-signal-green">You&apos;ve unlocked: {unlocked.reward}.</p>}
      </section>

      {/* Leaderboard — gated behind the community-size threshold. */}
      {!lb.community.unlocked ? (
        <CommunityLeaderboardTeaser community={lb.community} />
      ) : (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Leaderboard</div>
            {lb.you?.rank != null && (
              <div className="text-[11.5px] text-ink-400">
                You&apos;re <span className="text-ink-100">#{lb.you.rank}</span> of {lb.totalReferrers}
                {lb.you.weeklyRank != null && <span className="text-ink-500"> · #{lb.you.weeklyRank} this week</span>}
              </div>
            )}
          </div>
          {lb.top.length === 0 ? (
            <p className="text-[13px] text-ink-400">No referrals yet — be the first. Share your link above.</p>
          ) : (
            <div className="space-y-1">
              {lb.top.map((r) => {
                const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : null;
                return (
                  <div key={r.rank} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] ${r.isYou ? "bg-accent/[0.08] border border-accent/20 text-ink-50" : "text-ink-300"}`}>
                    <span className="flex items-center gap-2.5">
                      <span className="w-6 text-center font-mono text-ink-500">{medal ?? r.rank}</span>
                      <span className={r.isYou ? "font-medium" : ""}>{r.handle}</span>
                    </span>
                    <span className="font-mono">{r.referrals} referral{r.referrals === 1 ? "" : "s"}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mt-3 text-[11px] text-ink-500">Friendly competition — members appear by their display name if they&apos;ve set one, otherwise an anonymous handle. Only you see &ldquo;You&rdquo;. Set yours on your <Link href="/profile" className="text-accent">profile</Link>. Referrals count one per referred visitor.</p>
        </section>
      )}

      <p className="text-[11px] text-ink-500 border-t border-white/[0.06] pt-5">
        Qualified (WAES) referral counts and 30-day retention finish linking as referred readers create their own
        Profiles. <Link href="/dashboard" className="text-accent">Back to your dashboard →</Link>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-5">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1.5 font-display text-[22px] text-ink-50 leading-none">{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}
