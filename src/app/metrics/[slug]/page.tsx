import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CycleOverlayChart } from "@/components/CycleOverlayChart";
import { MetricChart } from "@/components/MetricChart";
import { MetricGauge } from "@/components/MetricGauge";
import { METRICS, metricBySlug, valueAtDay, zoneFor } from "@/lib/metrics";
import { CYCLES, TODAY, TODAY_DAY_IN_CYCLE } from "@/lib/btcData";
import { comingSoonReason, metricSource, metricStatus, STATUS_LABEL } from "@/lib/cycleIntel";
import { fmtUsd } from "@/lib/format";

export function generateStaticParams() {
  return METRICS.map((m) => ({ slug: m.slug }));
}

export default function MetricPage({ params }: { params: { slug: string } }) {
  const metric = metricBySlug(params.slug);
  if (!metric) return notFound();

  // Coming-soon metrics depend on data we don't have live. Never render their
  // synthetic charts/values as if they were real — show an honest explainer.
  if (metricStatus(metric.slug) === "coming-soon") {
    return (
      <div className="space-y-10">
        <div>
          <Link
            href="/metrics"
            className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-accent transition-colors"
          >
            <ArrowLeft size={12} /> Metric library
          </Link>
        </div>

        <header className="space-y-4">
          <span className="inline-block px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.03] text-ink-400 text-[10px] font-medium tracking-wide uppercase">
            Coming soon
          </span>
          <h1 className="font-display text-[40px] lg:text-[56px] font-medium tracking-tightest text-ink-50 leading-[1.05]">
            {metric.name}
          </h1>
          <p className="text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">{metric.description}</p>
        </header>

        <div className="card p-7 lg:p-8 space-y-6 max-w-2xl">
          <Block title="Why does it matter?">{metric.why}</Block>
          <Block title="Why it isn't live yet">{comingSoonReason(metric.slug)}</Block>
          <div className="pt-5 border-t border-white/[0.04] grid grid-cols-2 gap-5 text-[12.5px]">
            <div>
              <div className="text-ink-400 uppercase tracking-[0.16em] text-[10px]">Status</div>
              <div className="text-ink-200 mt-1">Coming soon</div>
            </div>
            <div>
              <div className="text-ink-400 uppercase tracking-[0.16em] text-[10px]">When live</div>
              <div className="text-ink-200 mt-1">{metric.paidAt}</div>
            </div>
          </div>
        </div>

        <p className="text-[13px] text-ink-400 max-w-2xl leading-relaxed">
          We won&apos;t show estimated or modelled numbers for this metric as if they were real. It
          will switch on automatically here once a live data source is connected.
        </p>
      </div>
    );
  }

  const status = metricStatus(metric.slug);
  const current = metric.pick(TODAY);
  const { zone, label } = zoneFor(metric, current);
  const display =
    metric.unit === "$" ? fmtUsd(current, { compact: true }) : current.toFixed(metric.decimals);

  const crossCycle = CYCLES.filter((c) => c.id !== 5).map((c) => ({
    cycle: c,
    value: valueAtDay(c, metric, TODAY_DAY_IN_CYCLE),
  }));

  return (
    <div className="space-y-12">
      <div>
        <Link
          href="/metrics"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-accent transition-colors"
        >
          <ArrowLeft size={12} /> Metric library
        </Link>
      </div>

      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-0.5 rounded-full border border-signal-green/25 bg-signal-green/10 text-signal-green text-[10px] font-medium tracking-wide uppercase">
            {STATUS_LABEL[status]}
          </span>
          <span className="text-[11px] text-ink-400">{metricSource(metric.slug)}</span>
        </div>
        <h1 className="font-display text-[44px] lg:text-[58px] font-medium tracking-tightest text-ink-50 leading-[1.05]">
          {metric.name}
        </h1>
        <p className="text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          {metric.description}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        <div className="card p-7 lg:p-8 relative">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-[18px] font-medium tracking-tight-2 text-ink-100">
                Cycle 5 · with zones
              </h2>
              <div className="text-[11.5px] text-ink-400 mt-1">
                Current cycle, full history since the 2024 halving.
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-ink-350">
              {["7d", "1m", "3m", "1y", "Cycle", "All"].map((p) => (
                <button
                  key={p}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    p === "Cycle"
                      ? "bg-white/[0.06] text-ink-100"
                      : "hover:text-ink-200 hover:bg-white/[0.02]"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <MetricChart metricSlug={metric.slug} height={360} />
          <div className="watermark">halving.lens · {metric.short.toLowerCase()}</div>
        </div>

        <div className="space-y-5">
          <div className="card-glow p-6 relative">
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-2">
              Current reading
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[48px] font-medium tracking-tightest text-ink-50 tabular-nums leading-none">
                {display}
              </span>
              <span className="text-[12px] text-ink-400">
                {metric.unit === "$" ? "" : metric.unit}
              </span>
            </div>
            <div className="mt-3 text-[13px] text-ink-200">{label}</div>
            {metric.bands.length > 0 && (
              <div className="mt-5">
                <MetricGauge metric={metric} value={current} />
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-[12.5px] font-medium text-ink-100 mb-2 uppercase tracking-[0.16em]">
              Why this matters
            </h3>
            <p className="text-[13px] text-ink-300 leading-relaxed">{metric.why}</p>
          </div>

          {metric.bands.length > 0 && (
            <div className="card p-6">
              <h3 className="text-[12.5px] font-medium text-ink-100 mb-4 uppercase tracking-[0.16em]">
                Zones
              </h3>
              <ul className="space-y-2.5">
                {metric.bands.map((b) => (
                  <li
                    key={b.label}
                    className="flex items-center justify-between text-[12px]"
                  >
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
          )}
        </div>
      </div>

      <section>
        <div className="mb-6">
          <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
            4-cycle overlay
          </div>
          <h2 className="font-display text-[26px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100">
            {metric.name} across every halving cycle
          </h2>
          <p className="mt-2.5 text-[13.5px] text-ink-300 max-w-2xl">
            Aligned to day zero of each halving. The dashed line is today, day{" "}
            {TODAY_DAY_IN_CYCLE}.
          </p>
        </div>
        <div className="card p-7 lg:p-8 relative">
          <CycleOverlayChart metricSlug={metric.slug} mode="metric" height={420} />
          <div className="watermark">halving.lens · {metric.short.toLowerCase()} · overlay</div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100 mb-6">
          Where each cycle sat at day {TODAY_DAY_IN_CYCLE}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {crossCycle.map(({ cycle, value }) => {
            const z = zoneFor(metric, value);
            const v =
              metric.unit === "$" ? fmtUsd(value, { compact: true }) : value.toFixed(metric.decimals);
            return (
              <div key={cycle.id} className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: cycle.color }}
                  />
                  <span className="text-[12.5px] font-medium text-ink-100">{cycle.label}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[34px] font-medium tracking-tight-2 text-ink-100 tabular-nums leading-none">
                    {v}
                  </span>
                  <span className="text-[11px] text-ink-400">
                    {metric.unit === "$" ? "" : metric.unit}
                  </span>
                </div>
                <div className="text-[12px] text-ink-300 mt-1.5">{z.label}</div>
                {metric.bands.length > 0 && (
                  <div className="mt-4">
                    <MetricGauge metric={metric} value={value} height={6} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="card-glow p-6 mt-5 relative">
          <div className="flex items-baseline justify-between">
            <span className="text-[12.5px] text-ink-300">Today · cycle 5</span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-[34px] font-medium tracking-tight-2 text-accent tabular-nums leading-none">
                {display}
              </span>
              <span className="text-[11px] text-ink-400">
                {metric.unit === "$" ? "" : metric.unit}
              </span>
            </div>
          </div>
          {metric.bands.length > 0 && (
            <div className="mt-4">
              <MetricGauge metric={metric} value={current} height={8} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[12.5px] font-medium text-ink-100 mb-2 uppercase tracking-[0.16em]">
        {title}
      </h3>
      <p className="text-[13.5px] text-ink-300 leading-relaxed">{children}</p>
    </div>
  );
}
