"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  BarChart3,
  CalendarDays,
  Sparkles,
  Settings as SettingsIcon,
  Download,
  Star,
  Sunrise,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today's Picks", icon: Sunrise },
  { href: "/discovery", label: "Discovery Queue", icon: ListChecks },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/import", label: "Import URL", icon: Download },
  { href: "/favourites", label: "Favourite Accounts", icon: Star },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-ink-700 bg-ink-950/60 backdrop-blur sticky top-0 h-screen hidden md:flex flex-col">
      <div className="px-5 py-5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-deep flex items-center justify-center text-ink-950 font-bold">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink-100">Supercar</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-300">Content Engine</div>
        </div>
      </div>
      <nav className="px-2 flex-1">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active ? "bg-ink-800 text-ink-100" : "text-ink-300 hover:bg-ink-850 hover:text-ink-100",
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-ink-700">
        <div className="text-[11px] text-ink-400">v0.1.0 · Phase 1</div>
      </div>
    </aside>
  );
}
