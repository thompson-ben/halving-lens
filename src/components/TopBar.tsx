import { Search, ChevronDown } from "lucide-react";

export function TopBar() {
  return (
    <header className="h-16 border-b border-white/5 bg-ink-950/60 backdrop-blur sticky top-0 z-10">
      <div className="h-full px-6 lg:px-10 flex items-center gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search tokens, wallets (0x…), ENS, or contract address"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-ink-850 border border-white/5 text-[13px] text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-accent/40 focus:bg-ink-800 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <ChainPill />
          <MarketChip label="BTC" value="$97,842" change={-1.82} />
          <MarketChip label="ETH" value="$3,421" change={-2.31} />
          <MarketChip label="SOL" value="$184.22" change={3.18} />
          <div className="hidden lg:flex items-center gap-2 pl-3 ml-1 border-l border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/40 to-violet-glow/40 grid place-items-center text-[11px] font-semibold text-ink-950">
              BT
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function ChainPill() {
  return (
    <button
      type="button"
      className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-lg bg-ink-850 border border-white/5 text-[12.5px] text-ink-200 hover:border-accent/30 hover:text-ink-100 transition-colors"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
      All chains
      <ChevronDown size={13} className="text-ink-400" />
    </button>
  );
}

function MarketChip({ label, value, change }: { label: string; value: string; change: number }) {
  const positive = change >= 0;
  return (
    <div className="hidden xl:flex items-center gap-2 h-9 px-3 rounded-lg bg-ink-850/60 border border-white/5">
      <span className="text-[10.5px] uppercase tracking-widest text-ink-400">{label}</span>
      <span className="font-mono text-[12px] text-ink-100">{value}</span>
      <span
        className={`font-mono text-[11px] ${positive ? "text-signal-green" : "text-signal-red"}`}
      >
        {positive ? "+" : ""}
        {change.toFixed(2)}%
      </span>
    </div>
  );
}
