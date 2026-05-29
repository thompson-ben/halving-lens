import { Search } from "lucide-react";
import { SOURCE, TODAY, TODAY_DAY_IN_CYCLE, DAYS_TO_NEXT_HALVING } from "@/lib/btcData";
import { cyclePhase, recentChange } from "@/lib/cycleIntel";
import { fmtPct, fmtUsd } from "@/lib/format";
import { MobileNav } from "./MobileNav";

const PHASE_DOT: Record<string, string> = {
  blue: "bg-signal-blue",
  green: "bg-signal-green",
  teal: "bg-accent",
  amber: "bg-signal-amber",
  red: "bg-signal-red",
};

export function TopBar() {
  const phase = cyclePhase();
  const change = recentChange();

  return (
    <header className="h-[72px] border-b border-white/[0.04] bg-ink-950/70 backdrop-blur-xl sticky top-0 z-10">
      <div className="h-full px-4 md:px-8 lg:px-14 flex items-center gap-3 md:gap-6">
        <MobileNav />

        <div className="relative flex-1 max-w-md">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
            strokeWidth={1.8}
          />
          <input
            type="text"
            placeholder="Jump to metric — MVRV, NUPL, SOPR…"
            className="w-full h-10 pl-10 pr-3 rounded-lg bg-white/[0.025] border border-white/[0.04] text-[13px] text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-accent/30 focus:bg-white/[0.04] transition-colors"
          />
        </div>

        <MobileStatus change={change} />

        <div className="flex items-center gap-2">
          <Pill>
            <Eyebrow>BTC</Eyebrow>
            <span className="font-mono text-[12.5px] text-ink-100 tabular-nums">
              {fmtUsd(TODAY.price)}
            </span>
            {change && (
              <span
                className={`font-mono text-[11px] ${change.pct >= 0 ? "text-signal-green" : "text-signal-red"} tabular-nums`}
              >
                {fmtPct(change.pct, 1)}
              </span>
            )}
          </Pill>

          <Pill>
            <Eyebrow>Cycle 5</Eyebrow>
            <span className="font-mono text-[12.5px] text-ink-100 tabular-nums">
              Day {TODAY_DAY_IN_CYCLE}
            </span>
            <span className="text-[11px] text-ink-350">
              {DAYS_TO_NEXT_HALVING}d to halving
            </span>
          </Pill>

          <Pill>
            <span className={`w-1.5 h-1.5 rounded-full ${PHASE_DOT[phase.tone]}`} />
            <Eyebrow>Phase</Eyebrow>
            <span className="text-[11.5px] text-ink-100">{phase.label}</span>
          </Pill>

          <SourcePill />
        </div>
      </div>
    </header>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden md:flex items-center gap-2.5 h-9 px-3.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400">{children}</span>
  );
}

// Data-source badge state, shared by the desktop SourcePill and the compact
// mobile status cluster.
function sourceBadge() {
  const isLive = SOURCE.mode !== "synthetic";
  const label =
    SOURCE.mode === "synthetic"
      ? "Modelled"
      : SOURCE.mode === "mixed"
        ? "Live + modelled"
        : "Live";
  const dot = isLive ? "bg-signal-green" : "bg-ink-400";
  const title = SOURCE.fetchedAt
    ? `Snapshot fetched ${new Date(SOURCE.fetchedAt).toUTCString()}`
    : "Synthetic data — run npm run sync to fetch live";
  return { isLive, label, dot, title };
}

// Compact price + data badge for the mobile top bar, where the full pills are
// hidden. Mirrors the BTC and Data pills in a space that fits a phone.
function MobileStatus({ change }: { change: { pct: number; days: number } | null }) {
  const { isLive, label, dot, title } = sourceBadge();
  return (
    <div className="flex md:hidden items-center gap-2.5 shrink-0" title={title}>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[12.5px] text-ink-100 tabular-nums">
          {fmtUsd(TODAY.price)}
        </span>
        {change && (
          <span
            className={`font-mono text-[10.5px] ${change.pct >= 0 ? "text-signal-green" : "text-signal-red"} tabular-nums`}
          >
            {fmtPct(change.pct, 1)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 pl-2.5 border-l border-white/[0.06]">
        <span className={`relative w-1.5 h-1.5 rounded-full ${dot} ${isLive ? "live-dot" : ""}`} />
        <span className="text-[10.5px] text-ink-300">{label}</span>
      </div>
    </div>
  );
}

function SourcePill() {
  const { isLive, label, dot, title } = sourceBadge();
  return (
    <div
      title={title}
      className="hidden lg:flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
    >
      <span className={`relative w-1.5 h-1.5 rounded-full ${dot} ${isLive ? "text-signal-green live-dot" : ""}`} />
      <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-400">Data</span>
      <span className="text-[11.5px] text-ink-200">{label}</span>
    </div>
  );
}
