"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { PRICE_RANGES, priceSeries, type PriceRangeKey } from "@/lib/btcPrice";
import { fmtUsd } from "@/lib/format";
import { SegmentedControl } from "./SegmentedControl";

export function BtcPriceChart({ height = 380 }: { height?: number }) {
  const [range, setRange] = useState<PriceRangeKey>("1Y");
  const data = useMemo(() => priceSeries(range), [range]);

  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const up = last >= first;
  const stroke = up ? "#16c784" : "#ff5d5d";
  const changePct = first > 0 ? (last / first - 1) * 100 : 0;
  const log = range === "All";
  const longSpan = range === "All" || range === "1Y";

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[12px] text-ink-400">
          <span className={up ? "text-signal-green" : "text-signal-red"}>
            {up ? "▲" : "▼"} {changePct >= 0 ? "+" : ""}
            {changePct.toFixed(1)}%
          </span>{" "}
          over {range === "All" ? "all time" : range}
        </div>
        <SegmentedControl
          aria-label="Price range"
          options={PRICE_RANGES.map((r) => ({ key: r.key, label: r.label }))}
          value={range}
          onChange={setRange}
        />
      </div>

      <div className="fade-up" style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 8, left: 6 }}>
            <defs>
              <linearGradient id="btc-price-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.01} />
              </linearGradient>
            </defs>
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
              domain={log ? ["auto", "auto"] : ["auto", "auto"]}
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
              formatter={(value: number) => [fmtUsd(value as number), "BTC price"]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={stroke}
              strokeWidth={2}
              fill="url(#btc-price-fill)"
              dot={false}
              isAnimationActive
              animationDuration={700}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
