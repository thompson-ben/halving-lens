import { cn } from "@/lib/utils";

export function ScoreBadge({ score, label = "AI" }: { score: number | null | undefined; label?: string }) {
  const s = score ?? 0;
  const tone =
    s >= 85 ? "bg-signal-green/15 text-signal-green border-signal-green/30"
    : s >= 70 ? "bg-accent/15 text-accent border-accent/30"
    : s >= 50 ? "bg-signal-amber/15 text-signal-amber border-signal-amber/30"
    : "bg-signal-red/15 text-signal-red border-signal-red/30";

  return (
    <span className={cn("badge", tone)}>
      <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
      <span className="font-semibold">{score === null || score === undefined ? "—" : s.toFixed(0)}</span>
    </span>
  );
}
