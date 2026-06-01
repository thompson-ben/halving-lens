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
      {feedback && (
        <FeedbackWidget variant="inline" section={feedback} contentType="homepage_section" />
      )}
    </div>
  );
}
