import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MetricGauge } from "./MetricGauge";
import { cn } from "@/lib/cn";
import type { MetricDef } from "@/lib/metrics";
import { zoneFor } from "@/lib/metrics";
import { TODAY } from "@/lib/btcData";
import { fmtUsd } from "@/lib/format";

const ZONE_TONE: Record<string, string> = {
  bottom: "text-signal-blue border-signal-blue/30 bg-signal-blue/10",
  accumulation: "text-signal-green border-signal-green/25 bg-signal-green/10",
  neutral: "text-ink-300 border-white/10 bg-white/[0.03]",
  bullish: "text-signal-green border-signal-green/25 bg-signal-green/10",
  euphoria: "text-signal-amber border-signal-amber/30 bg-signal-amber/10",
  top: "text-signal-red border-signal-red/30 bg-signal-red/10",
};

export function MetricCard({ metric }: { metric: MetricDef }) {
  const value = metric.pick(TODAY);
  const { zone, label } = zoneFor(metric, value);
  const display =
    metric.unit === "$" ? fmtUsd(value, { compact: true }) : value.toFixed(metric.decimals);

  return (
    <Link
      href={`/metrics/${metric.slug}`}
      className="card p-6 block group hover:border-accent/25 transition-colors duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-ink-400">
            {metric.group}
          </div>
          <h3 className="mt-1.5 font-display text-[18px] font-medium tracking-tight-2 text-ink-100 group-hover:text-accent transition-colors duration-200">
            {metric.name}
          </h3>
        </div>
        <span
          className={cn(
            "px-2 py-0.5 rounded-full border text-[10px] font-medium tracking-wide whitespace-nowrap",
            ZONE_TONE[zone],
          )}
        >
          {label}
        </span>
      </div>
      <div className="mt-5 flex items-baseline gap-2">
        <div className="font-display font-medium text-[30px] tracking-tight-2 text-ink-100 tabular-nums leading-none">
          {display}
        </div>
        <div className="text-[11px] text-ink-400">{metric.unit === "$" ? "" : metric.unit}</div>
      </div>
      {metric.bands.length > 0 && (
        <div className="mt-5">
          <MetricGauge metric={metric} value={value} />
        </div>
      )}
      <div className="mt-5 pt-3.5 border-t border-white/[0.04] flex items-center justify-between text-[11px]">
        <span className="text-ink-400">
          Paid at <span className="text-ink-200">{metric.paidAt}</span>
        </span>
        <span className="inline-flex items-center gap-0.5 text-accent group-hover:gap-1.5 transition-all duration-200">
          View <ArrowUpRight size={11} />
        </span>
      </div>
    </Link>
  );
}
