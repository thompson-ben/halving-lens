"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { cyclePeakTroughs, cycleTiming } from "@/lib/cycleTiming";
import { fmtUsd } from "@/lib/format";
import { SegmentedControl } from "./SegmentedControl";

// Zoomable timeline: days-from-halving on the X axis, one lane per cycle, with
// the historical peak (green) and low (red) windows shaded. Presets let you
// zoom to the lows + today, to read how close the current cycle is to the
// historical low window.
export function CycleTimingChart() {
  const timing = cycleTiming();
  const rows = cyclePeakTroughs();
  const [view, setView] = useState<"full" | "highs" | "lows">("full");

  const [lo, hi] = useMemo<[number, number]>(() => {
    const pw = timing.peakWindow;
    const bw = timing.bottomWindow;
    if (view === "highs") return [Math.max(0, pw.minDay - 120), pw.maxDay + 160];
    if (view === "lows") return [Math.max(0, Math.min(timing.todayDay, bw.minDay) - 90), bw.maxDay + 90];
    return [0, timing.axisMax];
  }, [view, timing]);

  const span = hi - lo;
  const posOf = (day: number) => ((day - lo) / span) * 100;
  const inView = (day: number) => day >= lo && day <= hi;
  const GUTTER = "92px";

  const ticks = useMemo(() => {
    const step = span <= 320 ? 50 : span <= 650 ? 100 : 200;
    const out: number[] = [];
    for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) out.push(t);
    if (lo === 0 && out[0] !== 0) out.unshift(0);
    return out;
  }, [lo, hi, span]);

  const yr = (iso: string) => `${iso.slice(0, 4)} cycle`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-[11.5px] text-ink-400">
          {view === "lows"
            ? `Zoomed to the low zone — today is day ${timing.todayDay}, the low window opens at day ${timing.bottomWindow.minDay}.`
            : view === "highs"
              ? "Zoomed to the peak zone."
              : "Full cycle view."}
        </p>
        <SegmentedControl
          aria-label="Timeline zoom"
          options={[
            { key: "full", label: "Full" },
            { key: "highs", label: "Highs" },
            { key: "lows", label: "Lows + today" },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      {/* Band headers */}
      <div className="relative h-9" style={{ marginLeft: GUTTER }}>
        <BandHeader window={[lo, hi]} start={timing.peakWindow.minDay} end={timing.peakWindow.maxDay} tone="green" label="Peak zone" />
        <BandHeader window={[lo, hi]} start={timing.bottomWindow.minDay} end={timing.bottomWindow.maxDay} tone="red" label="Low zone" />
      </div>

      <div className="relative">
        {/* Shaded windows + today line */}
        <div className="absolute inset-y-0 right-0 pointer-events-none" style={{ left: GUTTER }}>
          <Band window={[lo, hi]} start={timing.peakWindow.minDay} end={timing.peakWindow.maxDay} tone="green" />
          <Band window={[lo, hi]} start={timing.bottomWindow.minDay} end={timing.bottomWindow.maxDay} tone="red" />
          {inView(timing.todayDay) && (
            <div className="absolute inset-y-0 w-px bg-accent" style={{ left: `${posOf(timing.todayDay)}%` }}>
              <span className="absolute -top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-accent/15 text-[9px] font-mono tracking-wider text-accent whitespace-nowrap">
                TODAY
              </span>
            </div>
          )}
        </div>

        {/* Lanes */}
        <div className="relative space-y-3 py-1">
          {rows.map((r) => {
            const isCurrent = r.id === 5;
            return (
              <div key={r.id} className="flex items-center gap-3 h-9">
                <div className="shrink-0 flex items-center gap-1.5" style={{ width: "80px" }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
                  <span className={`text-[11px] font-medium ${isCurrent ? "text-accent" : "text-ink-300"}`}>
                    {isCurrent ? "Now" : r.halvingDate.slice(0, 4)}
                  </span>
                </div>
                <div className="relative flex-1 h-full">
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/[0.05]" />
                  {inView(r.peakDay) && (
                    <Marker
                      left={`${posOf(r.peakDay)}%`}
                      type="peak"
                      dayLabel={`${r.peakDay}d`}
                      title={yr(r.halvingDate)}
                      price={fmtUsd(r.peakPrice, { compact: true })}
                      date={format(new Date(r.peakDate), "MMM yyyy")}
                      color={r.color}
                      note={isCurrent ? "high so far" : undefined}
                    />
                  )}
                  {r.bottomDay != null && r.bottomPrice != null && r.bottomDate && inView(r.bottomDay) && (
                    <Marker
                      left={`${posOf(r.bottomDay)}%`}
                      type="bottom"
                      dayLabel={`${r.bottomDay}d`}
                      title={yr(r.halvingDate)}
                      price={fmtUsd(r.bottomPrice, { compact: true })}
                      date={format(new Date(r.bottomDate), "MMM yyyy")}
                      color={r.color}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Axis */}
        <div className="flex mt-2" style={{ paddingLeft: GUTTER }}>
          <div className="relative flex-1 h-4">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute top-0 -translate-x-1/2 text-[10px] font-mono text-ink-500 whitespace-nowrap"
                style={{ left: `${posOf(t)}%` }}
              >
                {t === 0 ? "Halving" : `${t}d`}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap mt-5 text-[11px] text-ink-350">
        <span className="flex items-center gap-1.5">
          <span className="text-signal-green text-[11px] leading-none">▲</span> Cycle high
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-signal-red text-[11px] leading-none">▼</span> Cycle low
        </span>
        <span className="text-ink-500">· hover any point for cycle, price &amp; date</span>
      </div>
    </div>
  );
}

const BAND = {
  green: "bg-signal-green/[0.06] border-signal-green/20",
  red: "bg-signal-red/[0.06] border-signal-red/20",
} as const;
const BAND_TEXT = { green: "text-signal-green", red: "text-signal-red" } as const;

function clip(window: [number, number], start: number, end: number) {
  const [lo, hi] = window;
  const s = Math.max(start, lo);
  const e = Math.min(end, hi);
  if (e <= s) return null;
  const span = hi - lo;
  return { left: ((s - lo) / span) * 100, width: ((e - s) / span) * 100 };
}

function Band({
  window,
  start,
  end,
  tone,
}: {
  window: [number, number];
  start: number;
  end: number;
  tone: keyof typeof BAND;
}) {
  const box = clip(window, start, end);
  if (!box) return null;
  return (
    <div
      className={`absolute inset-y-0 border-x ${BAND[tone]}`}
      style={{ left: `${box.left}%`, width: `${box.width}%` }}
    />
  );
}

function BandHeader({
  window,
  start,
  end,
  tone,
  label,
}: {
  window: [number, number];
  start: number;
  end: number;
  tone: keyof typeof BAND_TEXT;
  label: string;
}) {
  const [lo, hi] = window;
  const center = (start + end) / 2;
  if (center < lo || center > hi) return null;
  return (
    <div
      className="absolute top-0 -translate-x-1/2 text-center whitespace-nowrap"
      style={{ left: `${((center - lo) / (hi - lo)) * 100}%` }}
    >
      <div className={`text-[11px] font-semibold tracking-wide ${BAND_TEXT[tone]}`}>{label}</div>
      <div className="text-[9.5px] font-mono text-ink-500">
        day {start}–{end}
      </div>
    </div>
  );
}

function Marker({
  left,
  type,
  dayLabel,
  title,
  price,
  date,
  color,
  note,
}: {
  left: string;
  type: "peak" | "bottom";
  dayLabel: string;
  title: string;
  price: string;
  date: string;
  color: string;
  note?: string;
}) {
  const isPeak = type === "peak";
  return (
    <span
      className="group absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10"
      style={{ left }}
    >
      <span className={`text-[13px] leading-none ${isPeak ? "text-signal-green" : "text-signal-red"}`}>
        {isPeak ? "▲" : "▼"}
      </span>
      <span className="absolute top-[15px] text-[8.5px] font-mono text-ink-500 whitespace-nowrap">
        {note ?? dayLabel}
      </span>
      <span className="pointer-events-none absolute bottom-[18px] left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <span className="block rounded-lg border border-white/10 bg-[#0c1118] px-2.5 py-2 shadow-xl whitespace-nowrap">
          <span className="flex items-center gap-1.5 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <span className="text-[11px] font-medium text-ink-100">{title}</span>
            <span className={`text-[10px] ${isPeak ? "text-signal-green" : "text-signal-red"}`}>
              {isPeak ? "high" : "low"}
            </span>
          </span>
          <span className="block text-[12px] text-ink-50 font-medium tabular-nums">{price}</span>
          <span className="block text-[10px] text-ink-400 font-mono">
            {date} · {dayLabel}
          </span>
        </span>
      </span>
    </span>
  );
}
