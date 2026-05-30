"use client";

import { useEffect, useState } from "react";
import { Pickaxe } from "lucide-react";
import { halvingStats } from "@/lib/halvingStats";
import { cn } from "@/lib/cn";

// Compact, persistent halving countdown for the top bar. Shows days + a ticking
// HH:MM:SS to an estimated target (the halving lands on a block, not a clock).
export function HalvingCountdownMini({ className }: { className?: string }) {
  const stats = halvingStats();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = Math.max(0, now != null ? stats.estimatedTargetMs - now : stats.daysToHalving * 86_400_000);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={`Estimated time to the next halving (~block 1,050,000). ${stats.blocksToHalving.toLocaleString()} blocks remaining.`}
    >
      <Pickaxe size={12} className="text-accent" strokeWidth={1.8} />
      <span className="font-mono text-[11.5px] text-ink-200 tabular-nums">
        {d}d{" "}
        <span className="text-ink-100">
          {pad(h)}:{pad(m)}:{pad(s)}
        </span>
      </span>
    </span>
  );
}
