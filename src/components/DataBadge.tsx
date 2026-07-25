import { cn } from "@/lib/cn";
import { STATUS_LABEL, type DataStatus } from "@/lib/cycleIntel";

// Site-wide data-transparency badge. One source of truth for how we signal
// whether a number is real, derived from real data, or not shown yet.
const TONE: Record<DataStatus, { pill: string; dot: string }> = {
  live: {
    pill: "text-signal-green border-signal-green/25 bg-signal-green/[0.08]",
    dot: "bg-signal-green",
  },
  "live-derived": {
    pill: "text-accent border-accent/25 bg-accent/[0.08]",
    dot: "bg-accent",
  },
  modelled: {
    pill: "text-signal-violet border-signal-violet/25 bg-signal-violet/[0.08]",
    dot: "bg-signal-violet",
  },
  "coming-soon": {
    pill: "text-signal-amber border-signal-amber/25 bg-signal-amber/[0.07]",
    dot: "bg-signal-amber",
  },
};

// Plain-English explanation shown on hover — demystifies "live-derived".
export const STATUS_EXPLAIN: Record<DataStatus, string> = {
  live: "Real data, fetched from a live source on each daily sync.",
  "live-derived": "Calculated from live Bitcoin price (e.g. moving-average ratios) — real, not modelled.",
  modelled:
    "This metric is calculated using documented assumptions and observed network data. It is intended to provide historical context rather than an exact observable value.",
  "coming-soon": "Not shown yet — no live source connected. We don't display estimated numbers as if they were real.",
};

export function DataBadge({
  status,
  source,
  size = "md",
  showDot = true,
  className,
}: {
  status: DataStatus;
  /** Optional source string shown next to the pill. */
  source?: string;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}) {
  const t = TONE[status];
  const live = status === "live" || status === "live-derived";
  return (
    <span className={cn("inline-flex items-center gap-2 flex-wrap", className)}>
      <span
        title={STATUS_EXPLAIN[status]}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide uppercase cursor-help",
          size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]",
          t.pill,
        )}
      >
        {showDot && (
          <span
            className={cn(
              "rounded-full",
              size === "sm" ? "w-1 h-1" : "w-1.5 h-1.5",
              t.dot,
              live && "live-dot relative",
            )}
          />
        )}
        {STATUS_LABEL[status]}
      </span>
      {source && <span className="text-[11px] text-ink-400">{source}</span>}
    </span>
  );
}
