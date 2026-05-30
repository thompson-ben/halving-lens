"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CYCLES, TODAY_DAY_IN_CYCLE, type Cycle, type CycleSample } from "@/lib/btcData";
import { METRICS, zoneFor } from "@/lib/metrics";
import { metricStatus } from "@/lib/cycleIntel";
import { fmtPct, fmtUsd } from "@/lib/format";
import { MetricGauge } from "./MetricGauge";
import { ReplayChart } from "./ReplayChart";

// Only metrics we can stand behind as real — never replay synthetic series.
const LIVE_METRICS = METRICS.filter(
  (m) => m.bands.length > 0 && metricStatus(m.slug) !== "coming-soon",
);

const MAX_DAY = 1458;
const STEP = 7; // weekly

function sampleAtDay(cycle: Cycle, day: number): CycleSample {
  return cycle.samples.reduce((best, cur) =>
    Math.abs(cur.day - day) < Math.abs(best.day - day) ? cur : best,
  );
}

export function CycleReplay() {
  const [day, setDay] = useState(Math.min(TODAY_DAY_IN_CYCLE, MAX_DAY));
  const [playing, setPlaying] = useState(false);

  // Animate the slider when playing.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setDay((d) => {
        const next = d + STEP * 2;
        if (next > MAX_DAY) {
          setPlaying(false);
          return MAX_DAY;
        }
        return next;
      });
    }, 80);
    return () => clearInterval(id);
  }, [playing]);

  const samples = useMemo(
    () => CYCLES.map((c) => ({ cycle: c, sample: sampleAtDay(c, day) })),
    [day],
  );

  return (
    <div className="space-y-7">
      {/* Day display + transport */}
      <div className="card p-7 relative">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
              Cycle replay · day from halving
            </div>
            <div className="font-display text-[72px] lg:text-[88px] font-medium tracking-tightest text-ink-50 tabular-nums leading-none">
              Day {day}
            </div>
            <div className="mt-2 text-[12.5px] text-ink-400">
              of <span className="font-mono text-ink-200">{MAX_DAY}</span> days per cycle ·{" "}
              {((day / MAX_DAY) * 100).toFixed(1)}% through
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TransportButton onClick={() => setDay(0)} aria-label="Restart">
              <SkipBack size={14} fill="currentColor" />
            </TransportButton>
            <TransportButton
              onClick={() => setPlaying((p) => !p)}
              primary
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </TransportButton>
            <TransportButton onClick={() => setDay(MAX_DAY)} aria-label="End">
              <SkipForward size={14} fill="currentColor" />
            </TransportButton>
          </div>
        </div>

        {/* Slider */}
        <div className="mt-7">
          <input
            type="range"
            min={0}
            max={MAX_DAY}
            step={STEP}
            value={day}
            onChange={(e) => setDay(parseInt(e.target.value, 10))}
            className="w-full appearance-none bg-transparent cursor-pointer
              [&::-webkit-slider-runnable-track]:h-1.5
              [&::-webkit-slider-runnable-track]:rounded-full
              [&::-webkit-slider-runnable-track]:bg-white/[0.06]
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-accent
              [&::-webkit-slider-thumb]:-mt-[5px]
              [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(5,7,10,0.9),0_0_18px_rgba(94,234,212,0.6)]
              [&::-moz-range-track]:h-1.5
              [&::-moz-range-track]:rounded-full
              [&::-moz-range-track]:bg-white/[0.06]
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-accent
              [&::-moz-range-thumb]:border-0"
          />
          <div className="mt-3 flex justify-between text-[10px] font-mono text-ink-400 tracking-widest">
            <span>HALVING</span>
            <span>YEAR 1</span>
            <span>YEAR 2</span>
            <span>YEAR 3</span>
            <span>NEXT HALVING</span>
          </div>
        </div>

        {/* Price overlay with a playhead that tracks the scrub */}
        <div className="mt-7 pt-6 border-t border-white/[0.05]">
          <div className="text-[11.5px] text-ink-400 mb-3">
            Every cycle&apos;s price as a multiple of its halving price — the dot marks where each
            cycle sat at day {day}.
          </div>
          <ReplayChart day={day} height={300} />
        </div>
        <div className="watermark">halving.lens · replay</div>
      </div>

      {/* Per-cycle snapshot at this day */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {samples.map(({ cycle, sample }) => (
          <CycleSnapshot key={cycle.id} cycle={cycle} sample={sample} day={day} />
        ))}
      </div>

      {/* Metric grid at this day */}
      <div className="card p-7">
        <div className="mb-5">
          <h3 className="font-display text-[18px] font-medium tracking-tight-2 text-ink-100">
            Live signals at day {day}, by cycle
          </h3>
          <div className="text-[11.5px] text-ink-400 mt-1">
            Drag the timeline to see how each live-derived signal evolved through each halving
            cycle.
          </div>
        </div>

        <div className="space-y-5">
          {LIVE_METRICS.map((metric) => (
            <MetricRow key={metric.slug} metricSlug={metric.slug} day={day} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TransportButton({
  children,
  primary,
  ...rest
}: { children: React.ReactNode; primary?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={
        primary
          ? "w-11 h-11 rounded-full bg-accent text-ink-950 grid place-items-center hover:bg-accent-soft transition-colors"
          : "w-9 h-9 rounded-full border border-white/[0.06] bg-white/[0.02] text-ink-300 grid place-items-center hover:text-ink-100 hover:border-white/15 transition-colors"
      }
    >
      {children}
    </button>
  );
}

function CycleSnapshot({
  cycle,
  sample,
  day,
}: {
  cycle: Cycle;
  sample: CycleSample;
  day: number;
}) {
  const halvingPrice = cycle.samples[0].price;
  const gainFromHalving = (sample.price / halvingPrice - 1) * 100;
  const isCurrent = cycle.id === 5;
  // Check if "day" exceeds the cycle's known data (cycle 5 only has data up to today)
  const lastDay = cycle.samples[cycle.samples.length - 1].day;
  const beyondData = isCurrent && day > lastDay;

  return (
    <div
      className={`relative rounded-2xl p-5 border ${
        isCurrent
          ? "border-accent/30 bg-accent/[0.04]"
          : "border-white/[0.04] bg-white/[0.012]"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: cycle.color }}
          />
          <span className="text-[12.5px] font-medium text-ink-100">{cycle.short}</span>
        </div>
        {isCurrent && (
          <span className="text-[9.5px] uppercase tracking-[0.18em] text-accent">Current</span>
        )}
      </div>
      {beyondData ? (
        <div className="text-[11.5px] text-ink-400 leading-relaxed mt-4">
          Cycle 5 hasn't reached day {day} yet — the future is unwritten.
        </div>
      ) : (
        <>
          <div className="font-display text-[26px] font-medium tracking-tight-2 text-ink-100 tabular-nums leading-none">
            {fmtUsd(sample.price, { compact: true })}
          </div>
          <div className="mt-1.5 text-[11.5px]">
            <span
              className={`font-mono tabular-nums ${gainFromHalving >= 0 ? "text-signal-green" : "text-signal-red"}`}
            >
              {fmtPct(gainFromHalving, 0)}
            </span>
            <span className="text-ink-400 ml-1.5">from halving</span>
          </div>
        </>
      )}
    </div>
  );
}

function MetricRow({ metricSlug, day }: { metricSlug: string; day: number }) {
  const metric = METRICS.find((m) => m.slug === metricSlug);
  if (!metric) return null;
  return (
    <div className="grid grid-cols-[140px_1fr] lg:grid-cols-[180px_1fr_1fr_1fr_1fr] gap-4 items-center">
      <div>
        <div className="text-[12px] font-medium text-ink-100">{metric.name}</div>
        <div className="text-[10.5px] text-ink-400 mt-0.5">{metric.short}</div>
      </div>
      {CYCLES.map((cycle) => {
        const sample = sampleAtDay(cycle, day);
        const value = metric.pick(sample);
        const lastDay = cycle.samples[cycle.samples.length - 1].day;
        const beyondData = cycle.id === 5 && day > lastDay;
        const { zone } = zoneFor(metric, value);
        if (beyondData) {
          return (
            <div key={cycle.id} className="text-[11.5px] text-ink-500">
              —
            </div>
          );
        }
        return (
          <div key={cycle.id} className="min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: cycle.color }}
              />
              <span className="font-mono text-[12.5px] text-ink-100 tabular-nums">
                {value.toFixed(metric.decimals)}
              </span>
              <span className="text-[10px] text-ink-400">{metric.unit}</span>
            </div>
            <MetricGauge metric={metric} value={value} height={5} />
          </div>
        );
      })}
    </div>
  );
}
