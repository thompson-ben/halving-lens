"use client";

import { cn } from "@/lib/cn";

// Shared segmented toggle used by the chart range selectors. One consistent
// control everywhere instead of per-chart bespoke buttons.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: {
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-lg border border-white/[0.07] bg-white/[0.02] p-0.5",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.key)}
            className={cn(
              "rounded-md font-medium tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50",
              size === "sm" ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11px]",
              active ? "bg-accent/15 text-accent" : "text-ink-400 hover:text-ink-200",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
