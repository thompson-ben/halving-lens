import { cn } from "@/lib/cn";

interface Props {
  label: string;
  value: React.ReactNode;
  delta?: { value: number; suffix?: string } | string;
  hint?: string;
  accent?: boolean;
  className?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, delta, hint, accent, className, icon }: Props) {
  const deltaNode =
    typeof delta === "object" && delta !== null ? (
      <span
        className={cn(
          "font-mono text-[11.5px] tabular-nums",
          delta.value > 0 ? "text-signal-green" : delta.value < 0 ? "text-signal-red" : "text-ink-350",
        )}
      >
        {delta.value > 0 ? "+" : ""}
        {delta.value.toFixed(2)}
        {delta.suffix ?? "%"}
      </span>
    ) : typeof delta === "string" ? (
      <span className="text-[11.5px] text-ink-350">{delta}</span>
    ) : null;

  return (
    <div className={cn(accent ? "card-glow" : "card", "p-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
          {icon}
          {label}
        </div>
        {deltaNode}
      </div>
      <div className="mt-4 font-display text-[28px] font-medium tracking-tight-2 text-ink-100 tabular-nums leading-tight">
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[11.5px] text-ink-400">{hint}</div>}
    </div>
  );
}
