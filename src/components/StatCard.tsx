import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "negative" | "accent";
}) {
  const toneClass =
    tone === "positive"
      ? "text-signal-green"
      : tone === "negative"
        ? "text-signal-red"
        : tone === "accent"
          ? "text-accent"
          : "text-ink-100";

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="section-title">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-ink-400" />}
      </div>
      <div className={cn("text-3xl font-semibold", toneClass)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-400">{hint}</div>}
    </div>
  );
}
