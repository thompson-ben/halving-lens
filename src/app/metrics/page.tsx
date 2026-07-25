import { MetricCard } from "@/components/MetricCard";
import Link from "next/link";
import { METRICS } from "@/lib/metrics";
import { metricStatus } from "@/lib/cycleIntel";
import { DataBadge } from "@/components/DataBadge";
import { productionCostRead } from "@/lib/productionCost";
import { fmtUsd } from "@/lib/format";

const DESC =
  "Every major Bitcoin cycle and valuation metric — MVRV Z-Score, Mayer Multiple, Puell Multiple, Reserve Risk and more — aligned to halving day zero. Free.";
export const metadata = {
  title: { absolute: "Bitcoin Cycle Metrics Library | HalvingLens" },
  description: DESC,
  alternates: { canonical: "/metrics" },
  openGraph: { title: "Bitcoin Cycle Metrics Library", description: DESC, url: "/metrics", type: "website" },
  twitter: { card: "summary_large_image", title: "Bitcoin Cycle Metrics Library", description: DESC },
};

export default function MetricsPage() {
  const live = METRICS.filter((m) => metricStatus(m.slug) !== "coming-soon");
  const comingSoon = METRICS.filter((m) => metricStatus(m.slug) === "coming-soon");
  const prod = productionCostRead();

  return (
    <div className="space-y-14">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">
          Metric library
        </div>
        <h1 className="font-display text-[36px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          The signals behind the cycle.
        </h1>
        <p className="mt-5 text-[15px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          We only show metrics we can calculate from live data. The rest are listed transparently
          as coming soon — they&apos;ll switch on automatically once a live on-chain data source is
          connected.
        </p>
      </header>

      <section>
        <div className="mb-6">
          <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">
            Available now
          </h2>
          <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-xl">
            Derived from live Bitcoin price — real values, updated with each daily sync.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {live.map((m) => (
            <MetricCard key={m.slug} metric={m} />
          ))}
        </div>
      </section>

      {/* Estimated — documented assumptions applied to observed network data,
          shown with the ESTIMATED badge (currently: Estimated Mining Cost). */}
      <section>
        <div className="mb-6">
          <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">
            Estimated
          </h2>
          <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-xl">
            Calculated from documented assumptions and observed network data — historical context
            rather than an exact observable value, and always labelled as such.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <Link href="/metrics/estimated-mining-cost" className="card card-interactive p-6 block">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[15px] font-medium text-ink-100">Estimated Mining Cost</span>
              <DataBadge status={prod.available ? "modelled" : "coming-soon"} size="sm" />
            </div>
            <p className="mt-2 text-[12.5px] text-ink-400 leading-relaxed">
              A modelled estimate of the electricity cost to mine one new Bitcoin — the third
              reference price, alongside Market Price and Realised Price.
            </p>
            {prod.available && prod.central != null && (
              <div className="mt-4 font-display text-[26px] tabular-nums text-ink-50">
                {fmtUsd(prod.central, { compact: true })}
              </div>
            )}
          </Link>
        </div>
      </section>

      {comingSoon.length > 0 && (
        <section>
          <div className="mb-6">
            <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-300">
              Coming soon
            </h2>
            <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-xl">
              Advanced on-chain metrics that need a live cost-basis data source. We won&apos;t show
              estimated numbers as if they were real.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {comingSoon.map((m) => (
              <MetricCard key={m.slug} metric={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
