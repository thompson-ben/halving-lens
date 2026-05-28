import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell, Share2 } from "lucide-react";
import { CycleOverlayChart } from "@/components/CycleOverlayChart";
import { MetricChart } from "@/components/MetricChart";
import { MetricGauge } from "@/components/MetricGauge";
import { StatCard } from "@/components/StatCard";
import { METRICS, metricBySlug, valueAtDay, zoneFor } from "@/lib/metrics";
import { CYCLES, TODAY, TODAY_DAY_IN_CYCLE } from "@/lib/btcData";

export function generateStaticParams() {
  return METRICS.map((m) => ({ slug: m.slug }));
}

export default function MetricPage({ params }: { params: { slug: string } }) {
  const metric = metricBySlug(params.slug);
  if (!metric) return notFound();

  const current = metric.pick(TODAY);
  const { zone, label } = zoneFor(metric, current);

  // Cross-cycle comparison at same day.
  const crossCycle = CYCLES.filter((c) => c.id !== 5).map((c) => ({
    cycle: c,
    value: valueAtDay(c, metric, TODAY_DAY_IN_CYCLE),
  }));

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/metrics"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-accent transition-colors"
        >
          <ArrowLeft size={12} /> Metric library
        </Link>
      </div>

      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-1">
            {metric.group} · {metric.paidAt}
          </div>
          <h1 className="font-display text-3xl font-semibold text-ink-100 tracking-tight">
            {metric.name}
          </h1>
          <p className="mt-2 text-[14px] text-ink-300 max-w-2xl leading-relaxed">
            {metric.description}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-lg border border-white/5 bg-white/[0.02] text-[12.5px] text-ink-200 hover:border-white/10 inline-flex items-center gap-1.5">
            <Bell size={13} /> Alert me
          </button>
          <button className="h-9 px-3 rounded-lg border border-white/5 bg-white/[0.02] text-[12.5px] text-ink-200 hover:border-white/10 inline-flex items-center gap-1.5">
            <Share2 size={13} /> Share
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-medium text-ink-100">Current cycle · with zones</h2>
            <div className="flex items-center gap-1 text-[11px] text-ink-400">
              {["7d", "1m", "3m", "1y", "Cycle", "All"].map((p) => (
                <button
                  key={p}
                  className={`px-2 py-1 rounded ${p === "Cycle" ? "bg-white/[0.06] text-ink-100" : "hover:text-ink-200"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <MetricChart metricSlug={metric.slug} height={340} />
        </div>

        <div className="space-y-4">
          <div className="card-glow p-5">
            <div className="text-[10.5px] uppercase tracking-[0.14em] text-accent mb-1">
              Current reading
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-semibold text-ink-100 tabular-nums">
                {current.toFixed(metric.decimals)}
              </span>
              <span className="text-[12px] text-ink-400">{metric.unit}</span>
            </div>
            <div className="mt-3 text-[13px] text-ink-200">{label}</div>
            <div className="mt-4">
              <MetricGauge metric={metric} value={current} />
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-[13px] font-medium text-ink-100 mb-2">Why this matters</h3>
            <p className="text-[12.5px] text-ink-300 leading-relaxed">{metric.why}</p>
          </div>

          <div className="card p-5">
            <h3 className="text-[13px] font-medium text-ink-100 mb-3">Zones</h3>
            <ul className="space-y-2">
              {metric.bands.map((b) => (
                <li key={b.label} className="flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background:
                          b.zone === "bottom"
                            ? "#5aa9ff"
                            : b.zone === "accumulation"
                              ? "#3ddc97"
                              : b.zone === "neutral"
                                ? "#586475"
                                : b.zone === "bullish"
                                  ? "#5eead4"
                                  : b.zone === "euphoria"
                                    ? "#f5b942"
                                    : "#ff5d5d",
                      }}
                    />
                    <span className="text-ink-200">{b.label}</span>
                  </span>
                  <span className="font-mono text-ink-400 text-[11.5px] tabular-nums">
                    {b.min === -Infinity ? "—" : b.min.toFixed(metric.decimals)} →{" "}
                    {b.max === Infinity ? "—" : b.max.toFixed(metric.decimals)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-4">
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-1.5">
            4-cycle overlay
          </div>
          <h2 className="font-display text-xl font-semibold text-ink-100 tracking-tight">
            {metric.name} across every halving cycle
          </h2>
          <p className="mt-1.5 text-[13px] text-ink-300">
            Aligned to day zero of each halving. The dashed line is today (day {TODAY_DAY_IN_CYCLE}).
          </p>
        </div>
        <div className="card p-5">
          <CycleOverlayChart metricSlug={metric.slug} mode="metric" height={400} />
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-medium text-ink-100 mb-4">
          Where each cycle sat at day {TODAY_DAY_IN_CYCLE}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {crossCycle.map(({ cycle, value }) => {
            const z = zoneFor(metric, value);
            return (
              <div key={cycle.id} className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: cycle.color }}
                  />
                  <span className="text-[12.5px] font-medium text-ink-100">{cycle.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-3xl font-semibold text-ink-100 tabular-nums">
                    {value.toFixed(metric.decimals)}
                  </span>
                  <span className="text-[11px] text-ink-400">{metric.unit}</span>
                </div>
                <div className="text-[12px] text-ink-300 mt-1">{z.label}</div>
                <div className="mt-3">
                  <MetricGauge metric={metric} value={value} height={6} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="card p-5 mt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] text-ink-300">Today (cycle 5)</span>
            <span className="font-mono text-2xl text-accent tabular-nums">
              {current.toFixed(metric.decimals)}{" "}
              <span className="text-ink-400 text-sm">{metric.unit}</span>
            </span>
          </div>
          <div className="mt-3">
            <MetricGauge metric={metric} value={current} height={8} />
          </div>
        </div>
      </section>
    </div>
  );
}
