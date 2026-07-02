"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Keeps the data-bare flag in sync during in-app navigation, so the paid
// landings (/start, /free) stay distraction-free — no sidebar/top bar/menu until
// the visitor signs up and is sent into the app. Other pages restore the chrome.
// The initial paint is handled by an inline script in the root layout (no flash).
// Append ?nav=1 to keep the full site chrome.
const BARE_PATHS = new Set(["/start", "/free"]);

export function BareChromeSync() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const nav = new URLSearchParams(window.location.search).get("nav");
      const bare = BARE_PATHS.has(pathname) && nav !== "1";
      const el = document.documentElement;
      if (bare) el.setAttribute("data-bare", "1");
      else el.removeAttribute("data-bare");
    } catch {
      /* ignore */
    }
  }, [pathname]);
  return null;
}
