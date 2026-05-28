import { CycleOverlayChart } from "@/components/CycleOverlayChart";
import { SectionHeader } from "@/components/SectionHeader";
import { StatCard } from "@/components/StatCard";
import { CYCLES, TODAY_DAY_IN_CYCLE } from "@/lib/btcData";
import { fmtPct, fmtUsd } from "@/lib/format";
import { format } from "date-fns";

export default function CyclesPage() {
  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="4-cycle overlay"
        title="Every halving cycle, aligned to day zero"
        subtitle="Pick any metric and see how the current cycle stacks against the prior three at the same day from halving. This view doesn't exist anywhere free."
      />

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-[14px] font-medium text-ink-100">Price · normalised to halving = 1×</h2>
            <div className="text-[11.5px] text-ink-400 mt-0.5">
              Log Y-axis. X = days since each cycle's halving.
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            {["Price (USD)", "Normalised (×)", "Drawdown"].map((p, i) => (
              <button
                key={p}
                className={`px-2.5 py-1 rounded-md border ${
                  i === 1
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "border-white/5 bg-white/[0.02] text-ink-300 hover:text-ink-100"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <CycleOverlayChart mode="normalized" height={420} />
      </div>

      <div>
        <h2 className="text-[14px] font-medium text-ink-100 mb-4">
          Cycle-by-cycle stats
        </h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.12em] text-ink-400 border-b border-white/5">
                <th className="px-4 py-3 font-medium">Cycle</th>
                <th className="px-3 py-3 font-medium">Halving date</th>
                <th className="px-3 py-3 font-medium text-right">Reward</th>
                <th className="px-3 py-3 font-medium text-right">Price at halving</th>
                <th className="px-3 py-3 font-medium text-right">Peak price</th>
                <th className="px-3 py-3 font-medium text-right">Peak gain</th>
                <th className="px-3 py-3 font-medium text-right">Days to peak</th>
                <th className="px-3 py-3 font-medium text-right">Drawdown</th>
              </tr>
            </thead>
            <tbody>
              {CYCLES.map((c) => {
                const peakGain = (c.peakPrice / c.samples[0].price - 1) * 100;
                const drawdown = (c.troughPrice / c.peakPrice - 1) * 100;
                const isCurrent = c.id === 5;
                return (
                  <tr
                    key={c.id}
                    className="row-hover border-b border-white/[0.04] last:border-0"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ background: c.color }}
                        />
                        <span
                          className={`font-medium text-[13px] ${isCurrent ? "text-accent" : "text-ink-100"}`}
                        >
                          {c.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] text-accent uppercase tracking-wider">
                            current
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-ink-300 font-mono text-[12.5px]">
                      {format(new Date(c.halvingDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-ink-200">
                      {c.rewardBtc} BTC
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-ink-200">
                      {fmtUsd(c.samples[0].price, { compact: true })}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-ink-100">
                      {fmtUsd(c.peakPrice, { compact: true })}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-signal-green">
                      {fmtPct(peakGain, 0)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-ink-200">
                      {c.peakDay}d
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-signal-red">
                      {fmtPct(drawdown, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-[13.5px] font-medium text-ink-100 mb-1">The "diminishing returns" thesis</h3>
          <p className="text-[12.5px] text-ink-300 leading-relaxed">
            Every cycle's peak gain has shrunk: cycle 2 did 92×, cycle 3 did 30×, cycle 4 did 7.8×.
            The base case for cycle 5 — extrapolating that decay — is roughly 3-4× from the halving
            price, which would land BTC at $200–260k. Where we are today vs. that path is on the
            overlay above.
          </p>
        </div>
        <div className="card p-5">
          <h3 className="text-[13.5px] font-medium text-ink-100 mb-1">The "supercycle" thesis</h3>
          <p className="text-[12.5px] text-ink-300 leading-relaxed">
            Spot ETFs absorbed ~5% of supply within a year of approval. If that demand stays
            structural, the historical drawdown pattern (80–85% from peak) gets cut — supply is
            held in custody by Larry Fink, not on Binance ready to dump. The flat metric profile
            of cycle 5 is the chief evidence.
          </p>
        </div>
      </div>
    </div>
  );
}
