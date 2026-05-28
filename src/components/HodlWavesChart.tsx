"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HODL_BANDS, hodlSeries } from "@/lib/hodlWaves";

export function HodlWavesChart({ height = 460 }: { height?: number }) {
  const series = hodlSeries();
  const data = series.map((p) => ({ day: p.day, ...p.bands }));

  return (
    <div className="fade-up" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 12, right: 18, bottom: 8, left: 4 }}>
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
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(v) => `${v}%`}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip
            cursor={{ stroke: "rgba(94,234,212,0.18)", strokeWidth: 1 }}
            labelFormatter={(v) => `Day ${v} from halving`}
            formatter={(value: number, name: string) => {
              const band = HODL_BANDS.find((b) => b.id === name);
              return [`${value.toFixed(1)}%`, band?.label ?? name];
            }}
            contentStyle={{ outline: "none" }}
            itemSorter={(item) => {
              // Reverse so legend shows oldest-first
              return -HODL_BANDS.findIndex((b) => b.id === item.dataKey);
            }}
          />
          {HODL_BANDS.map((b) => (
            <Area
              key={b.id}
              type="monotone"
              dataKey={b.id}
              stackId="hodl"
              stroke="none"
              fill={b.color}
              fillOpacity={0.95}
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
