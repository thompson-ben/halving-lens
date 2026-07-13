"use client";

import { useMemo, useState } from "react";
import type { EtfFlowPoint } from "@/lib/data/types";
import { track } from "@/lib/track";
import { SegmentedControl } from "./SegmentedControl";
import { EtfFlowChart } from "./EtfFlowChart";

// Windowed wrapper around EtfFlowChart: a 7 / 30 / 90-day / all-time toggle over
// the same daily-net-flow-bars + cumulative-line chart. Reuses EtfFlowChart so
// the styling stays identical; this just slices the series and remembers the
// chosen range.

const RANGES = [
  { key: "7", label: "7D" },
  { key: "30", label: "30D" },
  { key: "90", label: "90D" },
  { key: "all", label: "All" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

export function EtfTrendChart({ points, height = 380 }: { points: EtfFlowPoint[]; height?: number }) {
  const [range, setRange] = useState<RangeKey>("90");

  const sliced = useMemo(() => {
    if (range === "all") return points;
    const n = Number(range);
    return points.slice(-n);
  }, [points, range]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[12px] text-ink-400">
          Daily net flow &amp; cumulative total <span className="text-ink-500">· all US spot BTC ETFs</span>
        </div>
        <SegmentedControl
          aria-label="Flow window"
          options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
          value={range}
          onChange={(k) => {
            setRange(k as RangeKey);
            track("timeline_range", { range: `etf_${k}` });
          }}
        />
      </div>
      <EtfFlowChart points={sliced} height={height} />
    </div>
  );
}
