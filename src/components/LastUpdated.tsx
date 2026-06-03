import { SOURCE } from "@/lib/btcData";
import { cn } from "@/lib/cn";

// Clear "as of" timestamp for any surface that states a price or metric. Values
// come from the daily snapshot, not a live tick — this makes the freshness
// explicit. Shown in UTC so it's unambiguous across viewers.
const fmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function lastUpdatedLabel(): string | null {
  if (!SOURCE.fetchedAt) return null;
  return `${fmt.format(new Date(SOURCE.fetchedAt))} UTC`;
}

// Compact date + time for the top-bar data pill (UTC). The page-level
// `lastUpdatedLabel` carries the year too; here we keep it short but still show
// the refresh time, not just the day.
const fmtShort = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function lastUpdatedShort(): string | null {
  if (!SOURCE.fetchedAt) return null;
  return fmtShort.format(new Date(SOURCE.fetchedAt));
}

export function LastUpdated({
  prefix = "Updated",
  className,
}: {
  prefix?: string;
  className?: string;
}) {
  const label = lastUpdatedLabel();
  if (!label) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[10.5px] text-ink-400", className)}
      title={`Data synced ${new Date(SOURCE.fetchedAt!).toUTCString()}. Values are from the daily snapshot, not a live tick.`}
    >
      <span className="w-1 h-1 rounded-full bg-ink-500" />
      {prefix} {label}
    </span>
  );
}
