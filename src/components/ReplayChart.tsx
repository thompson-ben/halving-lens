"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { CYCLES } from "@/lib/btcData";

// Replay overlay: all cycles' price as a multiple of their halving price (log),
// with a playhead at the scrub day and a dot marking where each cycle sat.
// No animation so scrubbing stays smooth.
export function ReplayChart({ day, height = 300 }: { day: number; height?: number }) {
  const cyclesData = CYCLES.map((c) => {
    const halvingPrice = c.samples[0].price;
    return {
      ...c,
      lastDay: c.samples[c.samples.length - 1].day,
      points: c.samples.map((s) => ({ day: s.day, mult: s.price / halvingPrice })),
    };
  });

  const allDays = Array.from(new Set(cyclesData.flatMap((c) => c.points.map((p) => p.day)))).sort(
    (a, b) => a - b,
  );
  const merged = allDays.map((d) => {
    const row: Record<string, number> = { day: d };
    for (const c of cyclesData) {
      const pt = c.points.find((p) => p.day === d);
      if (pt) row[`y${c.id}`] = pt.mult;
    }
    return row;
  });

  // y-value of each cycle at the scrub day (nearest sample), for the markers.
  const markers = cyclesData
    .filter((c) => day <= c.lastDay + 3)
    .map((c) => {
      const nearest = c.points.reduce((best, p) =>
        Math.abs(p.day - day) < Math.abs(best.day - day) ? p : best,
      );
      return { id: c.id, color: c.color, value: nearest.mult };
    });

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={merged} margin={{ top: 14, right: 18, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
          <XAxis
            dataKey="day"
            type="number"
            domain={[0, 1458]}
            ticks={[0, 365, 730, 1095, 1458]}
            tickFormatter={(v) => (v === 0 ? "Halving" : `${v}d`)}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            scale="log"
            domain={["auto", "auto"]}
            tickFormatter={(v) => (v >= 10 ? `${v.toFixed(0)}×` : `${v.toFixed(1)}×`)}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <ReferenceLine
            x={day}
            stroke="#5eead4"
            strokeWidth={1.5}
            strokeOpacity={0.8}
            label={{
              value: `Day ${day}`,
              position: "insideTopRight",
              fill: "#5eead4",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
            }}
          />
          {CYCLES.map((c) => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={`y${c.id}`}
              stroke={c.color}
              strokeWidth={c.id === 5 ? 2.4 : 1.4}
              strokeOpacity={c.id === 5 ? 1 : 0.55}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          ))}
          {markers.map((m) => (
            <ReferenceDot
              key={m.id}
              x={day}
              y={m.value}
              r={m.id === 5 ? 5 : 3.5}
              fill={m.color}
              stroke="#0a0e14"
              strokeWidth={1.5}
              isFront
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
