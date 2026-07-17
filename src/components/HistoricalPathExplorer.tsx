"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PathExplorer } from "@/lib/pathExplorer";

// The Historical Path Explorer chart — replays each completed halving cycle's
// REAL forward price path from today's equivalent cycle day, rebased to 100%.
// Cycles already past their peak are drawn dashed + dimmed and clearly flagged,
// so the line is honest real data, never an implied forecast.

const MARKER_DAYS = [30, 60, 90, 180, 365];

export function HistoricalPathExplorer({ data }: { data: PathExplorer }) {
  // Merge every cycle's real (day-offset, pct) points into one numeric-x series
  // set. No interpolation — each cycle keeps only its own real weekly points;
  // Recharts connects a cycle's own points and leaves gaps (connectNulls).
  const rowMap = new Map<number, Record<string, number>>();
  for (const p of data.paths) {
    for (const pt of p.points) {
      const row = rowMap.get(pt.day) ?? { day: pt.day };
      row[`c${p.cycleId}`] = Math.round(pt.pct * 10) / 10;
      rowMap.set(pt.day, row);
    }
  }
  const rows = [...rowMap.values()].sort((a, b) => a.day - b.day);

  return (
    <div>
      <div className="w-full h-[380px] sm:h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              type="number"
              dataKey="day"
              domain={[0, data.windowDays]}
              ticks={[0, ...MARKER_DAYS]}
              tick={{ fill: "#6f7c8e", fontSize: 11 }}
              tickFormatter={(d) => (d === 0 ? "Today" : `+${d}d`)}
              stroke="rgba(255,255,255,0.1)"
            />
            <YAxis
              tick={{ fill: "#6f7c8e", fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              stroke="rgba(255,255,255,0.1)"
              width={44}
              domain={["auto", "auto"]}
            />
            <ReferenceLine y={100} stroke="rgba(255,255,255,0.25)" strokeDasharray="3 3" />
            <ReferenceLine x={0} stroke="#5eead4" strokeOpacity={0.5} label={{ value: "You are here", fill: "#5eead4", fontSize: 11, position: "insideTopLeft" }} />
            <Tooltip
              contentStyle={{ background: "#0c1118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: "#8893a4" }}
              labelFormatter={(d) => (d === 0 ? "Today (rebased to 100%)" : `+${d} days from today`)}
              formatter={(value: number, key: string) => {
                const p = data.paths.find((x) => `c${x.cycleId}` === key);
                return [`${value}%`, p ? `${p.label}${p.pastPeak ? " (past peak)" : ""}` : key];
              }}
            />
            {data.paths.map((p) => (
              <Line
                key={p.cycleId}
                type="monotone"
                dataKey={`c${p.cycleId}`}
                name={p.label}
                stroke={p.color}
                strokeWidth={p.pastPeak ? 1.5 : 2.5}
                strokeDasharray={p.pastPeak ? "5 4" : undefined}
                strokeOpacity={p.pastPeak ? 0.55 : 1}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend + honest per-cycle annotation */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.paths.map((p) => (
          <div key={p.cycleId} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-[13px] font-medium text-ink-100">{p.label} cycle</span>
              {p.pastPeak && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full border border-white/10 text-ink-400">Past peak</span>
              )}
            </div>
            <div className="mt-2 text-[12px] text-ink-400 leading-relaxed">
              {p.pastPeak ? (
                <>Had already topped <span className="text-ink-200">{Math.abs(p.daysToPeak)} days</span> before this point (at +{Math.round(p.peakPct - 100)}% vs today&rsquo;s equivalent). The dashed line shows the real path that followed.</>
              ) : (
                <>
                  Reached its cycle peak of <span className="text-accent">+{Math.round(p.peakPct - 100)}%</span> at{" "}
                  <span className="text-ink-200">+{p.daysToPeak} days</span>
                  {p.daysToPeak > data.windowDays ? " (beyond this window)" : ""}. In the first year it moved to +{Math.round(p.windowHighPct - 100)}%.
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
