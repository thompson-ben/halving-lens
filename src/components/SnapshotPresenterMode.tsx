"use client";

import { useEffect } from "react";

// Presenter Mode chrome control for /snapshot?presenter=true. Hides the site
// sidebar/topbar via the existing `data-bare` hook (see globals.css) while the
// snapshot is being screen-recorded, and restores it on navigation away. The
// page itself handles the larger typography and simplified layout server-side.
export function SnapshotPresenterMode() {
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-bare", "1");
    return () => el.removeAttribute("data-bare");
  }, []);
  return null;
}
