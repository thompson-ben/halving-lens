import { cyclePeakTroughs, cycleTiming } from "@/lib/cycleTiming";
import { fmtUsd } from "@/lib/format";

// Pure timeline (no interactivity): days-from-halving on the X axis, one lane
// per cycle, with the historical peak/low windows shaded and today marked.
export function CycleTimingChart() {
  const timing = cycleTiming();
  const rows = cyclePeakTroughs();
  const max = timing.axisMax;
  const pct = (day: number) => `${Math.min(100, Math.max(0, (day / max) * 100))}%`;

  const ticks = [0, 200, 400, 600, 800, 1000];
  const GUTTER = "76px";

  return (
    <div className="relative">
      {/* Window + today overlay, aligned over the track column */}
      <div className="absolute inset-y-0 right-0 pointer-events-none" style={{ left: GUTTER }}>
        <Band start={timing.peakWindow.minDay} end={timing.peakWindow.maxDay} max={max} tone="green" />
        <Band start={timing.bottomWindow.minDay} end={timing.bottomWindow.maxDay} max={max} tone="blue" />
        {/* Today line */}
        <div
          className="absolute inset-y-0 w-px bg-accent/70"
          style={{ left: pct(timing.todayDay) }}
        >
          <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-mono tracking-wider text-accent whitespace-nowrap">
            TODAY
          </span>
        </div>
      </div>

      {/* Window labels */}
      <div className="absolute -top-1 right-0 pointer-events-none" style={{ left: GUTTER }}>
        <WindowLabel start={timing.peakWindow.minDay} end={timing.peakWindow.maxDay} max={max} tone="green" label="Peak window" />
        <WindowLabel start={timing.bottomWindow.minDay} end={timing.bottomWindow.maxDay} max={max} tone="blue" label="Low window" />
      </div>

      {/* Lanes */}
      <div className="space-y-2.5 pt-7">
        {rows.map((r) => {
          const isCurrent = r.id === 5;
          return (
            <div key={r.id} className="flex items-center gap-3 h-8">
              <div
                className={`shrink-0 text-[11px] font-medium truncate ${isCurrent ? "text-accent" : "text-ink-300"}`}
                style={{ width: "64px" }}
              >
                {r.short}
              </div>
              <div className="relative flex-1 h-full">
                {/* lane baseline */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-white/[0.05]" />
                {/* peak marker */}
                <Marker
                  left={pct(r.peakDay)}
                  type="peak"
                  color={r.color}
                  title={`${r.label} — high: ${fmtUsd(r.peakPrice, { compact: true })} at day ${r.peakDay}`}
                  note={isCurrent ? "high so far" : undefined}
                />
                {/* bottom marker (priors only) */}
                {r.bottomDay != null && r.bottomPrice != null && (
                  <Marker
                    left={pct(r.bottomDay)}
                    type="bottom"
                    color={r.color}
                    title={`${r.label} — low: ${fmtUsd(r.bottomPrice, { compact: true })} at day ${r.bottomDay}`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Axis */}
      <div className="flex mt-3" style={{ paddingLeft: GUTTER }}>
        <div className="relative flex-1 h-4">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0 -translate-x-1/2 text-[10px] font-mono text-ink-500 whitespace-nowrap"
              style={{ left: pct(t) }}
            >
              {t === 0 ? "Halving" : `${t}d`}
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap mt-5 text-[11px] text-ink-350">
        <span className="flex items-center gap-1.5">
          <span className="text-signal-green text-[11px] leading-none">▲</span> Cycle high
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-signal-blue text-[11px] leading-none">▼</span> Cycle low
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2.5 rounded-sm bg-signal-green/15 border border-signal-green/25" />
          Historical peak window
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-2.5 rounded-sm bg-signal-blue/15 border border-signal-blue/25" />
          Historical low window
        </span>
      </div>
    </div>
  );
}

const TONE = {
  green: "bg-signal-green/[0.07] border-signal-green/20",
  blue: "bg-signal-blue/[0.07] border-signal-blue/20",
} as const;

const TONE_TEXT = {
  green: "text-signal-green",
  blue: "text-signal-blue",
} as const;

function Band({
  start,
  end,
  max,
  tone,
}: {
  start: number;
  end: number;
  max: number;
  tone: keyof typeof TONE;
}) {
  return (
    <div
      className={`absolute inset-y-0 border-x ${TONE[tone]}`}
      style={{ left: `${(start / max) * 100}%`, width: `${((end - start) / max) * 100}%` }}
    />
  );
}

function WindowLabel({
  start,
  end,
  max,
  tone,
  label,
}: {
  start: number;
  end: number;
  max: number;
  tone: keyof typeof TONE_TEXT;
  label: string;
}) {
  const center = (start + end) / 2;
  return (
    <span
      className={`absolute top-0 -translate-x-1/2 text-[9.5px] font-medium tracking-wide whitespace-nowrap ${TONE_TEXT[tone]}`}
      style={{ left: `${(center / max) * 100}%` }}
    >
      {label}
    </span>
  );
}

function Marker({
  left,
  type,
  color,
  title,
  note,
}: {
  left: string;
  type: "peak" | "bottom";
  color: string;
  title: string;
  note?: string;
}) {
  return (
    <span
      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center cursor-help"
      style={{ left }}
      title={title}
    >
      <span className="text-[12px] leading-none" style={{ color }}>
        {type === "peak" ? "▲" : "▼"}
      </span>
      {note && (
        <span className="absolute top-3 text-[8.5px] text-ink-500 whitespace-nowrap">{note}</span>
      )}
    </span>
  );
}
