import { MarketsTable } from "@/components/MarketsTable";
import { SectionHeader } from "@/components/SectionHeader";
import { SmartMoneyFeed } from "@/components/SmartMoneyFeed";
import { StatCard } from "@/components/StatCard";
import { RECENT_TRADES, TOKENS } from "@/lib/mockData";
import { fmtUsd } from "@/lib/format";
import { Crown, Eye, Flame, Waves } from "lucide-react";

export default function MarketsPage() {
  const smartNet = TOKENS.reduce((acc, t) => acc + t.smartMoneyFlow24h, 0);
  const exchangeNet = TOKENS.reduce((acc, t) => acc + t.netExchangeFlow24h, 0);
  const accumulating = TOKENS.filter((t) => t.insider === "accumulating").length;
  const distributing = TOKENS.filter((t) => t.insider === "distributing").length;
  const totalMcap = TOKENS.reduce((acc, t) => acc + t.marketCap, 0);

  return (
    <div className="space-y-8">
      <SectionHeader
        eyebrow="On-chain markets"
        title="Markets, with the chain in plain sight"
        subtitle="Every CoinGecko column you know, plus the on-chain signals you actually trade on — smart money flow, holder concentration, insider activity."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tracked market cap"
          value={fmtUsd(totalMcap, { compact: true })}
          hint="across 6 chains"
          icon={<Waves size={12} className="text-accent" />}
        />
        <StatCard
          label="Smart money 24h"
          value={fmtUsd(smartNet, { compact: true, sign: true })}
          delta={{ value: 12.4 }}
          hint="net flow from top 200 wallets"
          accent
          icon={<Crown size={12} className="text-accent" />}
        />
        <StatCard
          label="CEX net flow"
          value={fmtUsd(exchangeNet, { compact: true, sign: true })}
          hint={exchangeNet < 0 ? "outflows — bullish" : "inflows — bearish"}
          icon={<Flame size={12} className="text-accent" />}
        />
        <StatCard
          label="Insider activity"
          value={
            <span>
              {accumulating}
              <span className="text-ink-400 text-base"> / </span>
              {distributing}
            </span>
          }
          hint="accumulating / distributing"
          icon={<Eye size={12} className="text-accent" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-ink-200 uppercase tracking-[0.14em]">
              All markets
            </h2>
            <div className="flex items-center gap-2 text-[11.5px]">
              <FilterChip active>All</FilterChip>
              <FilterChip>Smart $ buying</FilterChip>
              <FilterChip>Insiders accumulating</FilterChip>
              <FilterChip>CEX outflow</FilterChip>
              <FilterChip>Fresh wallets</FilterChip>
            </div>
          </div>
          <MarketsTable tokens={TOKENS} />
        </div>

        <div className="space-y-6">
          <SmartMoneyFeed trades={RECENT_TRADES.slice(0, 6)} />

          <div className="card p-5">
            <h3 className="text-[13.5px] font-medium text-ink-100">Why this exists</h3>
            <p className="mt-2 text-[12.5px] text-ink-300 leading-relaxed">
              CoinGecko shows you what a token <em>did</em>. Chainglass shows you what wallets are{" "}
              <em>doing</em> right now — who&apos;s buying, who&apos;s rotating, where the supply
              actually sits.
            </p>
            <ul className="mt-3 space-y-2 text-[12.5px] text-ink-300">
              <li className="flex gap-2">
                <span className="text-accent">→</span>
                <span>
                  <span className="text-ink-100">Smart money tape</span> for every token, not just
                  the top 20.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent">→</span>
                <span>
                  <span className="text-ink-100">Holder x-ray</span> with insider, team, and fresh
                  wallet flags.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-accent">→</span>
                <span>
                  <span className="text-ink-100">Wallet profiles</span> you can follow, alert on,
                  and copy-watch.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      className={`px-2.5 py-1 rounded-md border text-[11px] transition-colors ${
        active
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-white/5 bg-white/[0.02] text-ink-300 hover:text-ink-100 hover:border-white/10"
      }`}
    >
      {children}
    </button>
  );
}
