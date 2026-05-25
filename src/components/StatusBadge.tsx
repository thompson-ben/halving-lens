import { cn } from "@/lib/utils";
import { STATUS_LABELS, type ContentStatus } from "@/types";

const TONE: Record<ContentStatus, string> = {
  new: "bg-ink-700 text-ink-100 border-ink-600",
  shortlisted: "bg-signal-blue/15 text-signal-blue border-signal-blue/30",
  permission_requested: "bg-signal-amber/15 text-signal-amber border-signal-amber/30",
  approved: "bg-signal-green/15 text-signal-green border-signal-green/30",
  rejected: "bg-signal-red/15 text-signal-red border-signal-red/30",
  posted: "bg-accent/15 text-accent border-accent/30",
};

export function StatusBadge({ status }: { status: ContentStatus | string }) {
  const safe = (STATUS_LABELS as Record<string, string>)[status] ? (status as ContentStatus) : "new";
  return <span className={cn("badge", TONE[safe])}>{STATUS_LABELS[safe]}</span>;
}
