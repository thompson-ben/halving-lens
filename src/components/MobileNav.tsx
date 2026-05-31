"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { PRIMARY, EXPLORE, SOON, type NavLink } from "./navItems";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Portals need the DOM — only render the overlay after mount.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll and close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex items-center justify-center w-10 h-10 -ml-2 rounded-lg text-ink-200 hover:bg-white/[0.04] transition-colors"
      >
        <Menu size={20} strokeWidth={1.8} />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
          />
          <nav className="absolute left-0 top-0 h-full w-[82%] max-w-[300px] flex flex-col border-r border-white/[0.06] bg-ink-925 shadow-2xl">
            <div className="flex items-center justify-between px-6 h-[72px] border-b border-white/[0.04]">
              <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
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
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-ink-300 hover:bg-white/[0.04] transition-colors"
              >
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>

            <div className="flex-1 px-3 py-7 flex flex-col gap-0.5 overflow-y-auto">
              <SectionLabel>Cycle</SectionLabel>
              {PRIMARY.map((item) => (
                <MobileNavItem key={item.href} item={item} active={pathname === item.href} />
              ))}

              <SectionLabel className="mt-7">Explore</SectionLabel>
              {EXPLORE.map((item) => (
                <MobileNavItem key={item.href} item={item} active={pathname === item.href} />
              ))}

              <SectionLabel className="mt-7">Coming soon</SectionLabel>
              {SOON.map((item) => (
                <MobileNavItem key={item.href} item={item} active={pathname === item.href} muted />
              ))}
            </div>
          </nav>
        </div>,
          document.body,
        )}
    </div>
  );
}

function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-3 pb-2 text-[10px] uppercase tracking-[0.22em] text-ink-400 ${className}`}>
      {children}
    </div>
  );
}

function MobileNavItem({
  item,
  active,
  muted,
}: {
  item: NavLink;
  active: boolean;
  muted?: boolean;
}) {
  const { href, label, icon: Icon } = item;
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors duration-200 ${
        active
          ? "bg-white/[0.05] text-ink-100"
          : muted
            ? "text-ink-400 hover:bg-white/[0.035] hover:text-ink-100"
            : "text-ink-200 hover:bg-white/[0.035] hover:text-ink-100"
      }`}
    >
      <Icon
        size={16}
        strokeWidth={1.6}
        className={`${active ? "text-accent" : muted ? "text-ink-500" : "text-ink-400"} group-hover:text-accent transition-colors`}
      />
      <span>{label}</span>
    </Link>
  );
}
