"use client";

import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import {
  PRODUCTION_RANGES,
  productionChartSeries,
  type ProductionRangeKey,
} from "@/lib/productionCost";
import { fmtUsd } from "@/lib/format";
import { SegmentedControl } from "./SegmentedControl";

// Market Price vs Cost of Production. Two immediately distinguishable series:
// the price line in the site accent, the modelled cost as a gold line inside
// its translucent electricity-price band ($0.04–$0.08/kWh around the $0.06
// central estimate). Follows the metric-page range convention.

const PRICE_COLOR = "#5eead4";
const COST_COLOR = "#f5b942";

export function ProductionCostChart({ height = 360 }: { height?: number }) {
  const [range, setRange] = useState<ProductionRangeKey>("1Y");
  const data = useMemo(() => productionChartSeries(range), [range]);
  const log = range === "All";
  const longSpan = range === "All" || range === "1Y";
  if (data.length < 2) return null;
  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <SegmentedControl
          aria-label="Range"
          options={PRODUCTION_RANGES.map((r) => ({ key: r.key, label: r.key }))}
          value={range}
          onChange={setRange}
        />
      </div>
      <div className="fade-up" style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 10, bottom: 8, left: 6 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => format(new Date(v), longSpan ? "MMM ''yy" : "MMM d")}
              stroke="#384353"
              tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
            />
            <YAxis
              scale={log ? "log" : "linear"}
              domain={["auto", "auto"]}
              tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`)}
              stroke="#384353"
              tick={{ fill: "#9aa6b4", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              width={52}
            />
            <Tooltip
              contentStyle={{ outline: "none" }}
              cursor={{ stroke: "rgba(255,255,255,0.14)", strokeWidth: 1 }}
              labelFormatter={(v) => format(new Date(v as number), "MMM d, yyyy")}
              formatter={(value: number, name: string) => [
                fmtUsd(value as number, { compact: true }),
                name,
              ]}
            />
            {/* Electricity-price band around the central estimate */}
            <Area
              type="monotone"
              dataKey="costHigh"
              name="Cost of Production (high, $0.08/kWh)"
              stroke="none"
              fill={COST_COLOR}
              fillOpacity={0.07}
              dot={false}
              isAnimationActive
              animationDuration={700}
            />
            <Area
              type="monotone"
              dataKey="costLow"
              name="Cost of Production (low, $0.04/kWh)"
              stroke="none"
              fill="#05070a"
              fillOpacity={1}
              dot={false}
              isAnimationActive
              animationDuration={700}
            />
            <Line
              type="monotone"
              dataKey="cost"
              name="Cost of Production (estimate)"
              stroke={COST_COLOR}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive
              animationDuration={700}
            />
            <Line
              type="monotone"
              dataKey="price"
              name="Market Price"
              stroke={PRICE_COLOR}
              strokeWidth={2}
              dot={false}
              isAnimationActive
              animationDuration={700}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex items-center gap-x-5 gap-y-2 flex-wrap text-[10.5px] uppercase tracking-[0.1em] text-ink-400">
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="10" aria-hidden="true"><line x1="0" y1="5" x2="18" y2="5" stroke={PRICE_COLOR} strokeWidth="2" /></svg>
          Market Price
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="18" height="10" aria-hidden="true">
            <rect x="0" y="2" width="18" height="6" fill={COST_COLOR} opacity="0.15" />
            <line x1="0" y1="5" x2="18" y2="5" stroke={COST_COLOR} strokeWidth="1.5" />
          </svg>
          Cost of Production (modelled, $0.04–$0.08/kWh band)
        </span>
      </div>
    </div>
  );
}
