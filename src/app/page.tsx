import Link from "next/link";
import { ArrowUpRight, Layers, Play } from "lucide-react";
import { CycleAnalog } from "@/components/CycleAnalog";
import { CycleClock } from "@/components/CycleClock";
import { CycleOverlayChart } from "@/components/CycleOverlayChart";
import { MetricCard } from "@/components/MetricCard";
import { CURRENT_CYCLE, TODAY } from "@/lib/btcData";
import { compositeCycleIndex, METRICS, piCycleStatus } from "@/lib/metrics";
import { fmtPct, fmtUsd } from "@/lib/format";

export default function CycleDashboardPage() {
  const cci = compositeCycleIndex();
  const pi = piCycleStatus();
  const cycle5GainFromHalving = ((TODAY.price / CURRENT_CYCLE.samples[0].price) - 1) * 100;

  return (
    <div className="space-y-16 lg:space-y-20">
      {/* Hero */}
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-5">
          Cycle 5 · day 770 of 1458
        </div>
        <h1 className="font-display text-[44px] lg:text-[60px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-4xl">
          The clearest view of the <span className="text-gradient-soft">Bitcoin cycle</span>.
        </h1>
        <p className="mt-6 text-[16px] lg:text-[17px] text-ink-300 max-w-2xl leading-relaxed">
          Every paid Bitcoin cycle chart, free — with halving-aligned overlays nobody else has.
          One read, one zone, one number for where the cycle actually is.
        </p>
      </header>

      {/* Cycle position — clock + composite index */}
      <section className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 lg:gap-7 items-stretch">
        <div className="card p-7 flex items-center justify-center relative">
          <CycleClock size={236} />
        </div>

        <div className="card-glow p-8 flex flex-col relative">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
                Composite cycle index
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-[72px] font-medium tracking-tightest text-gradient tabular-nums leading-none">
                  {cci.value}
                </span>
                <span className="text-[13px] text-ink-350">/ 100</span>
              </div>
              <div className="mt-2 text-[14px] text-ink-200">{cci.label}</div>
            </div>
            <div className="text-right text-[11.5px] text-ink-400 max-w-[240px] leading-relaxed hidden sm:block">
              Roll-up of MVRV-Z, NUPL, Mayer, Rainbow, Reserve Risk. Calibrated so every prior
              cycle peaked above 85.
            </div>
          </div>

          <div className="mt-auto">
            <div className="h-1.5 rounded-full bg-white/[0.035] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-signal-blue via-signal-green via-50% via-signal-amber to-signal-red opacity-70" />
            </div>
            <div className="relative h-0">
              <div
                className="absolute w-3 h-3 -mt-[22px] rounded-full bg-ink-50 ring-2 ring-ink-950"
                style={{
                  left: `calc(${cci.value}% - 6px)`,
                  boxShadow: "0 0 12px rgba(94,234,212,0.5)",
                }}
              />
            </div>
            <div className="mt-3 flex justify-between text-[10px] text-ink-400 font-mono tracking-wider">
              <span>0 · CAPITULATION</span>
              <span>50 · MID</span>
              <span>100 · TOP</span>
            </div>
          </div>

          <div className="mt-7 pt-6 border-t border-white/[0.04] grid grid-cols-3 gap-6">
            <Snippet label="BTC price" value={fmtUsd(TODAY.price)} />
            <Snippet
              label="Gain from halving"
              value={fmtPct(cycle5GainFromHalving, 1)}
              tone="green"
            />
            <Snippet
              label="Pi Cycle Top"
              value={pi.triggered ? "Triggered" : `${(pi.ratio * 100).toFixed(0)}%`}
              hint={pi.triggered ? "" : "of trigger"}
            />
          </div>
          <div className="watermark">halving.lens</div>
        </div>
      </section>

      {/* THE moat: today vs prior cycles intelligence */}
      <CycleAnalog />

      {/* 4-cycle overlay snapshot */}
      <section>
        <SectionHeader
          eyebrow="Cycle comparison"
          title="Every halving cycle, normalised to day zero"
          subtitle="Pick any metric and watch it draw across all four cycles on the same axis. The view that doesn't exist anywhere else free."
          link={{ href: "/cycles", label: "Open full overlay" }}
        />
        <div className="card p-7 relative">
          <CycleOverlayChart mode="normalized" height={360} />
          <div className="watermark">halving.lens · price · normalised</div>
        </div>
      </section>

      {/* Metric library teasers */}
      <section>
        <SectionHeader
          eyebrow="Metric library"
          title="Six oscillators · one read"
          subtitle="The metrics that have called every top and bottom — each with its full cycle history and zone interpretation."
          link={{ href: "/metrics", label: "Full library" }}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {METRICS.filter((m) => m.bands.length > 0)
            .slice(0, 6)
            .map((m) => (
              <MetricCard key={m.slug} metric={m} />
            ))}
        </div>
      </section>

      {/* Cycle Replay teaser */}
      <section>
        <Link
          href="/replay"
          className="card-glow p-8 lg:p-10 block hover:border-accent/30 transition-colors duration-300 group relative overflow-hidden"
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="max-w-2xl">
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">
                Signature feature
              </div>
              <h2 className="font-display text-[26px] lg:text-[32px] font-medium tracking-tight-2 text-ink-100 leading-tight">
                Scrub through every halving cycle.
                <br />
                <span className="text-ink-300">Watch the metrics evolve.</span>
              </h2>
              <p className="mt-4 text-[14px] text-ink-300 leading-relaxed">
                Drag the timeline. Every oscillator updates to where it sat on that exact day from
                halving. Compare cycles side-by-side at any point in their arc.
              </p>
            </div>
            <div className="flex items-center gap-3 text-accent group-hover:gap-4 transition-all duration-200">
              <Play size={18} fill="currentColor" />
              <span className="text-[13px] font-medium">Open Cycle Replay</span>
              <ArrowUpRight size={15} />
            </div>
          </div>
          <div className="watermark">halving.lens · replay</div>
        </Link>
      </section>
    </div>
  );
}

function Snippet({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "green" | "red";
  hint?: string;
}) {
  const color =
    tone === "green" ? "text-signal-green" : tone === "red" ? "text-signal-red" : "text-ink-100";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-mono text-[14px] tabular-nums ${color}`}>{value}</div>
      {hint && <div className="text-[10.5px] text-ink-400 mt-0.5">{hint}</div>}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  link,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-7">
      <div>
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">{eyebrow}</div>
        <h2 className="font-display text-[26px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          {title}
        </h2>
        <p className="mt-2.5 text-[13.5px] text-ink-300 max-w-xl">{subtitle}</p>
      </div>
      {link && (
        <Link
          href={link.href}
          className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft whitespace-nowrap"
        >
          {link.label} <ArrowUpRight size={13} />
        </Link>
      )}
    </div>
  );
}
