"use client";

import {
  Bar,
  Cell,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import type { EtfFlowPoint } from "@/lib/data/types";
import { fmtUsd } from "@/lib/format";

// Daily net flow as coloured bars (green inflow / red outflow) with the
// cumulative total as a line on the right axis.
export function EtfFlowChart({ points, height = 360 }: { points: EtfFlowPoint[]; height?: number }) {
  const data = points.map((p) => ({ ts: new Date(p.date).getTime(), netFlow: p.netFlow, cumulative: p.cumulative }));

  return (
    <div className="fade-up" style={{ width: "100%" }}>
      <div style={{ width: "100%", height }}>
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
            yAxisId="flow"
            tickFormatter={(v) => fmtUsd(v, { compact: true })}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <YAxis
            yAxisId="cum"
            orientation="right"
            tickFormatter={(v) => fmtUsd(v, { compact: true })}
            stroke="#384353"
            tick={{ fill: "#c79a3a", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={{ outline: "none" }}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            labelFormatter={(v) => format(new Date(v as number), "MMM d, yyyy")}
            formatter={(value: number, name) => [
              fmtUsd(value as number, { compact: true }),
              name === "cumulative" ? "Cumulative" : "Net flow",
            ]}
          />
          <Bar yAxisId="flow" dataKey="netFlow" name="netFlow" radius={[1, 1, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.netFlow >= 0 ? "#16c784" : "#ff5d5d"} />
            ))}
          </Bar>
          <Line
            yAxisId="cum"
            type="monotone"
            dataKey="cumulative"
            name="cumulative"
            stroke="#f5b942"
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={700}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-5 mt-4 text-[11px] text-ink-350 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-green" /> Inflow day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-red" /> Outflow day
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[2px] rounded-sm" style={{ background: "#f5b942" }} /> Cumulative
        </span>
      </div>
    </div>
  );
}
