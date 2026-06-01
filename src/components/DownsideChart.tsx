"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { priceSeries, type PriceRangeKey } from "@/lib/btcPrice";
import { downsideScenarios, type DownsideLevel } from "@/lib/downside";
import { fmtUsd } from "@/lib/format";
import { SegmentedControl } from "./SegmentedControl";

// Recent BTC price with the downside scenario levels drawn as horizontal
// reference lines. Log Y axis so the full span — current price down to the
// severe historical-drawdown scenario — is legible at once. Context, not a
// forecast: the lines are where prior history would imply support, not targets.

const RANGES: { key: PriceRangeKey; label: string }[] = [
  { key: "1M", label: "30D" },
  { key: "3M", label: "90D" },
  { key: "1Y", label: "1Y" },
];

// Short labels + colours, aligned with the ladder's tone mapping.
const SHORT: Record<string, string> = {
  "prior-cycle-high": "Prior high",
  "ma-200w": "200W MA",
  trend: "Trend",
  "realized-price": "Realized",
  mild: "Mild bear",
  average: "Avg bear",
  severe: "Severe bear",
};
function colorFor(level: DownsideLevel): string {
  if (level.category === "support") return "#5eead4"; // teal/accent
  if (level.key === "severe") return "#ff5d5d";
  return "#f5b942"; // amber for mild/average
}

// Right-anchored label for a reference line, nudged above or below the line so
// two close levels (e.g. 200W MA and the trend band) don't overlap.
function LineLabel(props: {
  viewBox?: { x: number; y: number; width: number; height: number };
  text: string;
  color: string;
  side: "left" | "right";
  place: "above" | "below";
}) {
  const { viewBox, text, color, side, place } = props;
  if (!viewBox) return null;
  const pad = 6;
  const x = side === "right" ? viewBox.x + viewBox.width - pad : viewBox.x + pad;
  const y = viewBox.y + (place === "above" ? -6 : 14);
  return (
    <text
      x={x}
      y={y}
      textAnchor={side === "right" ? "end" : "start"}
      fill={color}
      fontSize={11}
      fontFamily="var(--font-mono)"
    >
      {text}
    </text>
  );
}

export function DownsideChart({ height = 420 }: { height?: number }) {
  const [range, setRange] = useState<PriceRangeKey>("3M");
  const d = useMemo(() => downsideScenarios(), []);
  const data = useMemo(() => priceSeries(range), [range]);

  if (!d.available || data.length < 2) {
    return (
      <div className="h-[200px] flex items-center justify-center text-[12.5px] text-ink-400">
        Price history isn&apos;t available to chart yet.
      </div>
    );
  }

  const prices = data.map((p) => p.price);
  const levelPrices = d.levels.map((l) => l.price);
  const lo = Math.min(...prices, ...levelPrices) * 0.94;
  const hi = Math.max(...prices, d.currentPrice, ...levelPrices) * 1.04;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[12px] text-ink-400">
          Recent price with historical scenario levels{" "}
          <span className="text-ink-500">· log scale</span>
        </div>
        <SegmentedControl
          aria-label="Chart range"
          options={RANGES}
          value={range}
          onChange={(k) => setRange(k as PriceRangeKey)}
        />
      </div>

      <div className="fade-up relative" style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 8, left: 6 }}>
            <defs>
              <linearGradient id="downside-price-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9aa6b4" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#9aa6b4" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => format(new Date(v), range === "1Y" ? "MMM ''yy" : "MMM d")}
              stroke="#384353"
              tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={48}
            />
            <YAxis
              scale="log"
              domain={[lo, hi]}
              allowDataOverflow
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

            {/* Price area first, so the reference lines + labels sit on top */}
            <Area
              type="monotone"
              dataKey="price"
              stroke="#cfd8e3"
              strokeWidth={2}
              fill="url(#downside-price-fill)"
              dot={false}
              isAnimationActive
              animationDuration={650}
            />

            {/* Scenario levels — labels anchored inside the plot (never clip) and
                nudged below their line when the level just above is within ~6%,
                so close pairs (e.g. 200W MA + trend band) don't overlap. */}
            {d.levels.map((l, i) => {
              const color = colorFor(l);
              const prev = d.levels[i - 1];
              const place = prev && prev.price / l.price - 1 < 0.06 ? "below" : "above";
              return (
                <ReferenceLine
                  key={l.key}
                  y={l.price}
                  stroke={color}
                  strokeOpacity={l.category === "support" ? 0.7 : 0.55}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={
                    <LineLabel
                      text={`${SHORT[l.key] ?? l.label} ${fmtUsd(l.price, { compact: true })}`}
                      color={color}
                      side="right"
                      place={place}
                    />
                  }
                />
              );
            })}

            {/* Current price marker — label on the LEFT so it doesn't collide
                with the prior-cycle-high label (the two levels sit close) */}
            <ReferenceLine
              y={d.currentPrice}
              stroke="#e7edf4"
              strokeOpacity={0.6}
              strokeWidth={1}
              label={
                <LineLabel
                  text={`Now ${fmtUsd(d.currentPrice, { compact: true })}`}
                  color="#e7edf4"
                  side="left"
                  place="above"
                />
              }
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-ink-500">
        <LegendDot color="#5eead4" label="Support levels" />
        <LegendDot color="#f5b942" label="Mild / average drawdown" />
        <LegendDot color="#ff5d5d" label="Severe drawdown" />
        <span>Dashed lines are historical reference levels, not targets.</span>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-3 h-px" style={{ backgroundColor: color, borderTop: `1px dashed ${color}` }} />
      <span>{label}</span>
    </span>
  );
}
