"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { AdoptionPoint } from "@/lib/onchain";
import { fmtNum, fmtUsd } from "@/lib/format";

// Address base (teal, left, log) over BTC price (gold, right, log) — the
// adoption curve against price.
export function AdoptionChart({ data, height = 340 }: { data: AdoptionPoint[]; height?: number }) {
  return (
    <div className="fade-up" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 8, left: 6 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
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
            yAxisId="addr"
            domain={["auto", "auto"]}
            tickFormatter={(v) => fmtNum(v, { compact: true })}
            stroke="#384353"
            tick={{ fill: "#5eead4", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <YAxis
            yAxisId="price"
            orientation="right"
            scale="log"
            domain={["auto", "auto"]}
            tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`)}
            stroke="#384353"
            tick={{ fill: "#c79a3a", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{ outline: "none" }}
            cursor={{ stroke: "rgba(255,255,255,0.14)", strokeWidth: 1 }}
            labelFormatter={(v) => format(new Date(v as number), "MMM d, yyyy")}
            formatter={(value: number, name) =>
              name === "price"
                ? [fmtUsd(value as number, { compact: true }), "BTC price"]
                : [fmtNum(value as number, { compact: true }), "Addresses"]
            }
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            name="price"
            stroke="#f5b942"
            strokeWidth={1.6}
            strokeOpacity={0.75}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="addr"
            type="monotone"
            dataKey="addr"
            name="addr"
            stroke="#5eead4"
            strokeWidth={2.2}
            dot={false}
            isAnimationActive
            animationDuration={700}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-x-5 mt-4 text-[11px] text-ink-350 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[2px] rounded-sm" style={{ background: "#5eead4" }} /> Addresses (log)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[2px] rounded-sm" style={{ background: "#f5b942" }} /> BTC price (log)
        </span>
      </div>
    </div>
  );
}
