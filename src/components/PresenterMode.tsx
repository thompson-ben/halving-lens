"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Grid2x2, Grid2x2X, X } from "lucide-react";
import { track } from "@/lib/track";

// Shared "studio" chrome for the flagship pages' presenter mode
// (?presenter=true). It turns a page from a dashboard into something built to
// be filmed:
//   • hides the site sidebar/topbar (the existing `data-bare` hook)
//   • flags the document as `data-presenter` so globals.css can apply the
//     broadcast-legibility treatment (bigger chart type, calmer spacing)
//   • draws optional recording safe-area guides (title-safe / action-safe)
//   • floats a minimal transport bar to toggle the guides and exit
// Purely presentational — no data or analysis changes.
export function PresenterMode({ page }: { page: string }) {
  const router = useRouter();
  const [guides, setGuides] = useState(false);

  // Own the presenter flag for the lifetime of the view. We deliberately use
  // data-presenter (not data-bare) to hide chrome, so BareChromeSync's per-route
  // data-bare housekeeping can't clobber it.
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-presenter", "1");
    track("presenter_mode", { page });
    return () => {
      el.removeAttribute("data-presenter");
      el.removeAttribute("data-guides");
    };
  }, [page]);

  // Reflect the guides toggle onto the document so the CSS overlay shows.
  useEffect(() => {
    const el = document.documentElement;
    if (guides) el.setAttribute("data-guides", "1");
    else el.removeAttribute("data-guides");
  }, [guides]);

  const exit = () => {
    // Drop ?presenter — back to the normal page.
    router.push(typeof window !== "undefined" ? window.location.pathname : "/");
  };

  // Keyboard: g toggles guides, Esc exits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "g" || e.key === "G") setGuides((v) => !v);
      if (e.key === "Escape") exit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* Recording safe-area guides — broadcast title/action-safe frames. */}
      {guides && (
        <div className="presenter-guides" aria-hidden>
          <div className="presenter-guide presenter-guide--action" />
          <div className="presenter-guide presenter-guide--title" />
        </div>
      )}

      {/* Studio transport bar. */}
      <div className="presenter-bar">
        <span className="presenter-bar__label">{page}</span>
        <span className="presenter-bar__sep" />
        <button
          type="button"
          onClick={() => setGuides((v) => !v)}
          className="presenter-bar__btn"
          aria-pressed={guides}
          title="Toggle recording safe-area guides (G)"
        >
          {guides ? <Grid2x2X size={14} /> : <Grid2x2 size={14} />}
          <span>Guides</span>
        </button>
        <button type="button" onClick={exit} className="presenter-bar__btn presenter-bar__btn--exit" title="Exit presenter mode (Esc)">
          <X size={14} />
          <span>Exit</span>
        </button>
      </div>
    </>
  );
}
