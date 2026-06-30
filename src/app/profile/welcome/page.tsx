import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { redirect } from "next/navigation";
import { currentProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";
export const metadata = { title: "Welcome to your HalvingLens Profile", robots: { index: false } };

const GOLD = "#d9b96a";
const UNLOCKED = [
  "Save research",
  "Track your reading history",
  "Earn badges",
  "Build referral rewards",
  "Unlock achievements",
  "Access future Premium features",
];

// Premium post-sign-in welcome. Emphasises value unlocked, not "you logged in".
export default function ProfileWelcomePage() {
  const p = currentProfile();
  if (!p) redirect("/profile");

  return (
    <div className="max-w-xl mx-auto text-center space-y-8 py-6">
      <div>
        <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>Your HalvingLens Profile</div>
        <h1 className="mt-3 font-display text-[32px] lg:text-[42px] leading-[1.08] text-ink-50 tracking-tight-2">
          Welcome to your HalvingLens Profile.
        </h1>
        <p className="mt-4 text-[15px] text-ink-300 leading-relaxed">
          Your progress is now securely saved across all your devices.
        </p>
      </div>

      <div className="card-glow p-6 sm:p-7 text-left">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>You can now</div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
          {UNLOCKED.map((u) => (
            <li key={u} className="flex items-center gap-2 text-[14px] text-ink-200">
              <Check size={15} className="text-signal-green shrink-0" /> {u}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-center gap-3 flex-wrap">
        <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-accent text-ink-950 text-[14px] font-medium hover:bg-accent-soft transition-colors">
          Open your dashboard <ArrowUpRight size={16} />
        </Link>
        <Link href="/dashboard/referrals" className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-200">
          Set up referrals <ArrowUpRight size={14} />
        </Link>
      </div>
    </div>
  );
}
