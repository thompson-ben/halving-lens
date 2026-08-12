"use client";

import { useMemo, useState } from "react";
import {
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
import { ACCUMULATION_BANDS, type AccumulationBandKey } from "@/lib/accumulation";
import { HALVINGS } from "@/lib/data/types";
import { fmtUsd } from "@/lib/format";
import { track } from "@/lib/track";
import { SegmentedControl } from "./SegmentedControl";

// The flagship timeline: the Accumulation Index through history, rendered as
// colour-coded environment bands behind Bitcoin's price (log scale). Lets users
// see at a glance that deep-value (cyan/green) clusters near cycle lows and
// overheated (red) near the tops. Historical context, not a forecast.

export interface TimelinePoint {
  ts: number;
  price: number;
  score: number;
  bandKey: AccumulationBandKey;
}

const COLOR: Record<AccumulationBandKey, string> = Object.fromEntries(
  ACCUMULATION_BANDS.map((b) => [b.key, b.color]),
) as Record<AccumulationBandKey, string>;

const LABEL: Record<AccumulationBandKey, string> = Object.fromEntries(
  ACCUMULATION_BANDS.map((b) => [b.key, b.label]),
) as Record<AccumulationBandKey, string>;

const RANGES = [
  { key: "all", label: "All" },
  { key: "c4", label: "2020→" },
  { key: "c5", label: "2024→" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

const RANGE_FROM: Record<RangeKey, number> = {
  all: 0,
  c4: Date.parse(HALVINGS[4]),
  c5: Date.parse(HALVINGS[5]),
};

// Run-length encode consecutive same-band points into shaded segments, so we
// draw ~tens of ReferenceAreas rather than one per week.
function segments(points: TimelinePoint[]) {
  const segs: { x1: number; x2: number; key: AccumulationBandKey }[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = segs[segs.length - 1];
    const mid = i < points.length - 1 ? (p.ts + points[i + 1].ts) / 2 : p.ts;
    if (prev && prev.key === p.bandKey) {
      prev.x2 = mid;
    } else {
      if (prev) prev.x2 = i > 0 ? (points[i - 1].ts + p.ts) / 2 : p.ts;
      segs.push({ x1: i > 0 ? (points[i - 1].ts + p.ts) / 2 : p.ts, x2: mid, key: p.bandKey });
    }
  }
  return segs;
}

export function AccumulationTimelineChart({
  data,
  height = 460,
}: {
  data: TimelinePoint[];
  height?: number;
}) {
  const [range, setRange] = useState<RangeKey>("all");

  const points = useMemo(() => {
    const from = RANGE_FROM[range];
    return data.filter((p) => p.ts >= from);
  }, [data, range]);

  const segs = useMemo(() => segments(points), [points]);

  if (points.length < 2) {
    return (
      <div className="h-[220px] flex items-center justify-center text-[12.5px] text-ink-400">
        Price history isn&apos;t available to chart yet.
      </div>
    );
  }

  const prices = points.map((p) => p.price);
  const lo = Math.min(...prices) * 0.9;
  const hi = Math.max(...prices) * 1.1;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[12px] text-ink-400">
          Accumulation Index through history{" "}
          <span className="text-ink-500">· price log scale · weekly</span>
        </div>
        <SegmentedControl
          aria-label="Timeline range"
          options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
          value={range}
          onChange={(k) => {
            setRange(k as RangeKey);
            track("timeline_range", { range: k });
          }}
        />
      </div>

      <div className="fade-up relative" style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <ComposedChart data={points} margin={{ top: 10, right: 16, bottom: 8, left: 6 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.025)" vertical={false} />
            {segs.map((s, i) => (
              <ReferenceArea
                key={i}
                x1={s.x1}
                x2={s.x2}
                fill={COLOR[s.key]}
                fillOpacity={0.16}
                strokeOpacity={0}
                ifOverflow="extendDomain"
              />
            ))}
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => format(new Date(v), "yyyy")}
              stroke="#384353"
              tick={{ fill: "#6f7c8e", fontSize: 10.5, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              minTickGap={44}
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
              contentStyle={{
                background: "#0c1118",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                outline: "none",
                fontSize: 12,
              }}
              cursor={{ stroke: "rgba(255,255,255,0.14)", strokeWidth: 1 }}
              labelFormatter={(v) => format(new Date(v as number), "MMM yyyy")}
              formatter={(value: number, _name, item) => {
                const pt = item?.payload as TimelinePoint | undefined;
                if (!pt) return [fmtUsd(value), "BTC"];
                return [`${fmtUsd(pt.price)} · score ${pt.score} (${LABEL[pt.bandKey]})`, "BTC"];
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#e7edf4"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive
              animationDuration={650}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-ink-500">
        {ACCUMULATION_BANDS.map((b) => (
          <span key={b.key} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color, opacity: 0.55 }} />
            <span>{b.label.replace("Historically ", "")}</span>
          </span>
        ))}
        <span>Shaded bands are the historical accumulation environment; the line is BTC price.</span>
      </div>
    </div>
  );
}
