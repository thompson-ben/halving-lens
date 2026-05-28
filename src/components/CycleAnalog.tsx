import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { cycleAnalog, cyclesAtSameDay, TODAY_DAY_IN_CYCLE } from "@/lib/btcData";
import { fmtPct, fmtUsd } from "@/lib/format";

export function CycleAnalog() {
  const analog = cycleAnalog();
  const sameDay = cyclesAtSameDay();
  const halvingDate = format(new Date(analog.cycle.halvingDate), "MMM yyyy");

  return (
    <section className="card-glow p-8 lg:p-10 relative overflow-hidden">
      <div className="relative z-10">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">
          Today vs prior cycles
        </div>

        <h2 className="font-display text-[28px] lg:text-[36px] font-medium tracking-tight-2 text-ink-100 leading-[1.15] max-w-3xl">
          Bitcoin today most closely resembles{" "}
          <span className="text-gradient">{analog.cycle.label}</span> at day {analog.day} from
          halving.
        </h2>

        <p className="mt-4 text-[14px] text-ink-300 max-w-2xl leading-relaxed">
          {(analog.similarity * 100).toFixed(0)}% signature similarity across MVRV-Z, NUPL, Mayer,
          Rainbow, and price-to-peak. From the {halvingDate} halving on, here's what that cycle
          did from this exact point forward.
        </p>

        <div className="mt-8 grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-7">
          {analog.peakAfter && analog.peakAfter.gainPct > 0 && (
            <Stat
              label="Peak ahead"
              value={fmtPct(analog.peakAfter.gainPct, 0)}
              tone="green"
              sub={`from ${fmtUsd(analog.sample.price, { compact: true })} to ${fmtUsd(analog.peakAfter.price, { compact: true })}, over ${analog.peakAfter.daysAhead} days`}
            />
          )}
          {analog.troughAfter && analog.troughAfter.drawdownPct < 0 && (
            <Stat
              label="Drawdown ahead"
              value={fmtPct(analog.troughAfter.drawdownPct, 0)}
              tone="red"
              sub={`worst point landed at ${fmtUsd(analog.troughAfter.price, { compact: true })}, ${analog.troughAfter.daysAhead} days from this point`}
            />
          )}
          <Stat
            label={analog.endOfCycle.returnPct >= 0 ? "By next halving" : "By next halving"}
            value={fmtPct(analog.endOfCycle.returnPct, 0)}
            tone={analog.endOfCycle.returnPct >= 0 ? "green" : "red"}
            sub={`ended at ${fmtUsd(analog.endOfCycle.price, { compact: true })}, ${analog.endOfCycle.daysAhead} days later`}
          />
        </div>
      </div>

      <div className="mt-10 pt-8 border-t border-white/[0.04] relative z-10">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-ink-400 mb-5">
          And all three prior cycles at this exact day from halving ({TODAY_DAY_IN_CYCLE}d)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          {sameDay.map(({ cycle, sample }) => {
            const halvingPrice = cycle.samples[0].price;
            const gainFromHalving = (sample.price / halvingPrice - 1) * 100;
            const peakGain = (cycle.peakPrice / sample.price - 1) * 100;
            const daysToPeak = cycle.peakDay - sample.day;
            const isAnalog = cycle.id === analog.cycle.id;
            return (
              <div
                key={cycle.id}
                className={`relative rounded-xl p-5 ${
                  isAnalog
                    ? "border border-accent/30 bg-accent/[0.04]"
                    : "border border-white/[0.04] bg-white/[0.012]"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: cycle.color }}
                    />
                    <span className="text-[12.5px] font-medium text-ink-100">{cycle.short}</span>
                    <span className="text-[10.5px] text-ink-400 font-mono">
                      {format(new Date(cycle.halvingDate), "yyyy")}
                    </span>
                  </div>
                  {isAnalog && (
                    <span className="text-[9.5px] uppercase tracking-[0.18em] text-accent">
                      Closest analog
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Mini label="Price then" value={fmtUsd(sample.price, { compact: true })} />
                  <Mini
                    label="From halving"
                    value={fmtPct(gainFromHalving, 0)}
                    tone={gainFromHalving > 0 ? "green" : "red"}
                  />
                  <Mini
                    label="To peak ahead"
                    value={fmtPct(peakGain, 0)}
                    tone={peakGain > 0 ? "green" : "red"}
                  />
                  <Mini
                    label={daysToPeak > 0 ? "Days to peak" : "Past peak"}
                    value={`${Math.abs(daysToPeak)}d`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="watermark">halving.lens · cycle analog</div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "green" | "red" | "neutral";
}) {
  const ToneIcon = tone === "green" ? ArrowUpRight : tone === "red" ? ArrowDownRight : null;
  const color =
    tone === "green" ? "text-signal-green" : tone === "red" ? "text-signal-red" : "text-ink-100";
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-400 mb-2">{label}</div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-display text-[28px] font-medium tracking-tight-2 tabular-nums leading-none ${color}`}
        >
          {value}
        </span>
        {ToneIcon && <ToneIcon size={16} className={color} />}
      </div>
      <div className="mt-2 text-[11.5px] text-ink-400 leading-relaxed">{sub}</div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div
        className={`mt-0.5 font-mono text-[12.5px] tabular-nums ${
          tone === "green"
            ? "text-signal-green"
            : tone === "red"
              ? "text-signal-red"
              : "text-ink-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
