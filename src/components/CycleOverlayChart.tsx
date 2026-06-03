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
import { CYCLES, TODAY_DAY_IN_CYCLE } from "@/lib/btcData";
import { metricBySlug } from "@/lib/metrics";

type Mode = "price" | "metric" | "normalized";

interface Props {
  metricSlug?: string;
  mode: Mode;
  height?: number;
  showLegend?: boolean;
  highlightCurrent?: boolean;
}

export function CycleOverlayChart({
  metricSlug,
  mode,
  height = 360,
  showLegend = true,
  highlightCurrent = true,
}: Props) {
  const metric = metricSlug ? metricBySlug(metricSlug) : undefined;

  const cyclesData = CYCLES.map((c) => {
    const halvingPrice = c.samples[0].price;
    return {
      ...c,
      points: c.samples.map((s) => {
        let y: number;
        if (mode === "price") y = s.price;
        else if (mode === "normalized") y = s.price / halvingPrice; // multiple of halving price (1× at day 0)
        else y = metric ? metric.pick(s) : 0;
        return { day: s.day, [`y${c.id}`]: y };
      }),
    };
  });

  const allDays = Array.from(new Set(cyclesData.flatMap((c) => c.points.map((p) => p.day)))).sort(
    (a, b) => a - b,
  );
  const merged = allDays.map((day) => {
    const row: Record<string, number> = { day };
    for (const c of cyclesData) {
      const pt = c.points.find((p) => p.day === day);
      if (pt) row[`y${c.id}`] = pt[`y${c.id}`] as number;
    }
    return row;
  });

  const yFormatter = (v: number) => {
    if (mode === "price") return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`;
    if (mode === "normalized") return v >= 10 ? `${v.toFixed(0)}×` : `${v.toFixed(1)}×`;
    if (metric?.unit === "%") return `${v.toFixed(0)}%`;
    if (metric?.unit === "$") return v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`;
    return v.toFixed(metric?.decimals ?? 2);
  };

  return (
    <div className="fade-up">
      <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={merged} margin={{ top: 14, right: 20, bottom: 8, left: 4 }}>
          <defs>
            {CYCLES.map((c) => (
              <linearGradient key={c.id} id={`stroke-${c.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.color} stopOpacity={0.95} />
                <stop offset="100%" stopColor={c.color} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
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
            scale={mode === "price" || mode === "normalized" ? "log" : "linear"}
            domain={
              mode === "price" || mode === "normalized"
                ? ["auto", "auto"]
                : [metric?.yMin ?? "auto", metric?.yMax ?? "auto"]
            }
            tickFormatter={yFormatter}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={62}
          />
          <Tooltip
            contentStyle={{ outline: "none" }}
            cursor={{ stroke: "rgba(94,234,212,0.18)", strokeWidth: 1 }}
            labelFormatter={(v) => `Day ${v} from halving`}
            formatter={(value: number, name) => [yFormatter(value as number), name]}
          />
          {highlightCurrent && (
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
          )}
          {CYCLES.map((c) => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={`y${c.id}`}
              stroke={`url(#stroke-${c.id})`}
              strokeWidth={c.id === 5 ? 2.4 : 1.4}
              strokeOpacity={c.id === 5 ? 1 : 0.65}
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
          {CYCLES.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-[2px] rounded-sm"
                style={{ background: c.color, opacity: c.id === 5 ? 1 : 0.7 }}
              />
              <span className={c.id === 5 ? "text-ink-100 font-medium" : "text-ink-350"}>
                {c.label}
                {c.id === 5 && <span className="text-accent ml-1.5">current</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
