import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MetricGauge } from "./MetricGauge";
import { DataBadge } from "./DataBadge";
import { cn } from "@/lib/cn";
import type { MetricDef } from "@/lib/metrics";
import { zoneFor } from "@/lib/metrics";
import { comingSoonReason, metricStatus } from "@/lib/cycleIntel";
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
  const status = metricStatus(metric.slug);

  if (status === "coming-soon") return <ComingSoonCard metric={metric} />;

  const value = metric.pick(TODAY);
  const { zone, label } = zoneFor(metric, value);
  const display =
    metric.unit === "$" ? fmtUsd(value, { compact: true }) : value.toFixed(metric.decimals);

  return (
    <Link
      href={`/metrics/${metric.slug}`}
      className="card card-interactive p-6 block group hover:border-accent/25"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <DataBadge status={status} size="sm" />
          <h3 className="mt-2 font-display text-[18px] font-medium tracking-tight-2 text-ink-100 group-hover:text-accent transition-colors duration-200">
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
      <div className="mt-5 pt-3.5 border-t border-white/[0.04] flex items-center justify-end text-[11px]">
        <span className="inline-flex items-center gap-0.5 text-accent group-hover:gap-1.5 transition-all duration-200">
          View <ArrowUpRight size={11} />
        </span>
      </div>
    </Link>
  );
}

function ComingSoonCard({ metric }: { metric: MetricDef }) {
  return (
    <div className="card p-6 block opacity-80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <DataBadge status="coming-soon" size="sm" />
          <h3 className="mt-2 font-display text-[18px] font-medium tracking-tight-2 text-ink-300">
            {metric.name}
          </h3>
        </div>
      </div>
      <p className="mt-4 text-[12.5px] text-ink-400 leading-relaxed">{metric.description}</p>
      <div className="mt-5 pt-3.5 border-t border-white/[0.04] text-[11px] text-ink-500 leading-relaxed">
        {comingSoonReason(metric.slug)}
      </div>
    </div>
  );
}
