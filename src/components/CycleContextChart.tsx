"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cycleContext } from "@/lib/cycleZones";
import { fmtUsd } from "@/lib/format";

// The signature "Where are we in the cycle?" chart: the current cycle's price
// on a days-since-halving axis, over historical phase zones (derived from where
// prior cycles expanded and topped), the historical low window, and a
// prominent YOU ARE HERE marker. Historical context, not a forecast.
export function CycleContextChart({ height = 420, compact = false }: { height?: number; compact?: boolean }) {
  const ctx = cycleContext();
  const data = ctx.priceByDay;
  const last = data[data.length - 1];

  const yFmt = (v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`);

  return (
    <div className="fade-up">
      <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 26, right: 16, bottom: 8, left: 6 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />

          {/* Historical phase zones (background) */}
          {ctx.zones.map((z) => (
            <ReferenceArea
              key={z.key}
              x1={z.startDay}
              x2={z.endDay}
              fill={z.color}
              fillOpacity={0.13}
              stroke="none"
              ifOverflow="extendDomain"
            />
          ))}
          {/* Historical bear-market low window */}
          <ReferenceArea
            x1={ctx.lowWindow.startDay}
            x2={ctx.lowWindow.endDay}
            fill="#5aa9ff"
            fillOpacity={0.1}
            stroke="#5aa9ff"
            strokeOpacity={0.25}
            strokeDasharray="3 4"
            ifOverflow="extendDomain"
          />

          <XAxis
            dataKey="day"
            type="number"
            domain={[0, ctx.axisMax]}
            ticks={[0, 200, 400, 600, 800, 1000, 1200, ctx.axisMax]}
            tickFormatter={(v) => (v === 0 ? "Halving" : `${v}d`)}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            scale="log"
            domain={["auto", "auto"]}
            tickFormatter={yFmt}
            stroke="#384353"
            tick={{ fill: "#9aa6b4", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{ outline: "none" }}
            cursor={{ stroke: "rgba(94,234,212,0.18)", strokeWidth: 1 }}
            labelFormatter={(v) => `Day ${v} from halving`}
            formatter={(value: number) => [fmtUsd(value as number), "BTC price"]}
          />

          {/* YOU ARE HERE */}
          <ReferenceLine
            x={ctx.todayDay}
            stroke="#5eead4"
            strokeWidth={1.5}
            strokeDasharray="2 4"
            label={{
              value: "YOU ARE HERE",
              position: "top",
              fill: "#5eead4",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.14em",
            }}
          />

          <Line
            type="monotone"
            dataKey="price"
            stroke="#5eead4"
            strokeWidth={2.6}
            dot={false}
            isAnimationActive
            animationDuration={800}
          />
          {last && (
            <ReferenceDot
              x={last.day}
              y={last.price}
              r={6}
              fill="#5eead4"
              stroke="#0a0e14"
              strokeWidth={2}
              ifOverflow="extendDomain"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      </div>

      {/* Zone legend */}
      <div className="flex items-center gap-x-4 gap-y-2 mt-4 text-[11px] flex-wrap">
        {ctx.zones.map((z) => (
          <div key={z.key} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-[3px]" style={{ background: z.color, opacity: 0.55 }} />
            <span className="text-ink-350">{z.label}</span>
          </div>
        ))}
        {!compact && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-[3px] border border-[#5aa9ff]/40" style={{ background: "rgba(90,169,255,0.18)" }} />
            <span className="text-ink-350">
              Low window · day {ctx.lowWindow.startDay}–{ctx.lowWindow.endDay}
            </span>
          </div>
        )}
      </div>
      {!compact && (
        <p className="mt-2.5 text-[11px] text-ink-500 leading-relaxed">
          Phase zones derived from where the three prior cycles expanded and topped (peak window: day{" "}
          {ctx.peakWindow.startDay}–{ctx.peakWindow.endDay}). Days since the April 2024 halving · log
          price · historical context, not a forecast.
        </p>
      )}
    </div>
  );
}
