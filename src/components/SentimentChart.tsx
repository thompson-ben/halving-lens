"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { SentimentPoint } from "@/lib/data/types";

export function SentimentChart({ points, height = 280 }: { points: SentimentPoint[]; height?: number }) {
  const data = points.map((p) => ({ ts: p.ts, value: p.value }));

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 8, left: 4 }}>
          <defs>
            <linearGradient id="fng-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5eead4" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#5eead4" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
          {/* Band boundaries */}
          {[25, 45, 55, 75].map((y) => (
            <ReferenceLine key={y} y={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="2 4" />
          ))}
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => format(new Date(v), "MMM ''yy")}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={48}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Tooltip
            contentStyle={{ outline: "none" }}
            cursor={{ stroke: "rgba(94,234,212,0.18)", strokeWidth: 1 }}
            labelFormatter={(v) => format(new Date(v as number), "MMM d, yyyy")}
            formatter={(value: number) => [`${(value as number).toFixed(0)} / 100`, "Fear & Greed"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#5eead4"
            strokeWidth={2}
            fill="url(#fng-fill)"
            dot={false}
            isAnimationActive
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
