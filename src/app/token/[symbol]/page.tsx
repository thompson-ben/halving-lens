import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Eye, Star, TrendingUp } from "lucide-react";
import { ChainBadge } from "@/components/ChainBadge";
import { ChangePill, SignalBadge } from "@/components/SignalBadge";
import { HolderDistribution } from "@/components/HolderDistribution";
import { SectionHeader } from "@/components/SectionHeader";
import { SmartMoneyFeed } from "@/components/SmartMoneyFeed";
import { Sparkline } from "@/components/Sparkline";
import { StatCard } from "@/components/StatCard";
import { TokenIcon } from "@/components/TokenIcon";
import { holderDistribution, TOKENS, tradesByToken } from "@/lib/mockData";
import { fmtNum, fmtPct, fmtUsd } from "@/lib/format";

export default function TokenPage({ params }: { params: { symbol: string } }) {
  const token = TOKENS.find((t) => t.symbol.toLowerCase() === params.symbol.toLowerCase());
  if (!token) return notFound();

  const trades = tradesByToken(token.symbol);
  const buckets = holderDistribution(token.symbol);
  const smartPositive = token.smartMoneyFlow24h >= 0;
  const flowPositive = token.netExchangeFlow24h <= 0; // outflows = bullish

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex items-center gap-4">
          <TokenIcon symbol={token.symbol} size={56} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-100">
                {token.name}
              </h1>
              <span className="text-ink-400 font-mono text-base">{token.symbol}</span>
              <ChainBadge chain={token.chain} />
              <SignalBadge tone="muted">#{token.rank}</SignalBadge>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-display text-3xl font-semibold text-ink-100 tabular-nums">
                {fmtUsd(token.price)}
              </span>
              <ChangePill value={token.change24h} className="text-[13.5px]" />
              <span className="text-[11.5px] text-ink-400">24h</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-9 px-3 rounded-lg border border-white/5 bg-white/[0.02] text-[12.5px] text-ink-200 hover:border-white/10 inline-flex items-center gap-1.5">
            <Star size={13} /> Watch
          </button>
          <button className="h-9 px-3 rounded-lg border border-white/5 bg-white/[0.02] text-[12.5px] text-ink-200 hover:border-white/10 inline-flex items-center gap-1.5">
            <Eye size={13} /> Alert
          </button>
          <button className="h-9 px-3.5 rounded-lg bg-accent text-ink-950 text-[12.5px] font-medium hover:bg-accent-soft">
            Trade on DEX
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Market cap" value={fmtUsd(token.marketCap, { compact: true })} />
        <StatCard label="24h volume" value={fmtUsd(token.volume24h, { compact: true })} />
        <StatCard label="FDV" value={fmtUsd(token.fdv, { compact: true })} />
        <StatCard
          label="7d"
          value={<ChangePill value={token.change7d} className="text-2xl" />}
        />
        <StatCard label="1h" value={<ChangePill value={token.change1h} className="text-2xl" />} />
      </div>

      <SectionHeader
        eyebrow="On-chain x-ray"
        title="What wallets are actually doing"
        subtitle="The view CoinGecko doesn't show you — net smart-money flow, where the supply sits, and which side of the order book the chain leans on."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          accent
          label="Smart money 24h"
          value={fmtUsd(token.smartMoneyFlow24h, { compact: true, sign: true })}
          delta={{ value: smartPositive ? 18.4 : -8.1 }}
          hint={`${token.smartMoneyHolders} top wallets holding`}
          icon={smartPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        />
        <StatCard
          label="CEX net flow"
          value={fmtUsd(token.netExchangeFlow24h, { compact: true, sign: true })}
          hint={flowPositive ? "outflows — bullish" : "inflows — bearish"}
        />
        <StatCard
          label="Top 10 concentration"
          value={fmtPct(token.holderConcentrationTop10 * 100, 1, false)}
          hint={token.holderConcentrationTop10 > 0.5 ? "high — caution" : "healthy distribution"}
        />
        <StatCard
          label="Fresh wallets 24h"
          value={fmtPct(token.freshWalletsPct * 100, 1, false)}
          hint={token.freshWalletsPct > 0.1 ? "retail rotating in" : "veteran-dominated"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <PriceChart token={token} />
          <HolderDistribution buckets={buckets} />
          {trades.length > 0 && (
            <SmartMoneyFeed trades={trades} title={`Smart money on ${token.symbol}`} />
          )}
        </div>

        <div className="space-y-6">
          <SignalScorecard token={token} />
          <RelatedSignals token={token} />
        </div>
      </div>
    </div>
  );
}

function PriceChart({ token }: { token: ReturnType<typeof TOKENS.find> }) {
  if (!token) return null;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[13.5px] font-medium text-ink-100">Price · 7d</h3>
          <div className="text-[11px] text-ink-400 mt-0.5">overlaid with smart-money flow</div>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          {["1H", "24H", "7D", "30D", "1Y", "All"].map((p) => (
            <button
              key={p}
              className={`px-2 py-1 rounded ${p === "7D" ? "bg-white/[0.06] text-ink-100" : "text-ink-400 hover:text-ink-200"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="h-52 flex items-end">
        <div className="w-full h-full relative">
          <Sparkline
            data={token.spark7d}
            width={1000}
            height={208}
            positive={token.change7d >= 0}
          />
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between text-[10px] text-ink-400 font-mono py-1">
            <div className="text-right pr-1">{fmtUsd(Math.max(...token.spark7d))}</div>
            <div className="text-right pr-1">{fmtUsd(Math.min(...token.spark7d))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignalScorecard({ token }: { token: ReturnType<typeof TOKENS.find> }) {
  if (!token) return null;
  const accumulating = token.insider === "accumulating";
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13.5px] font-medium text-ink-100">Chainglass signals</h3>
        <SignalBadge tone={accumulating ? "green" : token.insider === "distributing" ? "red" : "muted"}>
          {token.insider}
        </SignalBadge>
      </div>
      <ul className="space-y-3 text-[12.5px]">
        <SignalRow
          label="Smart money flow"
          value={fmtUsd(token.smartMoneyFlow24h, { compact: true, sign: true })}
          tone={token.smartMoneyFlow24h > 0 ? "green" : "red"}
        />
        <SignalRow
          label="CEX outflow (24h)"
          value={fmtUsd(-token.netExchangeFlow24h, { compact: true })}
          tone={token.netExchangeFlow24h <= 0 ? "green" : "red"}
        />
        <SignalRow
          label="Holder concentration"
          value={fmtPct(token.holderConcentrationTop10 * 100, 1, false)}
          tone={
            token.holderConcentrationTop10 > 0.5
              ? "red"
              : token.holderConcentrationTop10 > 0.3
                ? "amber"
                : "green"
          }
        />
        <SignalRow
          label="Fresh wallets %"
          value={fmtPct(token.freshWalletsPct * 100, 1, false)}
          tone={token.freshWalletsPct > 0.15 ? "amber" : "green"}
        />
        <SignalRow
          label="Smart wallets holding"
          value={fmtNum(token.smartMoneyHolders)}
          tone={token.smartMoneyHolders > 100 ? "green" : "muted"}
        />
      </ul>
      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-[11px] text-ink-400 uppercase tracking-wider">Composite score</span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xl font-semibold text-gradient">
            {compositeScore(token)}
          </span>
          <span className="text-[11px] text-ink-400">/100</span>
        </div>
      </div>
    </div>
  );
}

function SignalRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "red" | "amber" | "muted";
}) {
  const dot =
    tone === "green"
      ? "bg-signal-green"
      : tone === "red"
        ? "bg-signal-red"
        : tone === "amber"
          ? "bg-signal-amber"
          : "bg-ink-400";
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-ink-300">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {label}
      </span>
      <span className="font-mono text-ink-100 tabular-nums">{value}</span>
    </li>
  );
}

function compositeScore(token: ReturnType<typeof TOKENS.find>): number {
  if (!token) return 0;
  let s = 50;
  s += Math.min(20, Math.max(-20, token.smartMoneyFlow24h / 5_000_000));
  s += token.netExchangeFlow24h < 0 ? 8 : -8;
  s -= (token.holderConcentrationTop10 - 0.3) * 30;
  s += token.insider === "accumulating" ? 6 : token.insider === "distributing" ? -6 : 0;
  return Math.round(Math.max(1, Math.min(99, s)));
}

function RelatedSignals({ token }: { token: ReturnType<typeof TOKENS.find> }) {
  if (!token) return null;
  return (
    <div className="card p-5">
      <h3 className="text-[13.5px] font-medium text-ink-100 flex items-center gap-2">
        <TrendingUp size={14} className="text-accent" />
        Related plays
      </h3>
      <p className="mt-1 text-[11.5px] text-ink-400">
        Tokens the same smart wallets are also buying.
      </p>
      <ul className="mt-3 space-y-2.5">
        {TOKENS.filter((x) => x.symbol !== token.symbol && x.smartMoneyFlow24h > 0)
          .slice(0, 4)
          .map((rel) => (
            <li key={rel.symbol} className="flex items-center gap-3">
              <TokenIcon symbol={rel.symbol} size={24} />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium text-ink-100">{rel.symbol}</div>
                <div className="text-[10.5px] text-ink-400">{rel.name}</div>
              </div>
              <ChangePill value={rel.change24h} />
            </li>
          ))}
      </ul>
    </div>
  );
}
