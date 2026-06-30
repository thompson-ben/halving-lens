import { simulateThreeWay, DISTRIBUTION_PRESETS, type DistributionPresetKey } from "@/lib/accumulationDca";
import { fmtUsd } from "@/lib/format";

// Live evidence table for HL-R001. Recomputes from the engine over Bitcoin's
// full weekly history at build time, so the published figures can never drift
// from the live Accumulation Index tool. Server component — no interactivity.

const SCENARIO_LABEL = {
  standard: "Standard DCA",
  dynamic: "Dynamic DCA",
  distribute: "Dynamic DCA + Distribution",
} as const;

const PRESET_KEYS: DistributionPresetKey[] = ["conservative", "balanced", "aggressive"];

export function DcaThreeWayEvidence({ presetKey = "balanced" as DistributionPresetKey }: { presetKey?: DistributionPresetKey }) {
  const cfg = DISTRIBUTION_PRESETS[presetKey];
  const sim = simulateThreeWay({ standardWeekly: 100, buyByBand: cfg.buy, targetSellPct: cfg.sell });
  const rows = [sim.standard, sim.dynamic, sim.distribute];
  const maxVal = Math.max(...rows.map((r) => r.valuePerThousand)) || 1;

  // Winner per preset, to support the "across every preset" claim honestly.
  const acrossPresets = PRESET_KEYS.map((k) => {
    const c = DISTRIBUTION_PRESETS[k];
    const s = simulateThreeWay({ standardWeekly: 100, buyByBand: c.buy, targetSellPct: c.sell });
    return { key: k, label: c.label, bestKey: s.bestKey };
  });
  const allDynamic = acrossPresets.every((p) => p.bestKey === "dynamic");

  return (
    <div className="not-prose">
      <div className="text-[11px] text-ink-500 mb-3">
        {cfg.label} preset · {sim.from} → {sim.to} · {sim.weeks} weeks · per $1,000 of new money contributed · evidence as of {sim.to}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] min-w-[520px]">
          <thead>
            <tr className="text-ink-500 text-[10.5px] uppercase tracking-[0.12em]">
              <th className="text-left font-normal pb-2">Strategy</th>
              <th className="text-right font-normal pb-2">Your money</th>
              <th className="text-right font-normal pb-2">Bitcoin</th>
              <th className="text-right font-normal pb-2">End value</th>
              <th className="text-right font-normal pb-2">Per $1k</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isWinner = r.key === sim.bestKey;
              return (
                <tr key={r.key} className={`border-t border-white/[0.06] ${isWinner ? "bg-accent/[0.06]" : ""}`}>
                  <td className="py-2.5">
                    <span className={isWinner ? "text-ink-50 font-medium" : "text-ink-200"}>{SCENARIO_LABEL[r.key]}</span>
                    {isWinner && <span className="ml-2 text-[10px] uppercase tracking-wide text-accent">· most growth</span>}
                  </td>
                  <td className="py-2.5 text-right font-mono text-ink-300">{fmtUsd(r.investedNew, { compact: true })}</td>
                  <td className="py-2.5 text-right font-mono text-ink-100">{r.btc.toFixed(2)}</td>
                  <td className="py-2.5 text-right font-mono text-ink-100">{fmtUsd(r.endValue, { compact: true })}</td>
                  <td className={`py-2.5 text-right font-mono ${isWinner ? "text-accent font-medium" : "text-ink-100"}`}>
                    {fmtUsd(Math.round(r.valuePerThousand), { compact: true })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Value-per-$1k bars */}
      <div className="mt-5 space-y-2.5">
        {rows.map((r) => {
          const pct = Math.round((r.valuePerThousand / maxVal) * 100);
          const isWinner = r.key === sim.bestKey;
          return (
            <div key={r.key} className="flex items-center gap-3 text-[12px]">
              <div className="w-44 shrink-0 text-ink-300">{SCENARIO_LABEL[r.key]}</div>
              <div className="flex-1 h-2.5 rounded-full bg-white/[0.05] overflow-hidden">
                <div className={`h-full rounded-full ${isWinner ? "bg-accent" : "bg-ink-600"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="w-20 text-right font-mono text-ink-200">{fmtUsd(Math.round(r.valuePerThousand), { compact: true })}</div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-[12.5px] text-ink-300 leading-relaxed">
        Distribution trimmed in overheated conditions, set aside {sim.taxRatePct}% of each realised gain for tax, and
        reinvested <span className="text-ink-100">{fmtUsd(sim.distribute.reinvested, { compact: true })}</span> of profit
        on later dips — recovering its position to <span className="text-ink-100">{sim.distribute.btcRetainedPct}%</span> of
        the buy-only Bitcoin stack. {allDynamic
          ? "Across all three intensity presets tested (Conservative, Balanced, Aggressive), Dynamic DCA retained the most value per dollar of new money."
          : `Across the presets tested, the leading rule was: ${acrossPresets
              .map((p) => `${p.label} → ${SCENARIO_LABEL[p.bestKey]}`)
              .join("; ")}.`}
      </p>
    </div>
  );
}
