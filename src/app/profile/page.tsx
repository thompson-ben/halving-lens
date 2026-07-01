import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { Metadata } from "next";
import { currentProfile, memberIdentity } from "@/lib/profile";
import { referralLink } from "@/lib/referral";
import { SITE_URL } from "@/lib/site";
import { ProfileSignInForm, SignOutButton } from "@/components/ProfileSignInForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your HalvingLens Profile",
  description: "Your personalised research identity — saved research, streaks, badges and referrals, synced across your devices.",
  robots: { index: false },
};

const GOLD = "#d9b96a";

const UNLOCKS = [
  "Save research",
  "Track your reading history",
  "Earn badges",
  "Build referral rewards",
  "Unlock achievements",
  "Access future Premium features",
];

export default async function ProfilePage() {
  const p = currentProfile();
  const identity = p ? await memberIdentity(p.email) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="border-b border-white/[0.08] pb-7">
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Your HalvingLens Profile</div>
        <h1 className="mt-3 font-display text-[30px] lg:text-[38px] leading-[1.1] text-ink-50 tracking-tight-2">
          {p ? "Your Profile" : "Unlock your personalised research experience"}
        </h1>
      </header>

      {p ? (
        <>
          <div className="card-glow p-6">
            <div className="text-[12px] text-ink-400">Signed in as</div>
            <div className="mt-1 text-[16px] text-ink-50 font-medium">{p.email}</div>

            {/* Identity — institutional credentials, understated */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {identity?.isFounder && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px]" style={{ color: GOLD, borderColor: "rgba(217,185,106,0.4)", background: "rgba(217,185,106,0.08)" }}>
                  <span style={{ color: GOLD }}>◆</span> Founder
                </span>
              )}
              {identity?.isEarlySupporter && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px]" style={{ color: GOLD, borderColor: "rgba(217,185,106,0.3)", background: "rgba(217,185,106,0.05)" }}>
                  <span style={{ color: GOLD }}>◆</span> Early Supporter
                </span>
              )}
              {identity?.memberNo != null && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-white/[0.1] text-[11px] text-ink-400 font-mono">
                  Member #{identity.memberNo.toLocaleString()}
                </span>
              )}
            </div>

            {identity?.isFounder && (
              <details className="mt-4 group">
                <summary className="text-[12px] text-ink-400 hover:text-ink-200 cursor-pointer select-none" style={{ listStyle: "none" }}>
                  <span style={{ color: GOLD }}>◆ Founder</span> — about
                </summary>
                <div className="mt-2 card p-4 text-[13px] text-ink-300 leading-relaxed">
                  One of the original creators of HalvingLens — building a research platform focused on historical
                  context rather than market predictions.
                  <div className="mt-2 text-ink-500 italic">“Historical context. Not prediction.”</div>
                </div>
              </details>
            )}

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft">Open your dashboard <ArrowUpRight size={13} /></Link>
              <Link href="/dashboard/referrals" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">Referrals <ArrowUpRight size={13} /></Link>
              {identity?.isFounder && (
                <Link href="/admin/growth" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">Founder Dashboard <ArrowUpRight size={13} /></Link>
              )}
              <SignOutButton />
            </div>
          </div>

          <section>
            <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>Your referral link</div>
            <div className="card p-4 font-mono text-[12.5px] text-ink-200 break-all">{referralLink(p.email, SITE_URL)}</div>
            <Link href="/dashboard/referrals" className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] text-accent">Open referral dashboard <ArrowUpRight size={13} /></Link>
          </section>
        </>
      ) : (
        <>
          <div className="card-glow p-6 sm:p-7">
            <p className="text-[14.5px] text-ink-300 leading-relaxed">
              Create your free HalvingLens Profile to save your progress across all your devices. No password, no
              username — just a secure one-click sign-in link.
            </p>
            <div className="mt-5">
              <ProfileSignInForm next="/profile/welcome" />
            </div>
          </div>
          <p className="text-[12px] text-ink-500">Browsing HalvingLens never requires a profile. This only saves what&apos;s yours.</p>
        </>
      )}

      {/* What it unlocks */}
      <section>
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-3" style={{ color: GOLD }}>What your Profile unlocks</div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {UNLOCKS.map((u) => (
            <li key={u} className="flex items-center gap-2 text-[13.5px] text-ink-300">
              <Check size={14} className="text-signal-green shrink-0" /> {u}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
