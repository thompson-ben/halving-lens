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
  bottom: "rgba(90,169,255,0.10)",
  accumulation: "rgba(61,220,151,0.10)",
  neutral: "transparent",
  bullish: "rgba(61,220,151,0.08)",
  euphoria: "rgba(245,185,66,0.10)",
  top: "rgba(255,93,93,0.10)",
};

export function MetricChart({ metricSlug, height = 340 }: { metricSlug: string; height?: number }) {
  const metric = metricBySlug(metricSlug);
  if (!metric) return null;
  const data = CURRENT_CYCLE.samples.map((s) => ({ day: s.day, value: metric.pick(s), price: s.price }));
  const finite = (n: number) => Number.isFinite(n);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 14, bottom: 8, left: 4 }}>
          <defs>
            <linearGradient id={`mg-${metric.slug}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5eead4" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#5eead4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="day"
            type="number"
            domain={[0, "dataMax"]}
            tickFormatter={(v) => (v === 0 ? "Halving" : `${v}d`)}
            stroke="#586475"
            tick={{ fill: "#8893a4", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[metric.yMin ?? "auto", metric.yMax ?? "auto"]}
            tickFormatter={(v) => v.toFixed(metric.decimals)}
            stroke="#586475"
            tick={{ fill: "#8893a4", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: "#0e1218",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => `Day ${v} from halving`}
            formatter={(value: number) => [value.toFixed(metric.decimals), metric.short]}
          />
          {/* Zone bands */}
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
          {/* Band edge lines (only finite edges) */}
          {metric.bands
            .map((b) => b.max)
            .filter((v) => finite(v))
            .map((v) => (
              <ReferenceLine
                key={v}
                y={v}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 3"
              />
            ))}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#5eead4"
            strokeWidth={2}
            fill={`url(#mg-${metric.slug})`}
            dot={false}
          />
          <Line type="monotone" dataKey="value" stroke="#5eead4" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
