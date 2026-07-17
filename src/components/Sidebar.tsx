import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Logo } from "./Logo";
import { NAV_SECTIONS } from "./navItems";
import { TODAY_DAY_IN_CYCLE } from "@/lib/btcData";
import { halvingStats } from "@/lib/halvingStats";

export function Sidebar() {
  const stats = halvingStats();
  return (
    <aside className="hidden md:flex md:w-60 lg:w-[252px] shrink-0 flex-col border-r border-white/[0.04] bg-ink-925/70 backdrop-blur-xl sticky top-0 h-screen">
      <Link
        href="/"
        className="flex items-center gap-3 px-6 h-[72px] border-b border-white/[0.04]"
      >
        <Logo size={26} />
        <div className="leading-tight">
          <div className="font-display text-[18px] font-medium tracking-tight-2 text-ink-100">
            Halvinglens<span className="text-accent">.com</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.20em] text-ink-400 mt-0.5">
            Bitcoin cycles
          </div>
        </div>
      </Link>

      <nav className="flex-1 px-3 py-7 flex flex-col gap-0.5 overflow-y-auto">
        {NAV_SECTIONS.map((section, i) => (
          <div key={section.label} className="contents">
            <SectionLabel className={`${section.accent ? "text-accent" : ""} ${i > 0 ? "mt-7" : ""}`}>
              {section.label}
            </SectionLabel>
            {section.items.map((item) => (
              <NavItem key={item.href} {...item} muted={section.muted} />
            ))}
          </div>
        ))}
      </nav>

      <div className="m-3 px-4 py-3.5 rounded-xl border border-white/[0.04] bg-white/[0.015]">
        <div className="flex items-center gap-2 text-[11px] text-accent">
          <span className="relative inline-block w-1.5 h-1.5 rounded-full bg-accent live-dot" />
          <span className="font-mono tracking-wider">
            BLOCK {stats.blockHeight.toLocaleString()}
          </span>
        </div>
        <div className="mt-2 text-[11px] text-ink-350 leading-relaxed">
          <span className="text-ink-200 font-mono">{TODAY_DAY_IN_CYCLE}</span> days since the 2024
          halving
        </div>
      </div>
    </aside>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-3 pb-2 text-[10px] uppercase tracking-[0.22em] text-ink-400 ${className}`}>
      {children}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  muted,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-colors duration-200 ${
        muted ? "text-ink-400" : "text-ink-200"
      } hover:bg-white/[0.035] hover:text-ink-100`}
    >
      <Icon
        size={15}
        strokeWidth={1.6}
        className={`${muted ? "text-ink-500" : "text-ink-400"} group-hover:text-accent transition-colors`}
      />
      <span>{label}</span>
    </Link>
  );
}
