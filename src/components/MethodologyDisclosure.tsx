"use client";

import { useRef } from "react";
import { track } from "@/lib/track";

// Expandable methodology block. Fires production_cost_methodology_opened once
// per page view when first expanded (existing first-party analytics).
export function MethodologyDisclosure({
  eventName,
  summary,
  children,
}: {
  eventName: string;
  summary: string;
  children: React.ReactNode;
}) {
  const fired = useRef(false);
  return (
    <details
      className="card p-5 sm:p-6 group"
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open && !fired.current) {
          fired.current = true;
          track(eventName);
        }
      }}
    >
      <summary className="cursor-pointer text-[13px] font-medium text-ink-100 list-none flex items-center justify-between gap-3">
        {summary}
        <span className="text-ink-500 text-[11px] group-open:hidden">Expand</span>
        <span className="text-ink-500 text-[11px] hidden group-open:inline">Collapse</span>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
