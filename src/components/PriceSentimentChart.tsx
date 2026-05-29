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
import type { PricedSentimentPoint } from "@/lib/sentiment";

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
              <stop offset="0%" stopColor="#5eead4" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#5eead4" stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
          {/* Fear (<25) and Greed (>75) zones, on the F&G axis */}
          <ReferenceArea yAxisId="fng" y1={0} y2={25} fill="#16c784" fillOpacity={0.045} />
          <ReferenceArea yAxisId="fng" y1={75} y2={100} fill="#ff5d5d" fillOpacity={0.045} />
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
            stroke="#5eead4"
            strokeWidth={1.3}
            strokeOpacity={0.8}
            fill="url(#fng-area)"
            dot={false}
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
          <span className="inline-block w-3 h-[2px] rounded-sm" style={{ background: "#5eead4" }} />
          <span className="text-ink-350">Fear &amp; Greed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-green/30" />
          <span className="text-ink-350">Fear zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal-red/30" />
          <span className="text-ink-350">Greed zone</span>
        </div>
      </div>
    </div>
  );
}
