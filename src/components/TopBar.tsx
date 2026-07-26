import Link from "next/link";
import { SOURCE, TODAY_DAY_IN_CYCLE } from "@/lib/btcData";
import { searchIndex } from "@/lib/searchIndex";
import { cyclePhase, headlineSpot } from "@/lib/cycleIntel";
import { fmtPct, fmtUsd } from "@/lib/format";
import { HalvingCountdownMini } from "./HalvingCountdownMini";
import { lastUpdatedShort } from "./LastUpdated";
import { MobileNav } from "./MobileNav";
import { ShareTrigger } from "./ShareTrigger";
import { NavSubscribeCta } from "./NavSubscribeCta";
import { SiteSearch } from "./SiteSearch";

const PHASE_DOT: Record<string, string> = {
  blue: "bg-signal-blue",
  green: "bg-signal-green",
  teal: "bg-accent",
  amber: "bg-signal-amber",
  red: "bg-signal-red",
};

export function TopBar() {
  const phase = cyclePhase();
  const spot = headlineSpot();

  return (
    <header className="h-[72px] border-b border-white/[0.04] bg-ink-950/70 backdrop-blur-xl sticky top-0 z-10">
      <div className="h-full px-4 md:px-8 lg:px-14 flex items-center gap-3 md:gap-6">
        <MobileNav />

        {/* Working site search (PR139) — index built server-side, filtered
            client-side. Replaces the former non-functional placeholder input. */}
        <SiteSearch entries={searchIndex()} />

        <MobileStatus spot={spot} />

        <div className="flex items-center gap-2">
          <NavSubscribeCta placement="topbar" />

          <ShareTrigger />

          <Link
            href="/price"
            title="Open the Bitcoin price chart"
            className="hidden md:flex items-center gap-2.5 h-9 px-3.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-accent/30 hover:bg-white/[0.035] transition-colors"
          >
            <Eyebrow>BTC</Eyebrow>
            <span className="font-mono text-[12.5px] text-ink-100 tabular-nums">
              {fmtUsd(spot.price)}
            </span>
            {spot.pct != null && (
              <span
                className={`font-mono text-[11px] ${spot.pct >= 0 ? "text-signal-green" : "text-signal-red"} tabular-nums`}
              >
                {fmtPct(spot.pct, 1)}
              </span>
            )}
            {spot.pct != null && <span className="text-[10px] text-ink-400">{spot.label}</span>}
          </Link>

          <Pill>
            <Eyebrow>Cycle 5</Eyebrow>
            <span className="font-mono text-[12.5px] text-ink-100 tabular-nums">
              Day {TODAY_DAY_IN_CYCLE}
            </span>
            <span className="w-px h-3.5 bg-white/[0.08]" />
            <HalvingCountdownMini />
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
function MobileStatus({ spot }: { spot: { price: number; pct: number | null; label: string } }) {
  const { isLive, label, dot, title } = sourceBadge();
  return (
    <div className="flex md:hidden items-center gap-2.5 shrink-0" title={title}>
      <Link href="/price" className="flex items-baseline gap-1.5" title="Open the Bitcoin price chart">
        <span className="font-mono text-[12.5px] text-ink-100 tabular-nums">
          {fmtUsd(spot.price)}
        </span>
        {spot.pct != null && (
          <span
            className={`font-mono text-[10.5px] ${spot.pct >= 0 ? "text-signal-green" : "text-signal-red"} tabular-nums`}
          >
            {fmtPct(spot.pct, 1)}
          </span>
        )}
        {spot.pct != null && <span className="text-[9.5px] text-ink-400">{spot.label}</span>}
      </Link>
      <div className="flex items-center gap-1.5 pl-2.5 border-l border-white/[0.06]">
        <span className="text-[10.5px] text-ink-300 font-mono whitespace-nowrap">
          Day {TODAY_DAY_IN_CYCLE}
        </span>
      </div>
      <div className="flex items-center gap-1.5 pl-2.5 border-l border-white/[0.06]">
        <span className={`relative w-1.5 h-1.5 rounded-full ${dot} ${isLive ? "live-dot" : ""}`} />
      </div>
    </div>
  );
}

function SourcePill() {
  const { isLive, label, dot, title } = sourceBadge();
  const updated = lastUpdatedShort();
  return (
    <div
      title={title}
      className="hidden lg:flex items-center gap-2 h-9 px-3.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
    >
      <span className={`relative w-1.5 h-1.5 rounded-full ${dot} ${isLive ? "text-signal-green live-dot" : ""}`} />
      <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-400">Data</span>
      <span className="text-[11.5px] text-ink-200">{label}</span>
      {updated && <span className="text-[10.5px] text-ink-400">· {updated} UTC</span>}
    </div>
  );
}
