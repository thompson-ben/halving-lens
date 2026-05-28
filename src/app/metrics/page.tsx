import { MetricCard } from "@/components/MetricCard";
import { METRICS } from "@/lib/metrics";

const GROUPS: Array<{ id: string; label: string; description: string }> = [
  {
    id: "valuation",
    label: "Valuation",
    description: "How richly priced the network is vs. the cost basis of every coin.",
  },
  {
    id: "behaviour",
    label: "Behaviour",
    description: "The collective state of mind of holders, as written into chain history.",
  },
  {
    id: "price",
    label: "Price models",
    description: "Pure-price oscillators that need no chain data.",
  },
  {
    id: "miner",
    label: "Miners",
    description: "Issuance pressure and miner profitability.",
  },
  {
    id: "cycle",
    label: "Cycle models",
    description: "Long-arc cycle gauges and trend bands.",
  },
];

export default function MetricsPage() {
  return (
    <div className="space-y-14">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">
          Metric library
        </div>
        <h1 className="font-display text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Every chart you'd pay for, free.
        </h1>
        <p className="mt-5 text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          Each metric ships with a 4-cycle overlay, the zones that have called every top and
          bottom, and a one-paragraph explanation written for humans.
        </p>
      </header>

      {GROUPS.map((g) => {
        const items = METRICS.filter((m) => m.group === g.id);
        if (items.length === 0) return null;
        return (
          <section key={g.id}>
            <div className="mb-6">
              <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">
                {g.label}
              </h2>
              <p className="text-[12.5px] text-ink-400 mt-1.5 max-w-xl">{g.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((m) => (
                <MetricCard key={m.slug} metric={m} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
