"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ConfigurationPath } from "@/lib/fourReferencePrices";

// What happened after (Phase C) — the actual price paths that followed each
// prior week sharing today's configuration, indexed to 100 at the matching
// week. Spaghetti of real histories, never an average presented as an
// expectation. The most recent match is highlighted; the rest stay muted.

export function WhatHappenedAfter({ paths }: { paths: ConfigurationPath[] }) {
  if (!paths.length) return null;
  const maxLen = Math.max(...paths.map((p) => p.path.length));
  const latest = paths[paths.length - 1].startDate;
  const data = Array.from({ length: maxLen }, (_, week) => {
    const row: Record<string, number> = { week };
    for (const p of paths) if (week < p.path.length) row[p.startDate] = Number(p.path[week].toFixed(2));
    return row;
  });
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 8, left: 6 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
          <XAxis
            dataKey="week"
            tickFormatter={(v) => `+${v}w`}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={32}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v}`}
            stroke="#384353"
            tick={{ fill: "#9aa6b4", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <ReferenceLine y={100} stroke="rgba(255,255,255,0.22)" strokeWidth={1} />
          <Tooltip
            contentStyle={{ outline: "none" }}
            cursor={{ stroke: "rgba(255,255,255,0.14)", strokeWidth: 1 }}
            labelFormatter={(v) => `${v} weeks after the matching week (indexed, match = 100)`}
            formatter={(value: number, name: string) => [`${value}`, name]}
          />
          {paths.map((p) => (
            <Line
              key={p.startDate}
              type="monotone"
              dataKey={p.startDate}
              name={p.startDate}
              stroke={p.startDate === latest ? "#f5b942" : "#8893a4"}
              strokeWidth={p.startDate === latest ? 1.75 : 1}
              strokeOpacity={p.startDate === latest ? 0.95 : 0.35}
              dot={false}
              isAnimationActive
              animationDuration={700}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
