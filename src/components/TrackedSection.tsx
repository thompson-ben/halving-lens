"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/track";
import { FeedbackWidget } from "./FeedbackWidget";

// Wraps a homepage section to measure engagement: fires `section_view` once
// when it first scrolls into view, and `section_click` when the user clicks
// inside it. `id` identifies the section in analytics. Pass `feedback` (a
// section name) to render an inline "Was this useful?" under the section.
export function TrackedSection({
  id,
  children,
  feedback,
}: {
  id: string;
  children: React.ReactNode;
  feedback?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  // Dwell tracking: accumulate how long the section is actually on screen, and
  // flush once on unmount/leave. This is the pre-simplification signal (P4.5) —
  // "which sections hold attention" — alongside section_view and section_click.
  const dwellMs = useRef(0);
  const visibleSince = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            if (!seen.current) {
              seen.current = true;
              track("section_view", { section: id });
            }
            if (visibleSince.current == null) visibleSince.current = Date.now();
          } else if (visibleSince.current != null) {
            dwellMs.current += Date.now() - visibleSince.current;
            visibleSince.current = null;
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (visibleSince.current != null) {
        dwellMs.current += Date.now() - visibleSince.current;
        visibleSince.current = null;
      }
      const seconds = Math.round(dwellMs.current / 1000);
      if (seconds >= 1) track("section_dwell", { section: id, seconds });
    };
  }, [id]);

  return (
    <div ref={ref} onClick={() => track("section_click", { section: id })}>
      {children}
      {feedback && (
        <FeedbackWidget variant="inline" section={feedback} contentType="homepage_section" />
      )}
    </div>
  );
}
