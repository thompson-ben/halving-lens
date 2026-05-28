import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { ChainBadge } from "./ChainBadge";
import { TokenIcon } from "./TokenIcon";
import { fmtUsd, shortAddr, timeAgo } from "@/lib/format";
import type { OnchainTrade } from "@/lib/types";

export function SmartMoneyFeed({
  trades,
  title = "Smart money — live tape",
  showHeader = true,
}: {
  trades: OnchainTrade[];
  title?: string;
  showHeader?: boolean;
}) {
  return (
    <div className="card overflow-hidden">
      {showHeader && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <span className="relative w-1.5 h-1.5 rounded-full bg-accent text-accent live-dot" />
            <h3 className="text-[13.5px] font-medium text-ink-100">{title}</h3>
          </div>
          <div className="text-[11px] text-ink-400">Last 12h · top 200 wallets</div>
        </div>
      )}
      <ul className="divide-y divide-white/[0.04]">
        {trades.map((t) => (
          <TradeRow key={t.id} t={t} />
        ))}
      </ul>
    </div>
  );
}

function TradeRow({ t }: { t: OnchainTrade }) {
  const isBuy = t.side === "buy";
  return (
    <li className="row-hover px-5 py-3.5 flex items-center gap-4">
      <div
        className={`shrink-0 w-8 h-8 rounded-full grid place-items-center ${
          isBuy ? "bg-signal-green/10 text-signal-green" : "bg-signal-red/10 text-signal-red"
        }`}
      >
        {isBuy ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[13px]">
          <Link
            href={`/smart-money/${t.walletAddress}`}
            className="font-medium text-ink-100 hover:text-accent transition-colors truncate"
          >
            {t.walletLabel ?? shortAddr(t.walletAddress)}
          </Link>
          <span className={isBuy ? "text-signal-green" : "text-signal-red"}>
            {isBuy ? "bought" : "sold"}
          </span>
          <Link
            href={`/token/${t.tokenSymbol.toLowerCase()}`}
            className="inline-flex items-center gap-1.5 hover:text-accent transition-colors"
          >
            <TokenIcon symbol={t.tokenSymbol} size={16} />
            <span className="font-medium text-ink-100">{t.tokenSymbol}</span>
          </Link>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-400">
          <ChainBadge chain={t.chain} size="xs" />
          <span>·</span>
          <span>{timeAgo(t.timestamp)}</span>
          <span>·</span>
          <span className="font-mono">impact {t.priceImpactPct.toFixed(2)}%</span>
        </div>
      </div>

      <div className="text-right">
        <div className="font-mono text-[13.5px] text-ink-100 tabular-nums">
          {fmtUsd(t.amountUsd, { compact: true })}
        </div>
        <div className="font-mono text-[10.5px] text-ink-400 tabular-nums">
          {t.tokens.toLocaleString(undefined, { maximumFractionDigits: 0 })} {t.tokenSymbol}
        </div>
      </div>
    </li>
  );
}
