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
  metricSlug?: string; // when mode === "metric"
  mode: Mode;
  height?: number;
  showLegend?: boolean;
  highlightCurrent?: boolean;
}

export function CycleOverlayChart({ metricSlug, mode, height = 360, showLegend = true, highlightCurrent = true }: Props) {
  const metric = metricSlug ? metricBySlug(metricSlug) : undefined;
  // Build a unified series: for each cycle, project samples into a single
  // x-axis (day in cycle) and y-axis (price normalized to halving = 100, OR
  // metric value).
  const cyclesData = CYCLES.map((c) => {
    const halvingPrice = c.samples[0].price;
    return {
      ...c,
      points: c.samples.map((s) => {
        let y: number;
        if (mode === "price") y = s.price;
        else if (mode === "normalized") y = (s.price / halvingPrice) * 100;
        else y = metric ? metric.pick(s) : 0;
        return { day: s.day, [`y${c.id}`]: y };
      }),
    };
  });

  // Merge per-day rows for Recharts (it wants a single data array).
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
    if (mode === "normalized") return `${v.toFixed(0)}×`;
    if (metric?.unit === "%") return `${v.toFixed(0)}%`;
    if (metric?.unit === "$") return `$${v.toFixed(0)}`;
    return v.toFixed(metric?.decimals ?? 2);
  };

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={merged} margin={{ top: 10, right: 16, bottom: 8, left: 4 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="day"
            type="number"
            domain={[0, 1458]}
            ticks={[0, 200, 400, 600, 800, 1000, 1200, 1458]}
            tickFormatter={(v) => (v === 0 ? "Halving" : `${v}d`)}
            stroke="#586475"
            tick={{ fill: "#8893a4", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            scale={mode === "price" || mode === "normalized" ? "log" : "linear"}
            domain={mode === "price" || mode === "normalized" ? ["auto", "auto"] : [metric?.yMin ?? "auto", metric?.yMax ?? "auto"]}
            tickFormatter={yFormatter}
            stroke="#586475"
            tick={{ fill: "#8893a4", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            contentStyle={{
              background: "#0e1218",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => `Day ${v} from halving`}
            formatter={(value: number, name) => [yFormatter(value as number), name]}
          />
          {highlightCurrent && (
            <ReferenceLine
              x={TODAY_DAY_IN_CYCLE}
              stroke="#5eead4"
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              label={{
                value: "Today",
                position: "insideTopRight",
                fill: "#5eead4",
                fontSize: 10,
              }}
            />
          )}
          {CYCLES.map((c) => (
            <Line
              key={c.id}
              type="monotone"
              dataKey={`y${c.id}`}
              stroke={c.color}
              strokeWidth={c.id === 5 ? 2.4 : 1.4}
              strokeOpacity={c.id === 5 ? 1 : 0.7}
              dot={false}
              connectNulls
              name={c.short}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="flex items-center gap-4 mt-3 text-[11px] flex-wrap">
          {CYCLES.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-[2px] rounded-sm"
                style={{ background: c.color, opacity: c.id === 5 ? 1 : 0.8 }}
              />
              <span className={c.id === 5 ? "text-ink-100 font-medium" : "text-ink-300"}>
                {c.label} {c.id === 5 && <span className="text-accent">(current)</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
