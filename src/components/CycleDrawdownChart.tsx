"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TODAY_DAY_IN_CYCLE } from "@/lib/btcData";
import { drawdownSeriesByCycle } from "@/lib/drawdowns";

// "Underwater" chart: how far below its own running peak each cycle traded at
// every day after the halving. 0% = at the cycle high; deeper = bigger
// drawdown. Lets you see whether today's correction is normal versus how prior
// cycles drew down at the same point. Real price only — historical context.
export function CycleDrawdownChart({ height = 380, showLegend = true }: { height?: number; showLegend?: boolean }) {
  const series = drawdownSeriesByCycle();

  const allDays = Array.from(new Set(series.flatMap((c) => c.points.map((p) => p.day)))).sort(
    (a, b) => a - b,
  );
  const merged = allDays.map((day) => {
    const row: Record<string, number> = { day };
    for (const c of series) {
      const pt = c.points.find((p) => p.day === day);
      if (pt) row[`y${c.id}`] = pt.drawdown;
    }
    return row;
  });

  const yFormatter = (v: number) => `${Math.round(v)}%`;

  return (
    <div className="fade-up">
      <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={merged} margin={{ top: 14, right: 20, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
          <XAxis
            dataKey="day"
            type="number"
            domain={[0, 1458]}
            ticks={[0, 200, 400, 600, 800, 1000, 1200, 1458]}
            tickFormatter={(v) => (v === 0 ? "Halving" : `${v}d`)}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[(min: number) => Math.floor(Math.min(min, -10) / 10) * 10, 0]}
            tickFormatter={yFormatter}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={48}
          />
          <Tooltip
            contentStyle={{ outline: "none" }}
            cursor={{ stroke: "rgba(94,234,212,0.18)", strokeWidth: 1 }}
            labelFormatter={(v) => `Day ${v} from halving`}
            formatter={(value: number, name) => [`${Math.round(value as number)}%`, name]}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
          <ReferenceLine
            x={TODAY_DAY_IN_CYCLE}
            stroke="#5eead4"
            strokeDasharray="2 4"
            strokeOpacity={0.6}
            label={{
              value: "Today",
              position: "insideTopRight",
              fill: "#5eead4",
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.12em",
            }}
          />
          {series.map((c) => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={`y${c.id}`}
              stroke={c.color}
              strokeWidth={c.isCurrent ? 2.6 : 1.4}
              strokeOpacity={c.isCurrent ? 1 : 0.6}
              dot={false}
              connectNulls
              name={c.short}
              isAnimationActive={true}
              animationDuration={900}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      </div>
      {showLegend && (
        <div className="flex items-center gap-5 mt-4 text-[11px] flex-wrap">
          {series.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-[2px] rounded-sm"
                style={{ background: c.color, opacity: c.isCurrent ? 1 : 0.7 }}
              />
              <span className={c.isCurrent ? "text-ink-100 font-medium" : "text-ink-350"}>
                {c.label}
                {c.isCurrent && <span className="text-accent ml-1.5">current</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
