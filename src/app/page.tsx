import Link from "next/link";
import { ArrowRight, Layers, Sparkles } from "lucide-react";
import { CycleClock } from "@/components/CycleClock";
import { CycleOverlayChart } from "@/components/CycleOverlayChart";
import { MetricCard } from "@/components/MetricCard";
import { MetricGauge } from "@/components/MetricGauge";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import {
  comparativeSnapshot,
  CYCLES,
  CURRENT_CYCLE,
  TODAY,
  TODAY_DAY_IN_CYCLE,
} from "@/lib/btcData";
import { compositeCycleIndex, METRICS, piCycleStatus, zoneFor } from "@/lib/metrics";
import { fmtPct, fmtUsd } from "@/lib/format";

export default function CycleDashboardPage() {
  const cci = compositeCycleIndex();
  const pi = piCycleStatus();
  const comparisons = comparativeSnapshot();
  const cycle5GainFromHalving = ((TODAY.price / CURRENT_CYCLE.samples[0].price) - 1) * 100;

  return (
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Cycle 5 · day 770"
        title="Where are we in the Bitcoin cycle?"
        subtitle="Every chart Glassnode and CryptoQuant charge you for, free — with one feature they don't have: every metric overlaid across all four halving cycles, aligned to day zero."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-stretch">
        <div className="card p-6 flex flex-col items-center justify-center">
          <CycleClock size={220} />
        </div>

        <div className="card-glow p-6 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-1">
                Composite cycle index
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-5xl font-semibold text-gradient tabular-nums">
                  {cci.value}
                </span>
                <span className="text-[13px] text-ink-300">/ 100</span>
              </div>
              <div className="mt-1 text-[13.5px] text-ink-200">{cci.label}</div>
            </div>
            <div className="text-right text-[11px] text-ink-400 max-w-[220px] leading-relaxed">
              Roll-up of MVRV-Z, NUPL, Mayer, Rainbow, and Reserve Risk into a single read.
              Calibrated so every prior cycle peaked above 85.
            </div>
          </div>

          <div className="mt-2">
            <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-signal-blue via-signal-green via-50% via-signal-amber to-signal-red opacity-70" />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-ink-400 font-mono">
              <span>0 · capitulation</span>
              <span>50 · mid-cycle</span>
              <span>100 · top</span>
            </div>
            <div className="relative h-0">
              <div
                className="absolute w-3 h-3 -mt-[26px] rounded-full bg-ink-100 ring-2 ring-ink-950 shadow-glow"
                style={{ left: `calc(${cci.value}% - 6px)` }}
              />
            </div>
          </div>

          <div className="mt-auto pt-6 grid grid-cols-3 gap-4 text-[12px]">
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-ink-400">BTC price</div>
              <div className="font-mono text-ink-100 mt-0.5 tabular-nums">{fmtUsd(TODAY.price)}</div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-ink-400">Gain from halving</div>
              <div className="font-mono text-signal-green mt-0.5 tabular-nums">
                {fmtPct(cycle5GainFromHalving, 1)}
              </div>
            </div>
            <div>
              <div className="text-[10.5px] uppercase tracking-wider text-ink-400">Pi Cycle Top</div>
              <div className="font-mono mt-0.5 tabular-nums">
                {pi.triggered ? (
                  <span className="text-signal-red">Triggered</span>
                ) : (
                  <span className="text-ink-100">
                    {(pi.ratio * 100).toFixed(0)}% of trigger
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-1.5">
              Cycle comparison
            </div>
            <h2 className="font-display text-xl font-semibold text-ink-100 tracking-tight">
              Where each prior cycle sat at the same day from halving
            </h2>
            <p className="mt-1.5 text-[13px] text-ink-300">
              Every cycle gets weaker — but every cycle also goes much higher than people expect.
            </p>
          </div>
          <Link
            href="/cycles"
            className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft"
          >
            Open the full overlay <ArrowRight size={13} />
          </Link>
        </div>

        <div className="card p-5">
          <CycleOverlayChart mode="normalized" height={360} />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {comparisons.map(({ cycle, sample, gainFromHalving, gainToCyclePeak, daysFromHereToPeak }) => (
            <div key={cycle.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: cycle.color }}
                />
                <span className="text-[12.5px] font-medium text-ink-100">{cycle.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 text-[11.5px]">
                <Snap label="At day 770" value={fmtUsd(sample.price, { compact: true })} />
                <Snap
                  label="Gain from halving"
                  value={fmtPct(gainFromHalving, 0)}
                  tone={gainFromHalving > 0 ? "green" : "red"}
                />
                <Snap
                  label="Cycle peak"
                  value={fmtUsd(cycle.peakPrice, { compact: true })}
                />
                <Snap
                  label={daysFromHereToPeak > 0 ? "Days to peak" : "Days past peak"}
                  value={`${Math.abs(daysFromHereToPeak)}d`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-1.5">
              The cycle right now
            </div>
            <h2 className="font-display text-xl font-semibold text-ink-100 tracking-tight">
              Six oscillators · one read
            </h2>
            <p className="mt-1.5 text-[13px] text-ink-300">
              The metrics that have called every top and bottom. Each gauge shows the zone the
              current value sits in. <span className="text-ink-400">Click any to open the full chart with cycle overlay.</span>
            </p>
          </div>
          <Link
            href="/metrics"
            className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft"
          >
            Metric library <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {METRICS.map((m) => (
            <MetricCard key={m.slug} metric={m} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-accent" />
            <h3 className="text-[13.5px] font-medium text-ink-100">What's free here</h3>
          </div>
          <p className="text-[12.5px] text-ink-300 leading-relaxed">
            Every metric on this site is gated elsewhere — typically behind a Glassnode Advanced
            ($39+/mo) or CryptoQuant Professional plan ($29+/mo). The free tiers strip the cycle
            overlays, alerts, and historical depth that make the metrics actually useful.
          </p>
          <ul className="mt-4 space-y-2.5 text-[12.5px] text-ink-300">
            {[
              "MVRV, MVRV-Z, NUPL, Reserve Risk, Mayer, Puell, Rainbow — full history",
              "Multi-cycle overlay on every metric, not just price",
              "HODL Waves, Supply by Age, Cost-Basis Distribution",
              "Hash Ribbons, Difficulty Ribbon, Miner Outflows",
              "Spot ETF flows, Coinbase Premium, Stablecoin SSR",
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-accent shrink-0">→</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Layers size={14} className="text-accent" />
            <h3 className="text-[13.5px] font-medium text-ink-100">Cycle 5 vs prior cycles</h3>
          </div>
          <p className="text-[12.5px] text-ink-300 leading-relaxed">
            By every standard oscillator, cycle 5 is still <span className="text-ink-100">cooler</span> at day 770 than cycles 3 and 4 were at the same day — which has fuelled both
            the "supercycle" and the "we already topped" camps. Make up your own mind:
          </p>
          <div className="mt-4 space-y-3.5">
            {METRICS.slice(0, 4).map((m) => {
              const v = m.pick(TODAY);
              return (
                <div key={m.slug}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <span className="text-ink-300">{m.name}</span>
                    <span className="font-mono text-ink-100 tabular-nums">
                      {v.toFixed(m.decimals)} <span className="text-ink-400">{m.unit}</span>
                    </span>
                  </div>
                  <MetricGauge metric={m} value={v} height={6} />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function Snap({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div
        className={`mt-0.5 font-mono tabular-nums ${tone === "green" ? "text-signal-green" : tone === "red" ? "text-signal-red" : "text-ink-100"}`}
      >
        {value}
      </div>
    </div>
  );
}
