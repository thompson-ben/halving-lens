import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { Metadata } from "next";
import { currentProfile } from "@/lib/profile";
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

export default function ProfilePage() {
  const p = currentProfile();

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
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft">Open your dashboard <ArrowUpRight size={13} /></Link>
              <Link href="/dashboard/referrals" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-400 hover:text-ink-200">Referrals <ArrowUpRight size={13} /></Link>
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
