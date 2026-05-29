"use client";

import {
  Area,
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
import { bandFor } from "@/lib/sentiment";
import type { PricedSentimentPoint } from "@/lib/sentiment";

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

// Each daily Fear & Greed point is drawn as a dot coloured by its band
// (red = fear → green = greed), so the colour itself carries the reading.
function renderDot(props: { cx?: number; cy?: number; index?: number; payload?: { value: number } }) {
  const { cx, cy, payload, index } = props;
  if (cx == null || cy == null || !payload) return <g key={index} />;
  return <circle key={index} cx={cx} cy={cy} r={1.9} fill={fngColour(payload.value)} stroke="none" />;
}

export function PriceSentimentChart({
  data,
  height = 360,
}: {
  data: PricedSentimentPoint[];
  height?: number;
}) {
  return (
    <div className="fade-up" style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 8, left: 6 }}>
          <defs>
            <linearGradient id="fng-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9aa6b4" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#9aa6b4" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
          {/* Extremes, standard palette: fear (<25) red, greed (>75) green */}
          <ReferenceArea yAxisId="fng" y1={0} y2={25} fill="#ff5d5d" fillOpacity={0.05} />
          <ReferenceArea yAxisId="fng" y1={75} y2={100} fill="#16c784" fillOpacity={0.05} />
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
            minTickGap={56}
          />
          {/* BTC price — right axis, log scale */}
          <YAxis
            yAxisId="price"
            orientation="right"
            scale="log"
            domain={["auto", "auto"]}
            tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
            stroke="#384353"
            tick={{ fill: "#c79a3a", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          {/* Fear & Greed — left axis 0..100 */}
          <YAxis
            yAxisId="fng"
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            stroke="#384353"
            tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{ outline: "none" }}
            cursor={{ stroke: "rgba(255,255,255,0.14)", strokeWidth: 1 }}
            labelFormatter={(v) => format(new Date(v as number), "MMM d, yyyy")}
            formatter={(value: number, name) =>
              name === "price"
                ? [`$${Math.round(value as number).toLocaleString()}`, "BTC price"]
                : [`${(value as number).toFixed(0)} / 100`, "Fear & Greed"]
            }
          />
          <Area
            yAxisId="fng"
            type="monotone"
            dataKey="value"
            name="value"
            stroke="#6b7787"
            strokeWidth={0.8}
            strokeOpacity={0.45}
            fill="url(#fng-area)"
            dot={renderDot}
            activeDot={{ r: 4, stroke: "#0a0e14", strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
          <Line
            yAxisId="price"
            type="monotone"
            dataKey="price"
            name="price"
            stroke="#f5b942"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
            animationDuration={900}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-5 mt-4 text-[11px] flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-[2px] rounded-sm" style={{ background: "#f5b942" }} />
          <span className="text-ink-100 font-medium">BTC price (log)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-[3px] rounded-sm"
            style={{ background: "linear-gradient(90deg,#ff5d5d,#f5b942,#16c784)" }}
          />
          <span className="text-ink-350">Fear &amp; Greed (red = fear → green = greed)</span>
        </div>
      </div>
    </div>
  );
}
