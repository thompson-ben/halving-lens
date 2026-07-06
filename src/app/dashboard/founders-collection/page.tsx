import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ArrowUpRight, Download, ImageIcon, Smartphone, Monitor, FileText, Sparkles } from "lucide-react";
import { currentProfile, isFounderEmail } from "@/lib/profile";
import { REWARD_TIERS } from "@/lib/referral";
import { referralLeaderboard } from "@/lib/referralLeaderboard";
import { ProfileSignInForm } from "@/components/ProfileSignInForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Founder's Collection · HalvingLens",
  description: "Downloadable premium branded assets — a reward for introducing genuinely engaged readers.",
  robots: { index: false },
};

const GOLD = "#d9b96a";

// The referral count that unlocks the Founder's Collection — read from the ladder
// so it tracks any future re-tiering without a second source of truth.
const UNLOCK_AT = REWARD_TIERS.find((t) => t.href === "/dashboard/founders-collection")?.referrals ?? 3;

interface Asset {
  icon: ReactNode;
  title: string;
  desc: string;
  href: string;
  cta: string;
  filename?: string; // present ⇒ direct download; absent ⇒ opens in a new tab
}

const ASSETS: Asset[] = [
  {
    icon: <ImageIcon size={18} style={{ color: GOLD }} />,
    title: "Today's Cycle Read card",
    desc: "The signature 1200×630 share card — the live cycle read, ready to post.",
    href: "/og",
    cta: "Download PNG",
    filename: "halvinglens-cycle-read.png",
  },
  {
    icon: <Smartphone size={18} style={{ color: GOLD }} />,
    title: "Phone wallpaper",
    desc: "A 1080×1920 lock-screen backdrop with the current cycle progress and read.",
    href: "/og/wallpaper/phone",
    cta: "Download PNG",
    filename: "halvinglens-wallpaper-phone.png",
  },
  {
    icon: <Monitor size={18} style={{ color: GOLD }} />,
    title: "Desktop wallpaper",
    desc: "A 2560×1440 desktop backdrop in the HalvingLens house style.",
    href: "/og/wallpaper/desktop",
    cta: "Download PNG",
    filename: "halvinglens-wallpaper-desktop.png",
  },
  {
    icon: <FileText size={18} style={{ color: GOLD }} />,
    title: "Printable cycle summary",
    desc: "A clean one-page PDF of today's read — opens ready to save or print.",
    href: "/dashboard/founders-collection/print",
    cta: "Open printable PDF",
  },
  {
    icon: <Sparkles size={18} style={{ color: GOLD }} />,
    title: "Research carousel cards",
    desc: "Premium slide packs for every research finding — download from any finding's share kit.",
    href: "/research/findings",
    cta: "Browse research",
  },
];

export default async function FoundersCollectionPage() {
  const p = currentProfile();

  if (!p) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Header />
        <div className="card-glow p-6">
          <p className="text-[14px] text-ink-300 leading-relaxed mb-4">
            The Founder&apos;s Collection is a referral reward. Sign in to your HalvingLens Profile to access it.
          </p>
          <ProfileSignInForm next="/dashboard/founders-collection" />
        </div>
      </div>
    );
  }

  const lb = await referralLeaderboard(p.referralCode);
  const qualified = lb.you?.referrals ?? 0;
  const unlocked = qualified >= UNLOCK_AT || isFounderEmail(p.email);

  if (!unlocked) {
    const remaining = UNLOCK_AT - qualified;
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Header />
        <div className="card-glow p-6 space-y-4">
          <p className="text-[14px] text-ink-300 leading-relaxed">
            The Founder&apos;s Collection unlocks at <span className="text-ink-100">{UNLOCK_AT} referrals</span>. You have{" "}
            <span className="text-ink-100">{qualified}</span> — <span className="text-ink-100">{remaining} more</span> to go.
          </p>
          <div className="h-2 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, Math.round((qualified / UNLOCK_AT) * 100))}%` }} />
          </div>
          <Link href="/dashboard/referrals" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft">
            Get your referral link <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <Header unlocked />
      <p className="text-[13.5px] text-ink-300 leading-relaxed max-w-xl">
        Thank you for introducing genuinely engaged readers. These assets are yours to keep and share — each one is built
        from the live HalvingLens pipeline, so they stay current every time you download.
      </p>

      <section className="space-y-3">
        {ASSETS.map((a) => (
          <div key={a.title} className="card p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{a.icon}</div>
              <div>
                <div className="text-[14px] text-ink-100 font-medium">{a.title}</div>
                <div className="mt-0.5 text-[12.5px] text-ink-500 leading-relaxed">{a.desc}</div>
              </div>
            </div>
            <a
              href={a.href}
              {...(a.filename ? { download: a.filename } : { target: "_blank", rel: "noopener" })}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-3 py-2 text-[12px] text-ink-200 hover:border-accent/40 hover:text-ink-50"
            >
              {a.filename ? <Download size={13} /> : <ArrowUpRight size={13} />} {a.cta}
            </a>
          </div>
        ))}
      </section>

      <p className="text-[11px] text-ink-500 border-t border-white/[0.06] pt-5">
        More assets join the collection over time. <Link href="/dashboard/referrals" className="text-accent">Back to referrals →</Link>
      </p>
    </div>
  );
}

function Header({ unlocked = false }: { unlocked?: boolean }) {
  return (
    <header className="border-b border-white/[0.08] pb-6">
      <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
        HalvingLens · Referral Reward
      </div>
      <h1 className="mt-3 font-display text-[28px] lg:text-[34px] text-ink-50 tracking-tight-2">Founder&apos;s Collection</h1>
      <p className="mt-2 text-[13px] text-ink-400 max-w-xl">
        {unlocked
          ? "Premium branded assets, built from our chart pipeline — downloadable and always current."
          : "Premium branded assets — the first HalvingLens referral reward."}
      </p>
    </header>
  );
}
