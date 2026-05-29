"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { bandFor } from "@/lib/sentiment";
import type { PricedSentimentPoint } from "@/lib/sentiment";

const MS_DAY = 86_400_000;

const TONE_HEX: Record<string, string> = {
  red: "#ff5d5d",
  amber: "#f5b942",
  muted: "#8a96a6",
  green: "#16c784",
  teal: "#5eead4",
};

function fngColour(value: number): string {
  return TONE_HEX[bandFor(value).tone];
}

const RANGES = [
  { key: "3M", days: 90 },
  { key: "6M", days: 180 },
  { key: "1Y", days: 365 },
  { key: "2Y", days: 730 },
  { key: "All", days: Infinity },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PricedSentimentPoint }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const band = bandFor(p.value);
  return (
    <div className="rounded-lg border border-white/10 bg-[#0c1118]/95 px-3 py-2 shadow-xl backdrop-blur">
      <div className="text-[10.5px] text-ink-400 font-mono mb-1">
        {format(new Date(p.ts), "MMM d, yyyy")}
      </div>
      <div className="text-[13px] text-ink-50 font-medium tabular-nums">
        ${Math.round(p.price).toLocaleString()}
      </div>
      <div className="mt-0.5 text-[11.5px] font-medium" style={{ color: TONE_HEX[band.tone] }}>
        Fear &amp; Greed {p.value} · {band.label}
      </div>
    </div>
  );
}

export function PriceSentimentChart({
  data,
  height = 380,
}: {
  data: PricedSentimentPoint[];
  height?: number;
}) {
  const [range, setRange] = useState<RangeKey>("All");

  const filtered = useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range)!;
    if (!Number.isFinite(cfg.days) || !data.length) return data;
    const cutoff = data[data.length - 1].ts - cfg.days * MS_DAY;
    return data.filter((d) => d.ts >= cutoff);
  }, [data, range]);

  // Markers shrink as the window widens so dense views read as a coloured
  // ribbon and sparse views read as distinct markers.
  const dotR = filtered.length > 800 ? 1.5 : filtered.length > 300 ? 2 : 2.8;
  const shortSpan = filtered.length <= 200;

  const renderDot = (props: {
    cx?: number;
    cy?: number;
    index?: number;
    payload?: PricedSentimentPoint;
  }) => {
    const { cx, cy, payload, index } = props;
    if (cx == null || cy == null || !payload) return <g key={index} />;
    return (
      <circle key={index} cx={cx} cy={cy} r={dotR} fill={fngColour(payload.value)} stroke="none" />
    );
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <div className="inline-flex rounded-lg border border-white/[0.07] bg-white/[0.02] p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium tracking-wide transition-colors ${
                range === r.key
                  ? "bg-accent/15 text-accent"
                  : "text-ink-400 hover:text-ink-200"
              }`}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      <div className="fade-up" style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <LineChart data={filtered} margin={{ top: 10, right: 8, bottom: 8, left: 6 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => format(new Date(v), shortSpan ? "MMM d" : "MMM ''yy")}
              stroke="#384353"
              tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
            />
            <YAxis
              scale="log"
              domain={["auto", "auto"]}
              tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`)}
              stroke="#384353"
              tick={{ fill: "#9aa6b4", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip content={<TooltipContent />} cursor={{ stroke: "rgba(255,255,255,0.14)", strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="price"
              name="price"
              stroke="#5a6675"
              strokeWidth={1.2}
              strokeOpacity={0.6}
              dot={renderDot}
              activeDot={{ r: 5, stroke: "#0a0e14", strokeWidth: 1.5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-5 mt-4 text-[11px] flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[2px] rounded-sm bg-ink-500" />
          <span className="text-ink-350">BTC price (log)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-2 rounded-full"
            style={{ background: "linear-gradient(90deg,#ff5d5d,#f5b942,#16c784)" }}
          />
          <span className="text-ink-350">Marker colour = Fear &amp; Greed (red fear → green greed)</span>
        </div>
      </div>
    </div>
  );
}
