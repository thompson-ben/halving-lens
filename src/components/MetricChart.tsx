"use client";

import { useMemo, useState } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CURRENT_CYCLE } from "@/lib/btcData";
import { metricBySlug } from "@/lib/metrics";
import { SegmentedControl } from "./SegmentedControl";

const ZONE_FILLS: Record<string, string> = {
  bottom: "rgba(90,169,255,0.08)",
  accumulation: "rgba(61,220,151,0.08)",
  neutral: "transparent",
  bullish: "rgba(61,220,151,0.06)",
  euphoria: "rgba(245,185,66,0.10)",
  top: "rgba(255,93,93,0.10)",
};

// Weekly samples, so the shortest sensible window is ~1M (≈4 points).
const RANGES = [
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "6M", label: "6M", days: 180 },
  { key: "1Y", label: "1Y", days: 365 },
  { key: "All", label: "All", days: Infinity },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

export function MetricChart({
  metricSlug,
  height = 340,
  title,
  subtitle,
}: {
  metricSlug: string;
  height?: number;
  title?: string;
  subtitle?: string;
}) {
  const [range, setRange] = useState<RangeKey>("All");
  const metric = metricBySlug(metricSlug);

  const all = useMemo(
    () =>
      metric
        ? CURRENT_CYCLE.samples.map((s) => ({ day: s.day, value: metric.pick(s), price: s.price }))
        : [],
    [metric],
  );

  const data = useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range)!;
    if (!Number.isFinite(cfg.days) || !all.length) return all;
    const cutoff = all[all.length - 1].day - cfg.days;
    return all.filter((d) => d.day >= cutoff);
  }, [all, range]);

  if (!metric) return null;
  const finite = (n: number) => Number.isFinite(n);

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
        {(title || subtitle) && (
          <div>
            {title && (
              <h2 className="font-display text-[18px] font-medium tracking-tight-2 text-ink-100">
                {title}
              </h2>
            )}
            {subtitle && <div className="text-[11.5px] text-ink-400 mt-1">{subtitle}</div>}
          </div>
        )}
        <SegmentedControl
          aria-label="Chart time range"
          options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
          value={range}
          onChange={setRange}
          className="ml-auto"
        />
      </div>

      <div className="fade-up" style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 4 }}>
            <defs>
              <linearGradient id={`mg-${metric.slug}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5eead4" stopOpacity={0.42} />
                <stop offset="60%" stopColor="#5eead4" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#5eead4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`mg-line-${metric.slug}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#5eead4" />
                <stop offset="100%" stopColor="#99f6e4" />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="day"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => (v === 0 ? "Halving" : `${v}d`)}
              stroke="#384353"
              tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[metric.yMin ?? "auto", metric.yMax ?? "auto"]}
              tickFormatter={(v) => v.toFixed(metric.decimals)}
              stroke="#384353"
              tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              width={54}
            />
            <Tooltip
              cursor={{ stroke: "rgba(94,234,212,0.18)", strokeWidth: 1 }}
              labelFormatter={(v) => `Day ${v} from halving`}
              formatter={(value: number) => [value.toFixed(metric.decimals), metric.short]}
              contentStyle={{ outline: "none" }}
            />
            {metric.bands.map((b) => {
              const y1 = finite(b.min) ? b.min : (metric.yMin ?? -1000);
              const y2 = finite(b.max) ? b.max : (metric.yMax ?? 1000);
              return (
                <ReferenceArea
                  key={`${b.min}-${b.max}`}
                  y1={y1}
                  y2={y2}
                  fill={ZONE_FILLS[b.zone]}
                  stroke="none"
                  ifOverflow="extendDomain"
                />
              );
            })}
            {metric.bands
              .map((b) => b.max)
              .filter((v) => finite(v))
              .map((v) => (
                <ReferenceLine key={v} y={v} stroke="rgba(255,255,255,0.04)" strokeDasharray="2 4" />
              ))}
            <Area
              type="monotone"
              dataKey="value"
              stroke={`url(#mg-line-${metric.slug})`}
              strokeWidth={2.2}
              fill={`url(#mg-${metric.slug})`}
              dot={false}
              isAnimationActive={true}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
