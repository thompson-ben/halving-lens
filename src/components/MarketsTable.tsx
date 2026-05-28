import Link from "next/link";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { ChainBadge } from "./ChainBadge";
import { ChangePill } from "./SignalBadge";
import { Sparkline } from "./Sparkline";
import { TokenIcon } from "./TokenIcon";
import { fmtPct, fmtUsd } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Token } from "@/lib/types";

export function MarketsTable({ tokens }: { tokens: Token[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10.5px] uppercase tracking-[0.12em] text-ink-400 border-b border-white/5">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-2 py-3 font-medium">Token</th>
              <th className="px-3 py-3 font-medium text-right">Price</th>
              <th className="px-3 py-3 font-medium text-right">1h</th>
              <th className="px-3 py-3 font-medium text-right">24h</th>
              <th className="px-3 py-3 font-medium text-right">7d</th>
              <th className="px-3 py-3 font-medium text-right">Market Cap</th>
              <th className="px-3 py-3 font-medium text-right">Volume</th>
              <th className="px-3 py-3 font-medium text-right">
                <span className="text-accent">Smart $</span> 24h
              </th>
              <th className="px-3 py-3 font-medium text-right">Holders Top 10</th>
              <th className="px-3 py-3 font-medium text-center">Insider</th>
              <th className="px-3 py-3 font-medium text-right">7d</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((t) => (
              <TokenRow key={`${t.chain}-${t.symbol}`} t={t} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TokenRow({ t }: { t: Token }) {
  const smartPositive = t.smartMoneyFlow24h >= 0;
  const concentrationTone =
    t.holderConcentrationTop10 > 0.5
      ? "text-signal-red"
      : t.holderConcentrationTop10 > 0.3
        ? "text-signal-amber"
        : "text-signal-green";

  return (
    <tr className="row-hover border-b border-white/[0.04] last:border-0">
      <td className="px-4 py-3.5 text-ink-400 font-mono text-[12px]">{t.rank}</td>
      <td className="px-2 py-3.5">
        <Link
          href={`/token/${t.symbol.toLowerCase()}`}
          className="flex items-center gap-3 group min-w-0"
        >
          <TokenIcon symbol={t.symbol} size={28} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-ink-100 group-hover:text-accent transition-colors">
                {t.name}
              </span>
              <span className="text-[11px] text-ink-400 font-mono">{t.symbol}</span>
            </div>
            <div className="mt-0.5">
              <ChainBadge chain={t.chain} size="xs" />
            </div>
          </div>
        </Link>
      </td>
      <td className="px-3 py-3.5 text-right font-mono tabular-nums text-ink-100">
        {fmtUsd(t.price)}
      </td>
      <td className="px-3 py-3.5 text-right">
        <ChangePill value={t.change1h} />
      </td>
      <td className="px-3 py-3.5 text-right">
        <ChangePill value={t.change24h} />
      </td>
      <td className="px-3 py-3.5 text-right">
        <ChangePill value={t.change7d} />
      </td>
      <td className="px-3 py-3.5 text-right font-mono tabular-nums text-ink-200 text-[12.5px]">
        {fmtUsd(t.marketCap, { compact: true })}
      </td>
      <td className="px-3 py-3.5 text-right font-mono tabular-nums text-ink-300 text-[12.5px]">
        {fmtUsd(t.volume24h, { compact: true })}
      </td>
      <td className="px-3 py-3.5 text-right">
        <div
          className={cn(
            "inline-flex items-center gap-1 font-mono text-[12.5px] tabular-nums",
            smartPositive ? "text-signal-green" : "text-signal-red",
          )}
        >
          {smartPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {fmtUsd(t.smartMoneyFlow24h, { compact: true, sign: true })}
        </div>
        <div className="text-[10.5px] text-ink-400 mt-0.5">{t.smartMoneyHolders} wallets</div>
      </td>
      <td className="px-3 py-3.5 text-right">
        <div className={cn("font-mono text-[12.5px] tabular-nums", concentrationTone)}>
          {fmtPct(t.holderConcentrationTop10 * 100, 1, false)}
        </div>
        <ConcentrationBar value={t.holderConcentrationTop10} />
      </td>
      <td className="px-3 py-3.5 text-center">
        <InsiderBadge state={t.insider} />
      </td>
      <td className="px-3 py-3.5 text-right">
        <div className="inline-block">
          <Sparkline data={t.spark7d} width={88} height={28} positive={t.change7d >= 0} />
        </div>
      </td>
    </tr>
  );
}

function ConcentrationBar({ value }: { value: number }) {
  const tone =
    value > 0.5 ? "bg-signal-red" : value > 0.3 ? "bg-signal-amber" : "bg-signal-green";
  return (
    <div className="mt-1 ml-auto w-16 h-1 rounded-full bg-white/[0.04] overflow-hidden">
      <div className={cn("h-full", tone)} style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

function InsiderBadge({ state }: { state: Token["insider"] }) {
  if (state === "accumulating")
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-signal-green/20 bg-signal-green/10 text-signal-green text-[10.5px] uppercase tracking-wider">
        <TrendingUp size={10} /> Accum
      </span>
    );
  if (state === "distributing")
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-signal-red/20 bg-signal-red/10 text-signal-red text-[10.5px] uppercase tracking-wider">
        <TrendingDown size={10} /> Distrib
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-white/5 bg-white/[0.02] text-ink-400 text-[10.5px] uppercase tracking-wider">
      <Minus size={10} /> Quiet
    </span>
  );
}
