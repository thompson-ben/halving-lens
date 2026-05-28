import { Bell, Search } from "lucide-react";
import { TODAY, CURRENT_CYCLE, TODAY_DAY_IN_CYCLE, DAYS_TO_NEXT_HALVING } from "@/lib/btcData";
import { compositeCycleIndex } from "@/lib/metrics";
import { fmtUsd } from "@/lib/format";

const ZONE_DOT: Record<string, string> = {
  bottom: "bg-signal-blue",
  accumulation: "bg-signal-green",
  neutral: "bg-ink-300",
  bullish: "bg-signal-green",
  euphoria: "bg-signal-amber",
  top: "bg-signal-red",
};

export function TopBar() {
  const cci = compositeCycleIndex();
  const change24h = -1.82; // mock — would come from price feed
  const priorPrice = CURRENT_CYCLE.samples[CURRENT_CYCLE.samples.length - 2]?.price ?? TODAY.price;
  const weekChange = ((TODAY.price - priorPrice) / priorPrice) * 100;

  return (
    <header className="h-16 border-b border-white/5 bg-ink-950/60 backdrop-blur sticky top-0 z-10">
      <div className="h-full px-6 lg:px-10 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Jump to metric — MVRV, NUPL, Pi Cycle…"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-ink-850 border border-white/5 text-[13px] text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-accent/40 focus:bg-ink-800 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <TickerChip
            label="BTC"
            value={fmtUsd(TODAY.price)}
            change={change24h}
            sub="24h"
          />
          <TickerChip
            label="Cycle 5"
            value={`Day ${TODAY_DAY_IN_CYCLE}`}
            sub={`${DAYS_TO_NEXT_HALVING}d to halving`}
          />
          <div className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-lg bg-ink-850/60 border border-white/5">
            <span className={`w-1.5 h-1.5 rounded-full ${ZONE_DOT[cci.zone]}`} />
            <span className="text-[10.5px] uppercase tracking-widest text-ink-400">CCI</span>
            <span className="font-mono text-[12px] text-ink-100">{cci.value}</span>
            <span className="text-[11px] text-ink-300">{cci.label}</span>
          </div>
          <button
            type="button"
            aria-label="Alerts"
            className="hidden md:grid place-items-center w-9 h-9 rounded-lg border border-white/5 bg-ink-850 text-ink-300 hover:text-ink-100 hover:border-white/10"
          >
            <Bell size={14} />
          </button>
          <div className="hidden lg:flex items-center gap-2 pl-3 ml-1 border-l border-white/5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/40 to-signal-violet/40 grid place-items-center text-[11px] font-semibold text-ink-950">
              BT
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function TickerChip({
  label,
  value,
  change,
  sub,
}: {
  label: string;
  value: string;
  change?: number;
  sub?: string;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg bg-ink-850/60 border border-white/5">
      <span className="text-[10.5px] uppercase tracking-widest text-ink-400">{label}</span>
      <span className="font-mono text-[12px] text-ink-100">{value}</span>
      {change !== undefined ? (
        <span
          className={`font-mono text-[11px] ${positive ? "text-signal-green" : "text-signal-red"}`}
        >
          {positive ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      ) : sub ? (
        <span className="text-[11px] text-ink-400">{sub}</span>
      ) : null}
    </div>
  );
}
