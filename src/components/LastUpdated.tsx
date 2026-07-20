import { SOURCE, SPOT } from "@/lib/btcData";
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

// Date only (no time), UTC — e.g. "8 Jul 2026". Used to date a "daily close"
// label so the reader can see at a glance which close a price refers to.
const fmtDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function lastUpdatedDate(): string | null {
  if (!SOURCE.fetchedAt) return null;
  return fmtDate.format(new Date(SOURCE.fetchedAt));
}

// Date (UTC) of the daily close the headline price actually represents — the
// last COMPLETED daily candle (SPOT.ts), NOT when we synced (SOURCE.fetchedAt).
// The sync runs during the current, still-unfinished day, so dating the close
// by the sync time reads as "a close for a day that hasn't ended yet". Dating it
// by the candle's own timestamp is what the number genuinely is.
export function dailyCloseDate(): string | null {
  if (!SPOT?.ts) return null;
  return fmtDate.format(new Date(SPOT.ts));
}

// Source label that states the price is a daily close AND which day's close it
// is — so freshness is obvious right where the number is described.
export function dailyCloseSource(): string {
  const d = dailyCloseDate();
  return d ? `daily close · ${d}` : "daily close";
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
