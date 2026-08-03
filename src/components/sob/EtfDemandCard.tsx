import { TrackedLink } from "@/components/TrackedLink";
import { etfWeek, type EtfBar } from "@/lib/etfWeek";

// ETF Demand, made immediately legible (PR128). Answers three things a first-time
// visitor needs — the week (last 7 trading days), the latest trading day, and how
// we got there (a seven-bar shape) — plus one adaptive sentence. Minimal and
// Bloomberg-plain; server-rendered, hover via native SVG titles. Standardised
// wording throughout ("Last 7 trading days", "Latest trading day", "Net inflow/
// outflow") so nothing reads as ambiguous.

const INFLOW = "#5eead4";
const OUTFLOW = "#ff5d5d";

function SparkBars({ bars }: { bars: EtfBar[] }) {
  if (bars.length === 0) return null;
  const W = 224, H = 52, mid = 26, cap = 20;
  const maxAbs = Math.max(...bars.map((b) => Math.abs(b.netFlow)), 1);
  const slot = W / bars.length;
  const bw = Math.min(22, slot * 0.62);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} height={H} className="block" role="img" aria-label="ETF net flow by trading day, newest on the right">
      <line x1="0" y1={mid} x2={W} y2={mid} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {bars.map((b, i) => {
        const h = (Math.abs(b.netFlow) / maxAbs) * cap;
        const x = i * slot + (slot - bw) / 2;
        const up = b.netFlow >= 0;
        const y = up ? mid - h : mid;
        return (
          <rect key={i} x={x.toFixed(1)} y={y.toFixed(1)} width={bw.toFixed(1)} height={Math.max(1, h).toFixed(1)} rx="1.5" fill={up ? INFLOW : OUTFLOW} opacity={0.9}>
            <title>{`${b.date}: ${b.netFlow >= 0 ? "+" : "−"}$${Math.abs(Math.round(b.netFlow / 1e6))}M net ${b.netFlow >= 0 ? "inflow" : "outflow"}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export function EtfDemandCard() {
  const e = etfWeek();
  if (!e.available) {
    return (
      <div className="card p-5">
        <div className="eyebrow text-ink-500">ETF Demand</div>
        <p className="mt-2 text-body text-ink-400 leading-relaxed max-w-measure">{e.interpretation}</p>
      </div>
    );
  }
  const weekColor = e.net7Positive ? INFLOW : OUTFLOW;
  return (
    <TrackedLink href="/etf" event="evidence_card_click" props={{ metric: "etf_flow" }} className="card card-interactive p-5 sm:p-6 block">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-8 gap-y-4 items-start">
        <div>
          <div className="eyebrow text-ink-500">ETF Demand</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-display text-stat leading-none tabular-nums" style={{ color: weekColor }}>{e.net7Label}</span>
            <span className="text-caption text-ink-400">Net {e.net7Positive ? "inflow" : "outflow"} · Last 7 trading days</span>
          </div>
        </div>
        <div className="w-full sm:w-[224px] sm:justify-self-end">
          <SparkBars bars={e.bars} />
          <div className="mt-1 flex justify-between eyebrow text-ink-600">
            <span>7 trading days ago</span>
            <span>Latest</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        {e.latest && (
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="eyebrow text-ink-500">Latest trading day</span>
            <span className="font-display text-subhead tabular-nums whitespace-nowrap" style={{ color: e.latest.positive ? INFLOW : OUTFLOW }}>{e.latest.label}</span>
            <span className="text-caption text-ink-400 whitespace-nowrap">Net {e.latest.positive ? "inflow" : "outflow"}</span>
          </div>
        )}
        <span className="text-caption text-accent whitespace-nowrap">Open ETF flows →</span>
      </div>

      <p className="mt-3 text-caption text-ink-300 leading-relaxed max-w-measure">{e.interpretation}</p>
    </TrackedLink>
  );
}
