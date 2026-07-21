import { MetricCard } from "@/components/MetricCard";
import { METRICS } from "@/lib/metrics";
import { metricStatus } from "@/lib/cycleIntel";

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
