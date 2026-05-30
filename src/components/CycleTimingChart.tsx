import { format } from "date-fns";
import { cyclePeakTroughs, cycleTiming } from "@/lib/cycleTiming";
import { fmtUsd } from "@/lib/format";

// Pure timeline (no JS): days-from-halving on the X axis, one lane per cycle,
// with the historical peak (green) and low (red) windows shaded and labelled so
// the takeaway — highs and lows both cluster — reads in seconds.
export function CycleTimingChart() {
  const timing = cycleTiming();
  const rows = cyclePeakTroughs();
  const max = timing.axisMax;
  const pct = (day: number) => `${Math.min(100, Math.max(0, (day / max) * 100))}%`;
  const ticks = [0, 200, 400, 600, 800, 1000];
  const GUTTER = "92px";
  const yr = (iso: string) => `${iso.slice(0, 4)} cycle`;

  return (
    <div className="relative">
      {/* Band headers — carry the conclusion above the timeline */}
      <div className="relative h-9" style={{ marginLeft: GUTTER }}>
        <BandHeader
          start={timing.peakWindow.minDay}
          end={timing.peakWindow.maxDay}
          max={max}
          tone="green"
          label="Peak zone"
        />
        <BandHeader
          start={timing.bottomWindow.minDay}
          end={timing.bottomWindow.maxDay}
          max={max}
          tone="red"
          label="Low zone"
        />
      </div>

      <div className="relative">
        {/* Shaded windows + today line, aligned over the track column */}
        <div className="absolute inset-y-0 right-0 pointer-events-none" style={{ left: GUTTER }}>
          <Band start={timing.peakWindow.minDay} end={timing.peakWindow.maxDay} max={max} tone="green" />
          <Band start={timing.bottomWindow.minDay} end={timing.bottomWindow.maxDay} max={max} tone="red" />
          <div className="absolute inset-y-0 w-px bg-accent" style={{ left: pct(timing.todayDay) }}>
            <span className="absolute -top-0 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-accent/15 text-[9px] font-mono tracking-wider text-accent whitespace-nowrap">
              TODAY
            </span>
          </div>
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
                  <Marker
                    left={pct(r.peakDay)}
                    type="peak"
                    dayLabel={`${r.peakDay}d`}
                    title={yr(r.halvingDate)}
                    price={fmtUsd(r.peakPrice, { compact: true })}
                    date={format(new Date(r.peakDate), "MMM yyyy")}
                    color={r.color}
                    note={isCurrent ? "high so far" : undefined}
                  />
                  {r.bottomDay != null && r.bottomPrice != null && r.bottomDate && (
                    <Marker
                      left={pct(r.bottomDay)}
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
                style={{ left: pct(t) }}
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
          <Tri up /> Cycle high
        </span>
        <span className="flex items-center gap-1.5">
          <Tri /> Cycle low
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

function Band({
  start,
  end,
  max,
  tone,
}: {
  start: number;
  end: number;
  max: number;
  tone: keyof typeof BAND;
}) {
  return (
    <div
      className={`absolute inset-y-0 border-x ${BAND[tone]}`}
      style={{ left: `${(start / max) * 100}%`, width: `${((end - start) / max) * 100}%` }}
    />
  );
}

function BandHeader({
  start,
  end,
  max,
  tone,
  label,
}: {
  start: number;
  end: number;
  max: number;
  tone: keyof typeof BAND_TEXT;
  label: string;
}) {
  const center = (start + end) / 2;
  return (
    <div
      className="absolute top-0 -translate-x-1/2 text-center whitespace-nowrap"
      style={{ left: `${(center / max) * 100}%` }}
    >
      <div className={`text-[11px] font-semibold tracking-wide ${BAND_TEXT[tone]}`}>{label}</div>
      <div className="text-[9.5px] font-mono text-ink-500">
        day {start}–{end}
      </div>
    </div>
  );
}

function Tri({ up }: { up?: boolean }) {
  return (
    <span className={`text-[11px] leading-none ${up ? "text-signal-green" : "text-signal-red"}`}>
      {up ? "▲" : "▼"}
    </span>
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

      {/* Hover tooltip */}
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
