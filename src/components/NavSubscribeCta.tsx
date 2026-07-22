"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { track } from "@/lib/track";
import { getAttribution } from "@/lib/attribution";

// A clear-but-restrained subscription route for the site chrome (P2.2). Routes
// to the homepage signup section (#subscribe) rather than forcing a scroll to
// the footer. Emits impression + click so the nav funnel is measurable; the form
// view/start/success events come from the signup component itself.
export function NavSubscribeCta({ placement, className }: { placement: "topbar" | "mobilenav"; className?: string }) {
  const seen = useRef(false);
  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    track("nav_subscribe_impression", { placement });
  }, [placement]);

  const base =
    placement === "topbar"
      ? "hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-accent text-ink-950 text-[12.5px] font-medium leading-none whitespace-nowrap shrink-0 hover:bg-accent-soft transition-colors"
      : "inline-flex items-center justify-center gap-2 w-full h-11 rounded-lg bg-accent text-ink-950 text-[13px] font-medium leading-none whitespace-nowrap hover:bg-accent-soft transition-colors";

  return (
    <Link
      href="/#subscribe"
      onClick={() => track("nav_subscribe_click", { placement, ...getAttribution() })}
      className={`${base} ${className ?? ""}`}
    >
      <Mail size={14} strokeWidth={1.9} /> Get the daily brief
    </Link>
  );
}
