import Link from "next/link";
import { notFound } from "next/navigation";
import { Bell, Copy, ExternalLink } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { SmartMoneyFeed } from "@/components/SmartMoneyFeed";
import { StatCard } from "@/components/StatCard";
import { ChainBadge } from "@/components/ChainBadge";
import { TokenIcon } from "@/components/TokenIcon";
import { ChangePill } from "@/components/SignalBadge";
import { SMART_WALLETS, tradesByWallet } from "@/lib/mockData";
import { fmtNum, fmtPct, fmtUsd, shortAddr } from "@/lib/format";

export default function WalletPage({ params }: { params: { address: string } }) {
  const wallet = SMART_WALLETS.find((w) => w.address === params.address);
  if (!wallet) return notFound();

  const trades = tradesByWallet(wallet.address);
  const portfolioValue = wallet.portfolio.reduce((acc, p) => acc + p.valueUsd, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent/40 to-signal-violet/40 grid place-items-center text-lg font-semibold text-ink-950">
            {(wallet.label ?? "0x")[0]}
          </div>
          <div>
            <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-1">
              Smart money wallet
            </div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-100">
                {wallet.label ?? shortAddr(wallet.address)}
              </h1>
              <ChainBadge chain={wallet.chain} />
            </div>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-400 font-mono">
              {shortAddr(wallet.address, 6, 6)}
              <button
                type="button"
                className="text-ink-400 hover:text-accent transition-colors"
                aria-label="Copy address"
              >
                <Copy size={12} />
              </button>
              <Link
                href="#"
                className="text-ink-400 hover:text-accent transition-colors inline-flex items-center gap-1"
              >
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-9 px-3.5 rounded-lg border border-white/5 bg-white/[0.02] text-[12.5px] text-ink-200 hover:border-white/10 hover:text-ink-100 inline-flex items-center gap-1.5">
            <Bell size={13} /> Alert me
          </button>
          <button className="h-9 px-3.5 rounded-lg bg-accent text-ink-950 text-[12.5px] font-medium hover:bg-accent-soft inline-flex items-center gap-1.5">
            Follow wallet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="PnL 30d"
          value={fmtUsd(wallet.pnl30d, { compact: true, sign: true })}
          delta={{ value: 18.4 }}
          accent
        />
        <StatCard
          label="PnL all-time"
          value={fmtUsd(wallet.pnlAllTime, { compact: true })}
        />
        <StatCard
          label="Win rate"
          value={fmtPct(wallet.winRate * 100, 1, false)}
          hint={`${wallet.trades30d} trades, last 30d`}
        />
        <StatCard
          label="Followers"
          value={fmtNum(wallet.followers)}
          delta={{ value: 2.1 }}
          hint="alerts active"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h2 className="text-[13.5px] font-medium text-ink-100">Portfolio</h2>
              <div className="text-[12px] text-ink-300">
                <span className="font-mono text-ink-100">{fmtUsd(portfolioValue, { compact: true })}</span>
                <span className="text-ink-400 ml-1.5">on-chain value</span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-[0.12em] text-ink-400 border-b border-white/5">
                  <th className="px-5 py-3 font-medium">Token</th>
                  <th className="px-3 py-3 font-medium text-right">Value</th>
                  <th className="px-3 py-3 font-medium text-right">% of book</th>
                  <th className="px-3 py-3 font-medium text-right">Unrealised PnL</th>
                </tr>
              </thead>
              <tbody>
                {wallet.portfolio.map((p) => {
                  const weight = (p.valueUsd / portfolioValue) * 100;
                  return (
                    <tr key={p.symbol} className="row-hover border-b border-white/[0.04] last:border-0">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/token/${p.symbol.toLowerCase()}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <TokenIcon symbol={p.symbol} size={24} />
                          <span className="font-medium text-ink-100 group-hover:text-accent transition-colors">
                            {p.symbol}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono tabular-nums text-ink-100">
                        {fmtUsd(p.valueUsd, { compact: true })}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          <span className="font-mono text-[12.5px] text-ink-200 tabular-nums">
                            {weight.toFixed(1)}%
                          </span>
                          <div className="w-16 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                            <div className="h-full bg-accent" style={{ width: `${weight}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <ChangePill value={p.pnlPct} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <SmartMoneyFeed trades={trades} title="This wallet — recent moves" />
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h3 className="text-[13.5px] font-medium text-ink-100">Why this wallet matters</h3>
            <p className="mt-2 text-[12.5px] text-ink-300 leading-relaxed">
              Scored on realised PnL, entry timing vs. local lows, and risk-adjusted returns over
              rolling 30/90/365d windows. We filter out airdrop farmers, sandwich bots, and MEV.
            </p>
            <ul className="mt-3 space-y-2.5 text-[12.5px]">
              <li className="flex items-center justify-between">
                <span className="text-ink-400">Risk-adj. return (Sharpe-ish)</span>
                <span className="font-mono text-ink-100">2.41</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-ink-400">Median hold time</span>
                <span className="font-mono text-ink-100">9d 14h</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-ink-400">Avg position size</span>
                <span className="font-mono text-ink-100">$184k</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-ink-400">First seen on-chain</span>
                <span className="font-mono text-ink-100">2019-04-12</span>
              </li>
            </ul>
          </div>

          {wallet.bestCall && (
            <div className="card-glow p-5">
              <div className="text-[10.5px] uppercase tracking-[0.14em] text-accent">
                Best call (90d)
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TokenIcon symbol={wallet.bestCall.symbol} size={32} />
                  <div>
                    <div className="font-medium text-ink-100">{wallet.bestCall.symbol}</div>
                    <div className="text-[11px] text-ink-400">Entry 87d ago</div>
                  </div>
                </div>
                <div className="font-mono text-2xl font-semibold text-signal-green tabular-nums">
                  +{wallet.bestCall.returnPct}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
