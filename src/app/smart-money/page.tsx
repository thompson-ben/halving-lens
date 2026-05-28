import Link from "next/link";
import { ArrowUpRight, Trophy } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { SmartMoneyFeed } from "@/components/SmartMoneyFeed";
import { StatCard } from "@/components/StatCard";
import { ChainBadge } from "@/components/ChainBadge";
import { RECENT_TRADES, SMART_WALLETS } from "@/lib/mockData";
import { fmtNum, fmtPct, fmtUsd, shortAddr } from "@/lib/format";

export default function SmartMoneyPage() {
  const totalPnl30d = SMART_WALLETS.reduce((acc, w) => acc + w.pnl30d, 0);
  const avgWinRate = SMART_WALLETS.reduce((acc, w) => acc + w.winRate, 0) / SMART_WALLETS.length;
  const totalFollowers = SMART_WALLETS.reduce((acc, w) => acc + w.followers, 0);
  const trades30d = SMART_WALLETS.reduce((acc, w) => acc + w.trades30d, 0);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="Smart money"
        title="The wallets actually beating the market"
        subtitle="Wallets ranked by realised PnL and signal quality. Follow any one to get alerts the moment they move."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Cohort PnL 30d"
          value={fmtUsd(totalPnl30d, { compact: true, sign: true })}
          delta={{ value: 38.2 }}
          accent
        />
        <StatCard
          label="Avg win rate"
          value={fmtPct(avgWinRate * 100, 1, false)}
          hint="trades closed in profit"
        />
        <StatCard
          label="Trades 30d"
          value={fmtNum(trades30d)}
          hint="net new positions"
        />
        <StatCard
          label="Followers"
          value={fmtNum(totalFollowers)}
          delta={{ value: 4.1 }}
          hint="watching this cohort"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        <div className="card overflow-hidden min-w-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-accent" />
              <h2 className="text-[13.5px] font-medium text-ink-100">Leaderboard — 30d realised</h2>
            </div>
            <div className="text-[11px] text-ink-400">Updated 32s ago</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-[0.12em] text-ink-400 border-b border-white/5">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-2 py-3 font-medium">Wallet</th>
                  <th className="px-3 py-3 font-medium text-right">PnL 30d</th>
                  <th className="px-3 py-3 font-medium text-right">PnL all-time</th>
                  <th className="px-3 py-3 font-medium text-right">Win rate</th>
                  <th className="px-3 py-3 font-medium text-right">Trades</th>
                  <th className="px-3 py-3 font-medium">Best call</th>
                  <th className="px-3 py-3 font-medium text-right"></th>
                </tr>
              </thead>
              <tbody>
                {SMART_WALLETS.map((w, i) => (
                  <tr
                    key={w.address}
                    className="row-hover border-b border-white/[0.04] last:border-0"
                  >
                    <td className="px-4 py-3.5 text-ink-400 font-mono text-[12px]">{i + 1}</td>
                    <td className="px-2 py-3.5">
                      <Link
                        href={`/smart-money/${w.address}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/40 to-signal-violet/40 grid place-items-center text-[11px] font-semibold text-ink-950">
                          {(w.label ?? "0x")[0]}
                        </div>
                        <div>
                          <div className="font-medium text-ink-100 group-hover:text-accent transition-colors">
                            {w.label ?? shortAddr(w.address)}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <ChainBadge chain={w.chain} size="xs" />
                            <span className="text-[10.5px] text-ink-400 font-mono">
                              {shortAddr(w.address)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-signal-green">
                      {fmtUsd(w.pnl30d, { compact: true, sign: true })}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-ink-200">
                      {fmtUsd(w.pnlAllTime, { compact: true })}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <WinRateBar value={w.winRate} />
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-ink-300">
                      {w.trades30d}
                    </td>
                    <td className="px-3 py-3.5">
                      {w.bestCall && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-ink-200 text-[12.5px] font-medium">
                            {w.bestCall.symbol}
                          </span>
                          <span className="font-mono text-[11.5px] text-signal-green tabular-nums">
                            +{w.bestCall.returnPct}%
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <Link
                        href={`/smart-money/${w.address}`}
                        className="inline-flex items-center gap-1 text-[11.5px] text-accent hover:text-accent-soft"
                      >
                        Inspect
                        <ArrowUpRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <SmartMoneyFeed trades={RECENT_TRADES} title="Cohort tape — last 12h" />
      </div>
    </div>
  );
}

function WinRateBar({ value }: { value: number }) {
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <span className="font-mono text-[12.5px] text-ink-100 tabular-nums">
        {fmtPct(value * 100, 0, false)}
      </span>
      <div className="w-16 h-1 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-signal-violet"
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  );
}
