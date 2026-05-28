"use client";

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

const ZONE_FILLS: Record<string, string> = {
  bottom: "rgba(90,169,255,0.08)",
  accumulation: "rgba(61,220,151,0.08)",
  neutral: "transparent",
  bullish: "rgba(61,220,151,0.06)",
  euphoria: "rgba(245,185,66,0.10)",
  top: "rgba(255,93,93,0.10)",
};

export function MetricChart({
  metricSlug,
  height = 340,
}: {
  metricSlug: string;
  height?: number;
}) {
  const metric = metricBySlug(metricSlug);
  if (!metric) return null;
  const data = CURRENT_CYCLE.samples.map((s) => ({
    day: s.day,
    value: metric.pick(s),
    price: s.price,
  }));
  const finite = (n: number) => Number.isFinite(n);

  return (
    <div className="fade-up" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 4 }}>
          <defs>
            <linearGradient id={`mg-${metric.slug}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5eead4" stopOpacity={0.42} />
              <stop offset="60%" stopColor="#5eead4" stopOpacity={0.10} />
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
            domain={[0, "dataMax"]}
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
              <ReferenceLine
                key={v}
                y={v}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2 4"
              />
            ))}
          <Area
            type="monotone"
            dataKey="value"
            stroke={`url(#mg-line-${metric.slug})`}
            strokeWidth={2.2}
            fill={`url(#mg-${metric.slug})`}
            dot={false}
            isAnimationActive={true}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
