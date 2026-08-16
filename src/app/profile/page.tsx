import Link from "next/link";
import { ArrowUpRight, Check, Flame, Trophy, Users, BookOpen, Sparkles, Target } from "lucide-react";
import type { Metadata } from "next";
import { currentProfile, getProfileState, getDisplayName } from "@/lib/profile";
import { buildInvestorProfile, rewardLadder, type InvestorProfile } from "@/lib/investorProfile";
import { unlockedRewards } from "@/lib/referral";
import { ProfileSignInForm, SignOutButton } from "@/components/ProfileSignInForm";
import { HallOptOut } from "@/components/HallOptOut";
import { DisplayNameForm } from "@/components/DisplayNameForm";
import { YouTubeSubscribe } from "@/components/YouTubeSubscribe";
import { YOUTUBE_LIVE, YOUTUBE_URL } from "@/lib/lifecycleConfig";
import { reconcileMilestones } from "@/lib/milestones";
import { CelebrationToaster } from "@/components/CelebrationToaster";
import { CelebrationsToggle } from "@/components/CelebrationsToggle";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your Investor Profile",
  description: "Your personal HalvingLens dashboard — reading streak, achievements, referrals and your investor journey.",
  robots: { index: false },
};

const GOLD = "#d9b96a";

export default async function ProfilePage() {
  const p = currentProfile();
  if (!p) return <SignedOut />;
  const [state, displayName] = await Promise.all([getProfileState(p.email), getDisplayName(p.email)]);
  const nowISO = new Date().toISOString().slice(0, 10);
  const ip = await buildInvestorProfile(p.email, state, nowISO);

  // Record any newly-earned milestones (once), and celebrate them unless the
  // member has turned celebrations off.
  const { newlyEarned } = await reconcileMilestones(p.email, state, ip.earnedMilestones, Date.now());
  const celebrationsOn = state.celebrationsOff !== true;

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {celebrationsOn && newlyEarned.length > 0 && <CelebrationToaster celebrations={newlyEarned} />}
      <header className="border-b border-white/[0.08] pb-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Your Investor Profile</div>
        <h1 className="mt-3 font-display text-[30px] lg:text-[38px] leading-[1.1] text-ink-50 tracking-tight-2">{displayName || p.email}</h1>
        {displayName && <div className="mt-1 text-[13px] text-ink-500">{p.email}</div>}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {ip.identity.isFounder && <Cred label="Founder" strong />}
          {ip.identity.isEarlySupporter ? <Cred label="Early Supporter" /> : ip.isFoundingMember ? <Cred label="Founding Member" /> : null}
          {ip.identity.memberNo != null && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/[0.1] text-[11px] text-ink-400 font-mono">
              Member #{ip.identity.memberNo.toLocaleString()}
            </span>
          )}
          <span className="text-[12px] text-ink-500">· Member since {ip.memberSince}</span>
        </div>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft">Open your HalvingLens <ArrowUpRight size={13} /></Link>
          <Link href="/dashboard/referrals" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">Referrals <ArrowUpRight size={13} /></Link>
          {ip.identity.isFounder && <Link href="/admin/growth" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">Founder Dashboard <ArrowUpRight size={13} /></Link>}
          <SignOutButton />
        </div>
        <div className="mt-5 max-w-md space-y-3">
          <DisplayNameForm initialName={displayName} />
          <CelebrationsToggle initialEnabled={celebrationsOn} />
        </div>
      </header>

      <Snapshot ip={ip} />
      {ip.isFoundingMember && <FoundingMember ip={ip} hidden={!!state.hideFromHall} />}
      <ReadingStats ip={ip} />
      <Referrals ip={ip} />
      <Achievements ip={ip} />
      {YOUTUBE_LIVE && (
        <section>
          <SectionLabel>Watch &amp; subscribe</SectionLabel>
          <YouTubeSubscribe url={YOUTUBE_URL} initialSubscribed={!!state.youtubeSubscribed} />
        </section>
      )}
      <Completion ip={ip} />
      <JourneyTimeline ip={ip} />
    </div>
  );
}

