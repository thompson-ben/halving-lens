import Link from "next/link";
import { Activity, Crown, LineChart, Radar, Waves, Wallet, Bell, Settings, type LucideIcon } from "lucide-react";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Markets", icon: LineChart },
  { href: "/smart-money", label: "Smart Money", icon: Crown },
  { href: "/flows", label: "DEX Flow", icon: Waves },
  { href: "/scanner", label: "Scanner", icon: Radar },
  { href: "/alerts", label: "Alerts", icon: Bell },
] as const;

const SECONDARY = [
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r border-white/5 bg-ink-900/60 backdrop-blur sticky top-0 h-screen">
      <Link href="/" className="flex items-center gap-2.5 px-5 h-16 border-b border-white/5">
        <Logo size={28} />
        <div className="leading-tight">
          <div className="font-semibold text-[15px] tracking-tight text-ink-100">
            Chain<span className="text-gradient">glass</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-400">on-chain markets</div>
        </div>
      </Link>

      <nav className="flex-1 px-3 py-5 flex flex-col gap-1">
        <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.18em] text-ink-400">
          Discover
        </div>
        {NAV.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}

        <div className="px-3 pt-6 pb-2 text-[10px] uppercase tracking-[0.18em] text-ink-400">
          You
        </div>
        {SECONDARY.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      <div className="m-3 p-4 rounded-xl border border-white/5 bg-gradient-to-br from-accent/10 to-violet-glow/5">
        <div className="flex items-center gap-2 text-xs text-accent">
          <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-accent live-dot" />
          <span>Live indexer</span>
        </div>
        <div className="mt-1.5 text-[11px] text-ink-300 leading-relaxed">
          Block lag <span className="text-ink-100 font-mono">0.4s</span> · 6 chains · 12M wallets
          labeled
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] text-ink-200 hover:bg-white/[0.04] hover:text-ink-100 transition-colors"
    >
      <Icon size={16} className="text-ink-400 group-hover:text-accent transition-colors" />
      <span>{label}</span>
    </Link>
  );
}
