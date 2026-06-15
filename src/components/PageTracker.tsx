"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageView, trackEngagement } from "@/lib/track";

// Fires a page_view on every route change, and an engagement event (time on
// page + max scroll depth) when the visitor leaves that page. Mounted once in
// the root layout.
export function PageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    trackPageView();

    const start = Date.now();
    let maxScroll = 0;
    let fired = false;

    const scrollPct = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return 100; // short page — fully seen
      return (window.scrollY / scrollable) * 100;
    };
    const onScroll = () => {
      maxScroll = Math.max(maxScroll, scrollPct());
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const fire = () => {
      if (fired) return;
      fired = true;
      trackEngagement(Math.round((Date.now() - start) / 1000), maxScroll, pathname);
    };
    window.addEventListener("pagehide", fire);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pagehide", fire);
      fire(); // route change within the SPA
    };
  }, [pathname]);
  return null;
}
