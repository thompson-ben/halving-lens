"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/track";

// Wraps a homepage section to measure engagement: fires `section_view` once
// when it first scrolls into view, and `section_click` when the user clicks
// inside it. `id` identifies the section in analytics.
export function TrackedSection({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !seen.current) {
            seen.current = true;
            track("section_view", { section: id });
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id]);

  return (
    <div ref={ref} onClick={() => track("section_click", { section: id })}>
      {children}
    </div>
  );
}
