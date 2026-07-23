"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { healthTag } from "@/lib/marketHealth";

// The Market Health composite score through the days we've published the daily
// brief. Horizontal bands shade the health zones (green = calm/healthy at the
// top, red = overheated at the bottom); the line is the score. Short history by
// design — it only covers the days the brief has run — and labelled as such.

export interface HealthPoint {
  ts: number;
  score: number;
  price: number;
}

// Health zones (y-ranges) — mirror healthColor() thresholds.
const ZONES = [
  { y1: 75, y2: 100, color: "#3ddc97" },
  { y1: 55, y2: 75, color: "#5eead4" },
  { y1: 40, y2: 55, color: "#f5b942" },
  { y1: 25, y2: 40, color: "#f97316" },
  { y1: 0, y2: 25, color: "#ff5d5d" },
];

export function MarketHealthTimelineChart({ data, height = 380 }: { data: HealthPoint[]; height?: number }) {
  if (data.length < 2) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[12.5px] text-ink-400 text-center px-6">
        Not enough tracked history to chart yet — the score is recorded with each daily brief, so this
        timeline fills in day by day.
      </div>
    );
  }

  return (
    <div className="fade-up" style={{ width: "100%" }}>
      <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 16, bottom: 8, left: 6 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
          {ZONES.map((z) => (
            <ReferenceArea
              key={z.y1}
              y1={z.y1}
              y2={z.y2}
              fill={z.color}
              fillOpacity={0.1}
              strokeOpacity={0}
              ifOverflow="extendDomain"
            />
          ))}
          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => format(new Date(v), "d MMM")}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={44}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 40, 55, 75, 100]}
            stroke="#384353"
            tick={{ fill: "#9aa6b4", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={34}
          />
          <Tooltip
            contentStyle={{
              background: "#0c1118",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              outline: "none",
              fontSize: 12,
            }}
            cursor={{ stroke: "rgba(255,255,255,0.14)", strokeWidth: 1 }}
            labelFormatter={(v) => format(new Date(v as number), "d MMM yyyy")}
            formatter={(value: number) => [`${value}/100 · ${healthTag(value)}`, "Health score"]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#e7edf4"
            strokeWidth={2}
            dot={{ r: 2, fill: "#e7edf4" }}
            isAnimationActive
            animationDuration={650}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-ink-500">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#3ddc97", opacity: 0.55 }} /> Calm / healthy</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#f5b942", opacity: 0.55 }} /> Warming</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#ff5d5d", opacity: 0.55 }} /> Overheated</span>
        <span>Higher is cooler / lower-risk. Shaded bands are health zones; the line is the daily composite score.</span>
      </div>
    </div>
  );
}
