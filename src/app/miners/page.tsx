import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MetricChart } from "@/components/MetricChart";
import { DataBadge } from "@/components/DataBadge";
import { LastUpdated } from "@/components/LastUpdated";
import { halvingStats } from "@/lib/halvingStats";
import { metricBySlug, zoneFor } from "@/lib/metrics";
import { SPOT, TODAY } from "@/lib/btcData";
import { fmtUsd } from "@/lib/format";

export const metadata = {
  title: "Bitcoin Miners",
  description:
    "Who secures the Bitcoin network and what it costs them — hashrate, issuance and miner economics in historical context.",
  alternates: { canonical: "/miners" },
};

export default function MinersPage() {
  const stats = halvingStats();
  const price = SPOT?.price ?? TODAY.price;
  const dailyRevenue = stats.dailyIssuance * price;
  const annualRevenue = dailyRevenue * 365;

  const puell = metricBySlug("puell-multiple");
  const puellValue = puell ? puell.pick(TODAY) : null;
  const puellZone = puell && puellValue != null ? zoneFor(puell, puellValue) : null;

  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">Miners</span>
          <DataBadge status="live-derived" />
        </div>
        <h1 className="font-display text-[34px] sm:text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Who secures the network — and what it costs them.
        </h1>
        <p className="mt-5 text-[15px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          Miners spend real money on hardware and electricity to add blocks. Their revenue is the
          new BTC they earn — which the halving cuts in half — so mining economics quietly shape
          how much selling pressure hits the market across the cycle.
        </p>
        <div className="mt-3">
          <LastUpdated />
        </div>
      </header>

      {/* Mining economics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Fact
          label="Network hashrate"
          value={stats.hashrateEHs != null ? stats.hashrateEHs.toFixed(0) : "—"}
          unit={stats.hashrateEHs != null ? "EH/s" : undefined}
          sub={stats.hashrateEHs != null ? "24h average — the security budget" : "syncing"}
        />
        <Fact
          label="Block reward"
          value={`${stats.currentReward}`}
          unit="BTC"
          sub={`→ ${stats.nextReward} at next halving`}
        />
        <Fact
          label="New BTC / day"
          value={`${Math.round(stats.dailyIssuance)}`}
          unit="BTC"
          sub="total miner issuance"
        />
        <Fact
          label="Miner revenue / day"
          value={fmtUsd(dailyRevenue, { compact: true })}
          sub={`≈ ${fmtUsd(annualRevenue, { compact: true })} / yr from issuance`}
        />
      </section>

      {/* Puell Multiple — the miner-revenue cycle signal */}
      <section>
        <div className="mb-5 flex items-end justify-between gap-3 flex-wrap">
          <div className="max-w-2xl">
            <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100">
              Puell Multiple — are miners over- or under-paid?
            </h2>
            <p className="text-[13px] text-ink-300 mt-2 leading-relaxed">
              Daily miner revenue divided by its 365-day average. High readings mean miners are
              earning far more than usual (historically late-cycle); low readings mean revenue is
              squeezed (historically near lows).
            </p>
          </div>
          {puellValue != null && puellZone && (
            <div className="text-right shrink-0">
              <div className="font-display text-[32px] font-medium tracking-tight-2 text-ink-50 tabular-nums leading-none">
                {puellValue.toFixed(2)}
              </div>
              <div className="text-[12px] text-ink-300 mt-1">{puellZone.label}</div>
            </div>
          )}
        </div>
        <div className="card p-4 sm:p-7 relative">
          <MetricChart
            metricSlug="puell-multiple"
            height={340}
            title="Puell Multiple · cycle 5"
            subtitle="Current cycle since the 2024 halving — use the range buttons to zoom in."
          />
          <div className="watermark">halvinglens.com · puell multiple</div>
        </div>
        <Link
          href="/metrics/puell-multiple"
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft"
        >
          Full Puell Multiple page <ArrowUpRight size={14} />
        </Link>
      </section>

      {/* Honest coming-soon */}
      <section className="card p-6 lg:p-7">
        <h3 className="text-[12.5px] font-medium text-ink-100 mb-2 uppercase tracking-[0.16em]">
          More miner data coming
        </h3>
        <p className="text-[13px] text-ink-300 leading-relaxed max-w-2xl">
          Hash ribbons (hashrate moving averages), miner reserves and difficulty history need a
          historical hashrate / on-chain miner source we haven&apos;t wired yet. We show the live
          hashrate snapshot and the Puell Multiple now, and will switch the rest on once a source is
          connected — no estimated figures in the meantime.
        </p>
      </section>
    </div>
  );
}

function Fact({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className="mt-1.5 font-mono text-[16px] text-ink-100 tabular-nums leading-tight">
        {value}
        {unit && <span className="text-[11px] text-ink-400 ml-1">{unit}</span>}
      </div>
      {sub && <div className="text-[10.5px] text-ink-500 mt-1 leading-snug">{sub}</div>}
    </div>
  );
}
