import { SectionHeader } from "@/components/SectionHeader";
import { SmartMoneyFeed } from "@/components/SmartMoneyFeed";
import { StatCard } from "@/components/StatCard";
import { ChainBadge } from "@/components/ChainBadge";
import { TokenIcon } from "@/components/TokenIcon";
import { ChangePill } from "@/components/SignalBadge";
import { RECENT_TRADES, TOKENS } from "@/lib/mockData";
import { fmtUsd } from "@/lib/format";

export default function FlowsPage() {
  const buyVol = RECENT_TRADES.filter((t) => t.side === "buy").reduce((a, t) => a + t.amountUsd, 0);
  const sellVol = RECENT_TRADES.filter((t) => t.side === "sell").reduce((a, t) => a + t.amountUsd, 0);

  // Hot tokens — sorted by 24h volume.
  const hot = [...TOKENS].sort((a, b) => b.volume24h - a.volume24h).slice(0, 6);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="DEX flow"
        title="Live tape across every chain we index"
        subtitle="Every swap above $50k from labeled wallets — filtered to remove MEV, sandwich bots, and known liquidity ops."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Buy volume 12h" value={fmtUsd(buyVol, { compact: true })} accent />
        <StatCard label="Sell volume 12h" value={fmtUsd(sellVol, { compact: true })} />
        <StatCard
          label="Net flow"
          value={fmtUsd(buyVol - sellVol, { compact: true, sign: true })}
          delta={{ value: buyVol > sellVol ? 14.2 : -14.2 }}
        />
        <StatCard label="Trades indexed" value={RECENT_TRADES.length.toLocaleString()} hint="last 12h" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
        <SmartMoneyFeed trades={RECENT_TRADES} title="Live tape" />

        <div className="card p-5">
          <h3 className="text-[13.5px] font-medium text-ink-100">Hot pairs · 24h</h3>
          <p className="mt-1 text-[11.5px] text-ink-400">
            Ranked by volume — chain-native, not aggregator-padded.
          </p>
          <ul className="mt-4 space-y-3">
            {hot.map((t, i) => (
              <li key={t.symbol} className="flex items-center gap-3">
                <span className="w-5 text-[11px] text-ink-400 font-mono text-right">{i + 1}</span>
                <TokenIcon symbol={t.symbol} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-ink-100">{t.symbol}</span>
                    <ChainBadge chain={t.chain} size="xs" />
                  </div>
                  <div className="text-[10.5px] text-ink-400 font-mono">
                    {fmtUsd(t.volume24h, { compact: true })} vol
                  </div>
                </div>
                <ChangePill value={t.change24h} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
