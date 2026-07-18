"use client";

import type { ReactNode } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PathExplorer } from "@/lib/pathExplorer";

// The Historical Path Explorer — the signature visual. It reads left-to-right as
// a single sentence: the current cycle's real recent path (bright) arrives at
// "You are here", and from that pivot the completed cycles' real forward paths
// (dimmed, dashed once past their peak) fan out as supporting context, inside
// the min/median/max envelope of what actually happened. No smoothing, no
// model, no forecast.

const CURRENT = "#5eead4";
const MEDIAN = "#a78bfa";

export function HistoricalPathExplorer({ data }: { data: PathExplorer }) {
  const rowMap = new Map<number, Record<string, number | number[]>>();
  const put = (day: number, k: string, v: number | number[]) => {
    const row = rowMap.get(day) ?? { day };
    row[k] = v;
    rowMap.set(day, row);
  };
  const r1 = (n: number) => Math.round(n * 10) / 10;
  data.current.points.forEach((p) => put(p.day, "current", r1(p.pct)));
  data.paths.forEach((p) => p.points.forEach((pt) => put(pt.day, `c${p.cycleId}`, r1(pt.pct))));
  data.envelope.forEach((e) => {
    put(e.day, "band", [r1(e.lo), r1(e.hi)]);
    put(e.day, "mid", r1(e.mid));
  });
  const rows = [...rowMap.values()].sort((a, b) => (a.day as number) - (b.day as number));

  return (
    <div>
      {/* Decode key — so a first-time viewer reads the chart in one glance */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-ink-400">
        <LegendKey><span className="inline-block w-5 h-[3px] rounded-full" style={{ background: CURRENT }} /> This cycle</LegendKey>
        <LegendKey><span className="inline-block w-5 h-[2px] rounded-full bg-ink-300/50" /> Prior cycles</LegendKey>
        <LegendKey><span className="inline-block w-5 h-[2px] border-t-2 border-dashed" style={{ borderColor: MEDIAN }} /> Median</LegendKey>
        <LegendKey><span className="inline-block w-4 h-3 rounded-sm" style={{ background: "rgba(94,234,212,0.14)" }} /> Range of outcomes</LegendKey>
        <LegendKey><span className="inline-block w-1.5 h-1.5 rounded-full ring-2 ring-[#5eead4]/30" style={{ background: CURRENT }} /> Today</LegendKey>
      </div>

      <div className="w-full h-[400px] sm:h-[460px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 20, right: 18, bottom: 8, left: 4 }}>
            <defs>
              <linearGradient id="hpeBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CURRENT} stopOpacity={0.16} />
                <stop offset="100%" stopColor={CURRENT} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />

            {/* "This cycle so far" — the run-up region, faintly shaded so the eye
                separates what already happened from where history went next. */}
            <ReferenceArea x1={-data.leadInDays} x2={0} fill={CURRENT} fillOpacity={0.035} strokeOpacity={0}
              label={{ value: "This cycle so far", position: "insideTopLeft", fill: "#6f7c8e", fontSize: 10.5, offset: 8 }} />

            <XAxis
              type="number"
              dataKey="day"
              domain={[-data.leadInDays, data.windowDays]}
              ticks={[-data.leadInDays, 0, 90, 180, 365]}
              tick={{ fill: "#6f7c8e", fontSize: 11 }}
              tickFormatter={(d) => (d === 0 ? "Today" : d < 0 ? `${Math.round(d / 7)}w` : `+${d}d`)}
              stroke="rgba(255,255,255,0.1)"
            />
            <YAxis tick={{ fill: "#6f7c8e", fontSize: 11 }} tickFormatter={(v) => `${v}%`} stroke="rgba(255,255,255,0.1)" width={44} domain={["auto", "auto"]} />

            {/* Historical envelope — the real range the completed cycles occupied */}
            <Area type="monotone" dataKey="band" stroke="none" fill="url(#hpeBand)" connectNulls isAnimationActive={false} activeDot={false} />
            <Line type="monotone" dataKey="mid" name="Historical median" stroke={MEDIAN} strokeWidth={1.6} strokeDasharray="2 3" strokeOpacity={0.8} dot={false} connectNulls isAnimationActive={false} />

            <ReferenceLine y={100} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" />

            {/* Completed cycles — supporting context: dimmed, and faded further
                once past their peak (that path is aftermath, not comparison). */}
            {data.paths.map((p) => (
              <Line
                key={p.cycleId}
                type="monotone"
                dataKey={`c${p.cycleId}`}
                name={p.label}
                stroke={p.color}
                strokeWidth={p.pastPeak ? 1.5 : 1.9}
                strokeDasharray={p.pastPeak ? "5 4" : undefined}
                strokeOpacity={p.pastPeak ? 0.32 : 0.55}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            ))}

            {/* The current cycle — the star: a soft glow underlay then a bright,
                solid line on top, so it visibly dominates the fan of history. */}
            <Line type="monotone" dataKey="current" stroke={CURRENT} strokeWidth={9} strokeOpacity={0.12} dot={false} connectNulls isAnimationActive={false} legendType="none" />
            <Line type="monotone" dataKey="current" name="This cycle" stroke={CURRENT} strokeWidth={3.6} dot={false} connectNulls isAnimationActive={false} />

            {/* The pivot — "You are here": a haloed dot on a strong vertical. */}
            <ReferenceLine x={0} stroke={CURRENT} strokeOpacity={0.5} strokeWidth={1.5} />
            <ReferenceDot x={0} y={100} r={11} fill={CURRENT} fillOpacity={0.16} stroke="none" isFront={false} />
            <ReferenceDot x={0} y={100} r={5.5} fill={CURRENT} stroke="#05070a" strokeWidth={2} isFront
              label={{ value: "You are here", position: "top", fill: CURRENT, fontSize: 12.5, fontWeight: 700, offset: 14 }} />

            <Tooltip
              contentStyle={{ background: "#0c1118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: "#8893a4" }}
              labelFormatter={(d) => (d === 0 ? "Today (rebased to 100%)" : d < 0 ? `${Math.abs(Math.round(Number(d) / 7))} weeks ago` : `+${d} days from today`)}
              formatter={(value: number | number[], key: string) => {
                if (key === "band") return [Array.isArray(value) ? `${value[0]}–${value[1]}%` : `${value}%`, "Historical range"];
                if (key === "mid") return [`${value}%`, "Historical median"];
                if (key === "current") return [`${value}%`, "This cycle"];
                const p = data.paths.find((x) => `c${x.cycleId}` === key);
                return [`${value}%`, p ? `${p.label}${p.pastPeak ? " (past peak)" : ""}` : key];
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Data-derived teaching notes */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <TeachCard label="Where we are" value={`Day ${data.cycleDay}`} note="of the current cycle, rebased to 100% — the bright line is this cycle's real recent path." />
        <TeachCard
          label="How closely cycles tracked"
          value={data.agreementSpread != null ? `~${data.agreementSpread}pp` : "—"}
          note="the range the three prior cycles spread across by six months from here — then they widened. Only three cycles, so context, not a statistic."
        />
        <TeachCard
          label="Still climbing from here"
          value={`${data.stillClimbing} of ${data.paths.length}`}
          note={data.stillClimbing === 0 ? "every prior cycle had already peaked by this point." : "prior cycles were still rising toward their peak at this stage; the rest had already topped."}
        />
      </div>

      {/* Per-cycle annotation */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {data.paths.map((p) => (
          <div key={p.cycleId} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color, opacity: 0.65 }} />
              <span className="text-[13px] font-medium text-ink-100">{p.label} cycle</span>
              {p.pastPeak && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full border border-white/10 text-ink-400">Past peak</span>}
            </div>
            <div className="mt-2 text-[12px] text-ink-400 leading-relaxed">
              {p.pastPeak ? (
                <>Had already topped <span className="text-ink-200">{Math.abs(p.daysToPeak)} days</span> before this point (at +{Math.round(p.peakPct - 100)}% vs today). The dashed line is the real path that followed.</>
              ) : (
                <>Reached its cycle peak of <span className="text-accent">+{Math.round(p.peakPct - 100)}%</span> at <span className="text-ink-200">+{p.daysToPeak} days</span>{p.daysToPeak > data.windowDays ? " (beyond this window)" : ""}.</>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendKey({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center gap-1.5">{children}</span>;
}

function TeachCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-accent/12 bg-accent/[0.03] p-3.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500">{label}</div>
      <div className="mt-1 text-[19px] font-display text-ink-50 tabular-nums leading-none">{value}</div>
      <div className="mt-1.5 text-[11.5px] text-ink-400 leading-relaxed">{note}</div>
    </div>
  );
}
