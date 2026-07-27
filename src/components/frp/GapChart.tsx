"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

// Gap chart (Phase C) — the % distance from the market price to each
// reference, week by week. Answers "are the gaps widening or narrowing"
// far more honestly than percentile framing. House series colours; the
// estimated gap keeps its dotted violet identity. Data is prepared
// server-side and passed in (the weekly table never ships to the client).

export interface GapPoint {
  ts: number;
  trend?: number;
  holders?: number;
  miners?: number;
}

const SERIES = [
  { key: "trend" as const, name: "vs 200-day average", color: "#8893a4", dash: "5 4" },
  { key: "holders" as const, name: "vs Realised Price", color: "#f5b942", dash: undefined },
  { key: "miners" as const, name: "vs Est. Mining Cost", color: "#a78bfa", dash: "2 3" },
];

export function GapChart({ data }: { data: GapPoint[] }) {
  if (data.length < 2) return null;
  return (
    <div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 8, left: 6 }}>
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
              tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}%`}
              stroke="#384353"
              tick={{ fill: "#9aa6b4", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
            <Tooltip
              contentStyle={{ outline: "none" }}
              cursor={{ stroke: "rgba(255,255,255,0.14)", strokeWidth: 1 }}
              labelFormatter={(v) => format(new Date(v as number), "MMM d, yyyy")}
              formatter={(value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={1.25}
                strokeDasharray={s.dash}
                strokeOpacity={0.85}
                dot={false}
                connectNulls={false}
                isAnimationActive
                animationDuration={700}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-x-5 gap-y-1.5 flex-wrap">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
            <svg width="18" height="6" aria-hidden>
              <line x1="0" y1="3" x2="18" y2="3" stroke={s.color} strokeWidth="1.5" strokeDasharray={s.dash} />
            </svg>
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