// ── Investor Snapshot — the signature card ────────────────────────────────────
function Snapshot({ ip }: { ip: InvestorProfile }) {
  const cells = [
    { label: "Member since", value: ip.memberSince, sub: "", icon: null },
    { label: "Reading streak", value: `${ip.streak.current}`, sub: ip.streak.current === 1 ? "day" : "days", icon: <Flame size={14} className="text-signal-amber" /> },
    { label: "Briefs read", value: `${ip.briefsRead}`, sub: "", icon: <BookOpen size={14} className="text-ink-400" /> },
    { label: "Achievements", value: `${ip.achievements.earnedCount}`, sub: "", icon: <Trophy size={14} style={{ color: GOLD }} /> },
    { label: "Referrals", value: `${ip.referral.count}`, sub: "", icon: <Users size={14} className="text-ink-400" /> },
    { label: "Profile", value: `${ip.completion.pct}%`, sub: "", icon: <Target size={14} className="text-signal-green" /> },
  ];
  return (
    <section>
      <SectionLabel>Investor Snapshot</SectionLabel>
      <div className="card-glow p-6 sm:p-7" style={{ borderColor: "rgba(217,185,106,0.2)" }}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-6">
          {cells.map((c) => (
            <div key={c.label}>
              <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] text-ink-500">{c.icon}{c.label}</div>
              <div className="mt-1.5 font-display text-[30px] leading-none text-ink-50">
                {c.value}{c.sub && <span className="text-[14px] text-ink-500"> {c.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Founding Member ───────────────────────────────────────────────────────────
function FoundingMember({ ip, hidden }: { ip: InvestorProfile; hidden: boolean }) {
  return (
    <section>
      <SectionLabel>Founding Member</SectionLabel>
      <div className="card p-5 sm:p-6" style={{ borderColor: "rgba(217,185,106,0.25)" }}>
        <div className="flex items-center gap-2">
          <span style={{ color: GOLD }}>◆</span>
          <span className="text-[15px] font-medium text-ink-50">You&apos;re a Founding Member of HalvingLens.</span>
        </div>
        <p className="mt-1.5 text-[12.5px] text-ink-400">One of the earliest supporters — this status is permanent.</p>
        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {ip.foundingBenefits.map((b) => (
            <li key={b} className="flex items-center gap-2 text-[13px] text-ink-300"><Check size={13} className="text-signal-green shrink-0" /> {b}</li>
          ))}
        </ul>
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3 flex-wrap">
          <Link href="/founders" className="inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft">Visit the Hall of Founders <ArrowUpRight size={13} /></Link>
          <HallOptOut initialHidden={hidden} />
        </div>
      </div>
    </section>
  );
}

// ── Reading statistics ────────────────────────────────────────────────────────
function ReadingStats({ ip }: { ip: InvestorProfile }) {
  const stats = [
    { label: "Current streak", value: `${ip.streak.current}`, sub: "days", tone: "text-signal-amber" },
    { label: "Longest streak", value: `${ip.streak.longest}`, sub: "days", tone: "text-ink-50" },
    { label: "Briefs read", value: `${ip.briefsRead}`, sub: "", tone: "text-ink-50" },
    { label: "Days active", value: `${ip.daysActive}`, sub: "", tone: "text-ink-50" },
  ];
  return (
    <section>
      <SectionLabel>Reading statistics</SectionLabel>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#0b0f15] px-4 py-5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500">{s.label}</div>
            <div className={`mt-1.5 font-display text-[26px] leading-none ${s.tone}`}>{s.value}{s.sub && <span className="text-[12px] text-ink-500"> {s.sub}</span>}</div>
          </div>
        ))}
      </div>
      {ip.streak.activeToday ? (
        <p className="mt-2 text-[12px] text-signal-green">✓ You&apos;ve read today — streak safe.</p>
      ) : (
        <p className="mt-2 text-[12px] text-ink-500">Read today&apos;s brief to keep your streak alive.</p>
      )}
    </section>
  );
}

// ── Referrals ─────────────────────────────────────────────────────────────────
function Referrals({ ip }: { ip: InvestorProfile }) {
  const ladder = rewardLadder(ip.referral.count);
  // Instant rewards we can hand over right now (today: the Founder's Collection).
  const access = unlockedRewards(ip.referral.count).filter((u) => u.kind === "access");
  return (
    <section>
      <SectionLabel>Referrals</SectionLabel>
      <div className="card p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-display text-[34px] leading-none text-ink-50">{ip.referral.count}</div>
            <div className="text-[12px] text-ink-500 mt-1">
              confirmed referral{ip.referral.count === 1 ? "" : "s"}
              {ip.referral.leaderboardPosition != null && <span> · leaderboard <span className="text-ink-300">#{ip.referral.leaderboardPosition}</span></span>}
            </div>
          </div>
          {ip.referral.next && (
            <div className="text-right">
              <div className="text-[12px] text-ink-400">{ip.referral.next.remaining} more to unlock</div>
              <div className="text-[13.5px] font-medium" style={{ color: GOLD }}>{ip.referral.next.reward}</div>
            </div>
          )}
        </div>
        <Bar pct={ip.referral.progressPct} className="mt-4" />

        <div className="mt-3 font-mono text-[12.5px] text-ink-300 break-all rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">{ip.referral.link}</div>

        <div className="mt-5 space-y-2">
          {ladder.map((t) => (
            <div key={t.referrals} className="flex items-center gap-3">
              <div className={`w-7 shrink-0 text-right font-mono text-[12px] ${t.unlocked ? "text-accent" : "text-ink-500"}`}>{t.referrals}</div>
              <div className={`w-4 shrink-0 flex justify-center ${t.unlocked ? "text-signal-green" : "text-ink-600"}`}>{t.unlocked ? <Check size={13} /> : "○"}</div>
              <div className={`text-[13px] ${t.unlocked ? "text-ink-100" : t.current ? "text-ink-200" : "text-ink-500"}`}>{t.reward}{t.current && !t.unlocked && <span className="text-ink-500"> · next</span>}</div>
            </div>
          ))}
        </div>
        {access.map((u) => (
          u.kind === "access" && (
            <Link key={u.tier.referrals} href={u.href} className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-accent/25 bg-accent/[0.06] px-3.5 py-3 text-[13px] hover:border-accent/40">
              <span className="text-ink-100"><span className="text-signal-green">✓ {u.tier.reward} unlocked.</span> {u.label}</span>
              <ArrowUpRight size={14} className="text-accent shrink-0" />
            </Link>
          )
        ))}
        <Link href="/dashboard/referrals" className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft">Open referral dashboard <ArrowUpRight size={13} /></Link>
      </div>
    </section>
  );
}

// ── Achievements ──────────────────────────────────────────────────────────────
function Achievements({ ip }: { ip: InvestorProfile }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel className="mb-0">Achievements</SectionLabel>
        <span className="text-[12px] text-ink-500">{ip.achievements.earnedCount} / {ip.achievements.total} earned</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {ip.achievements.list.map((a) => (
          <div key={a.id} className={`rounded-xl border p-3.5 ${a.earned ? "border-white/[0.1] bg-white/[0.02]" : "border-white/[0.05] bg-transparent opacity-45"}`}>
            <div className="flex items-center gap-2">
              <span className="text-[18px] leading-none">{a.icon}</span>
              <span className={`text-[13px] font-medium ${a.earned ? "text-ink-100" : "text-ink-400"}`}>{a.name}</span>
            </div>
            <div className="mt-1.5 text-[11.5px] text-ink-500 leading-snug">{a.description}</div>
            {a.earned ? (
              <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-signal-green"><Check size={11} /> Earned</div>
            ) : (
              <div className="mt-2 text-[10.5px] text-ink-600">Locked</div>
            )}
          </div>
        ))}
      </div>
      {ip.achievements.next && (
        <p className="mt-3 text-[12px] text-ink-400">Next up: <span className="text-ink-200">{ip.achievements.next.icon} {ip.achievements.next.name}</span> — {ip.achievements.next.description}</p>
      )}
    </section>
  );
}

// ── Profile completion ────────────────────────────────────────────────────────
function Completion({ ip }: { ip: InvestorProfile }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <SectionLabel className="mb-0">Profile completion</SectionLabel>
        <span className="text-[13px] font-medium" style={{ color: ip.completion.pct >= 100 ? "#5fd0a0" : GOLD }}>{ip.completion.pct}%</span>
      </div>
      <Bar pct={ip.completion.pct} />
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {ip.completion.tasks.map((t) => {
          const inner = (
            <>
              <span className={`w-4 flex justify-center shrink-0 ${t.done ? "text-signal-green" : "text-ink-600"}`}>{t.done ? <Check size={14} /> : "○"}</span>
              <span className={t.done ? "text-ink-300" : "text-ink-500 group-hover:text-ink-200 transition-colors"}>{t.label}</span>
              {/* An arrow nudges the tasks still to do; completed rows stay calm. */}
              {t.href && !t.done && <ArrowUpRight size={12} className="text-ink-600 group-hover:text-ink-300 transition-colors" />}
            </>
          );
          return t.href ? (
            <Link key={t.id} href={t.href} className="group flex items-center gap-2 text-[13px]">
              {inner}
            </Link>
          ) : (
            <div key={t.id} className="flex items-center gap-2 text-[13px]">
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ── Journey timeline ──────────────────────────────────────────────────────────
function JourneyTimeline({ ip }: { ip: InvestorProfile }) {
  return (
    <section>
      <SectionLabel>Your investor journey</SectionLabel>
      <div className="relative pl-6">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-white/[0.08]" />
        <div className="space-y-4">
          {ip.timeline.map((e, i) => (
            <div key={i} className="relative">
              <div className={`absolute -left-6 top-0.5 w-[15px] h-[15px] rounded-full border ${e.done ? "border-accent/50 bg-accent/10" : "border-white/[0.12] bg-transparent"}`} />
              <div className="flex items-baseline gap-2">
                <span className="text-[13.5px]">{e.icon}</span>
                <span className={`text-[13.5px] ${e.done ? "text-ink-100" : "text-ink-500"}`}>{e.label}</span>
                {e.date && e.date !== "—" && <span className="text-[11.5px] text-ink-500">· {e.date}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Anonymous ─────────────────────────────────────────────────────────────────
function SignedOut() {
  const UNLOCKS = ["Reading streak", "Achievements", "Investor Snapshot", "Referral rewards", "Your journey timeline", "Synced across devices"];
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="border-b border-white/[0.08] pb-7">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Your Investor Profile</div>
        <h1 className="mt-3 font-display text-[30px] lg:text-[38px] leading-[1.1] text-ink-50 tracking-tight-2">Your personal research dashboard</h1>
      </header>
      <div className="card-glow p-6 sm:p-7">
        <p className="text-[14.5px] text-ink-300 leading-relaxed">
          Create your free Investor Profile to track your reading streak, earn achievements and build referral rewards — no
          password, just a secure one-click sign-in link.
        </p>
        <div className="mt-5"><ProfileSignInForm next="/profile" /></div>
      </div>
      <section>
        <SectionLabel>What your profile unlocks</SectionLabel>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {UNLOCKS.map((u) => (
            <li key={u} className="flex items-center gap-2 text-[13.5px] text-ink-300"><Sparkles size={13} style={{ color: GOLD }} className="shrink-0" /> {u}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ── Shared bits ───────────────────────────────────────────────────────────────
function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-[10.5px] uppercase tracking-[0.22em] mb-3 ${className}`} style={{ color: GOLD }}>{children}</div>;
}
function Cred({ label, strong }: { label: string; strong?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px]" style={{ color: GOLD, borderColor: strong ? "rgba(217,185,106,0.4)" : "rgba(217,185,106,0.3)", background: strong ? "rgba(217,185,106,0.08)" : "rgba(217,185,106,0.05)" }}>
      <span style={{ color: GOLD }}>◆</span> {label}
    </span>
  );
}
function Bar({ pct, className = "" }: { pct: number; className?: string }) {
  return (
    <div className={`h-2 rounded-full bg-white/[0.06] overflow-hidden ${className}`}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: GOLD }} />
    </div>
  );
}
