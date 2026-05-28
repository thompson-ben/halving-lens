import { CycleOverlayChart } from "@/components/CycleOverlayChart";
import { CYCLES } from "@/lib/btcData";
import { fmtPct, fmtUsd } from "@/lib/format";
import { format } from "date-fns";

export default function CyclesPage() {
  return (
    <div className="space-y-14">
      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-4">
          4-cycle overlay
        </div>
        <h1 className="font-display text-[40px] lg:text-[52px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Every halving cycle, aligned to day zero.
        </h1>
        <p className="mt-5 text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          Pick any metric and see how the current cycle stacks against the prior three at the same
          day from halving. This view doesn't exist anywhere free.
        </p>
      </header>

      <div className="card p-7 lg:p-8 relative">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100">
              Price · normalised to halving = 1×
            </h2>
            <div className="text-[11.5px] text-ink-400 mt-1">
              Log Y-axis. X = days since each halving.
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            {["Price (USD)", "Normalised (×)", "Drawdown"].map((p, i) => (
              <button
                key={p}
                className={`px-3 py-1.5 rounded-md border ${
                  i === 1
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "border-white/[0.04] bg-white/[0.015] text-ink-350 hover:text-ink-100 hover:border-white/10"
                } transition-colors`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <CycleOverlayChart mode="normalized" height={460} />
        <div className="watermark">halving.lens · normalised price</div>
      </div>

      <section>
        <h2 className="font-display text-[22px] font-medium tracking-tight-2 text-ink-100 mb-5">
          Cycle-by-cycle stats
        </h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-ink-400 border-b border-white/[0.04]">
                <th className="px-5 py-4 font-medium">Cycle</th>
                <th className="px-3 py-4 font-medium">Halving</th>
                <th className="px-3 py-4 font-medium text-right">Reward</th>
                <th className="px-3 py-4 font-medium text-right">At halving</th>
                <th className="px-3 py-4 font-medium text-right">Peak</th>
                <th className="px-3 py-4 font-medium text-right">Peak gain</th>
                <th className="px-3 py-4 font-medium text-right">Days to peak</th>
                <th className="px-3 py-4 font-medium text-right">Drawdown</th>
              </tr>
            </thead>
            <tbody>
              {CYCLES.map((c) => {
                const peakGain = (c.peakPrice / c.samples[0].price - 1) * 100;
                const drawdown = (c.troughPrice / c.peakPrice - 1) * 100;
                const isCurrent = c.id === 5;
                return (
                  <tr key={c.id} className="row-hover border-b border-white/[0.03] last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ background: c.color }}
                        />
                        <span
                          className={`font-medium text-[13px] ${isCurrent ? "text-accent" : "text-ink-100"}`}
                        >
                          {c.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[9.5px] text-accent uppercase tracking-[0.18em]">
                            current
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-ink-300 font-mono text-[12px]">
                      {format(new Date(c.halvingDate), "MMM d, yyyy")}
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-ink-200">
                      {c.rewardBtc} BTC
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-ink-200">
                      {fmtUsd(c.samples[0].price, { compact: true })}
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-ink-100">
                      {fmtUsd(c.peakPrice, { compact: true })}
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-signal-green">
                      {fmtPct(peakGain, 0)}
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-ink-200">
                      {c.peakDay}d
                    </td>
                    <td className="px-3 py-4 text-right font-mono tabular-nums text-signal-red">
                      {fmtPct(drawdown, 0)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-7">
          <h3 className="font-display text-[18px] font-medium text-ink-100 tracking-tight-2 mb-2">
            The diminishing returns thesis
          </h3>
          <p className="text-[12.5px] text-ink-300 leading-relaxed">
            Every cycle's peak gain has shrunk: cycle 2 did 92×, cycle 3 did 30×, cycle 4 did 7.8×.
            The base case for cycle 5, extrapolating that decay, is roughly 3–4× from the halving
            price — $200k–260k. Where we are today vs. that path is on the overlay above.
          </p>
        </div>
        <div className="card p-7">
          <h3 className="font-display text-[18px] font-medium text-ink-100 tracking-tight-2 mb-2">
            The supercycle thesis
          </h3>
          <p className="text-[12.5px] text-ink-300 leading-relaxed">
            Spot ETFs absorbed ~5% of supply within a year of approval. If that demand stays
            structural, the historical drawdown pattern (80–85% from peak) gets cut — supply is
            held in custody by Larry Fink, not on Binance ready to dump. The flat metric profile
            of cycle 5 is the chief evidence.
          </p>
        </div>
      </section>
    </div>
  );
}
