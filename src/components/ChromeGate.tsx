"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Keeps the data-bare flag in sync during in-app navigation, so /start stays
// distraction-free (no sidebar/top bar) and other pages restore the chrome. The
// initial paint is handled by an inline script in the root layout (no flash).
// Append ?nav=1 to /start to keep the full site chrome (Version A).
export function BareChromeSync() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const nav = new URLSearchParams(window.location.search).get("nav");
      const bare = pathname === "/start" && nav !== "1";
      const el = document.documentElement;
      if (bare) el.setAttribute("data-bare", "1");
      else el.removeAttribute("data-bare");
    } catch {
      /* ignore */
    }
  }, [pathname]);
  return null;
}
