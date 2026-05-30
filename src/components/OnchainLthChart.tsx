"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { LthMarker, LthPoint } from "@/lib/onchain";
import { fmtUsd } from "@/lib/format";

const fmtBtc = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : `${v.toFixed(0)}`);

// Long-term holder supply (teal, left) over BTC price (gold log, right), with
// dashed markers at past cycle highs (red) and lows (green).
export function OnchainLthChart({
  data,
  markers,
  height = 360,
}: {
  data: LthPoint[];
  markers: LthMarker[];
  height?: number;
}) {
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
            yAxisId="lth"
            tickFormatter={(v) => fmtBtc(v)}
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
                : [`${fmtBtc(value as number)} BTC`, "LTH supply"]
            }
          />
          {markers.map((m, i) => (
            <ReferenceLine
              key={i}
              yAxisId="price"
              x={m.ts}
              stroke={m.type === "high" ? "#ff5d5d" : "#16c784"}
              strokeDasharray="2 4"
              strokeOpacity={0.6}
            />
          ))}
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            name="price"
            stroke="#f5b942"
            strokeWidth={1.6}
            strokeOpacity={0.8}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            yAxisId="lth"
            type="monotone"
            dataKey="lth"
            name="lth"
            stroke="#5eead4"
            strokeWidth={2.2}
            dot={false}
            isAnimationActive
            animationDuration={700}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap mt-4 text-[11px] text-ink-350">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[2px] rounded-sm" style={{ background: "#5eead4" }} /> LTH supply
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[2px] rounded-sm" style={{ background: "#f5b942" }} /> BTC price (log)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm border border-signal-red/60" /> Cycle high
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm border border-signal-green/60" /> Cycle low
        </span>
      </div>
    </div>
  );
}
