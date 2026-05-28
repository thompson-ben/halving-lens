import { MetricCard } from "@/components/MetricCard";
import { SectionHeader } from "@/components/SectionHeader";
import { METRICS } from "@/lib/metrics";

const GROUPS: Array<{ id: string; label: string; description: string }> = [
  {
    id: "valuation",
    label: "Valuation",
    description: "How richly is the network priced vs the cost basis of every coin?",
  },
  {
    id: "behaviour",
    label: "Behaviour",
    description: "What is the collective state of mind of holders?",
  },
  {
    id: "price",
    label: "Price models",
    description: "Pure-price oscillators that don't need any chain data.",
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
    <div className="space-y-10">
      <SectionHeader
        eyebrow="Metric library"
        title="Every chart you'd pay for, free"
        subtitle="Each metric ships with a 4-cycle overlay, the zones that have called every top and bottom, and a one-paragraph 'why this matters' written for humans."
      />

      {GROUPS.map((g) => {
        const items = METRICS.filter((m) => m.group === g.id);
        if (items.length === 0) return null;
        return (
          <section key={g.id}>
            <div className="mb-4">
              <h2 className="text-[15px] font-medium text-ink-100">{g.label}</h2>
              <p className="text-[12.5px] text-ink-400 mt-0.5">{g.description}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
