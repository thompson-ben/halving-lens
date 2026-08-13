import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { EtfIntelCard as EtfIntelPayload } from "@/lib/cycleDashboardIntel";
import { fmtUsd } from "@/lib/format";

// ETF intelligence (V2.1 Phase 3) — the reference implementation of the
// NOW → CHANGE → COMPOSITION → CONCENTRATION → CONTEXT grammar, so the
// founder can explain ETF demand from this page alone. Layout only: every
// number and sentence arrives composed from the flows engine's canonical
// windows; each block renders ONLY when its payload field carries an honest
// claim, so short histories and quiet weeks degrade to fewer lines, never
// to invented ones. The inflow/outflow sign keeps its factual colour — for
// a net flow, direction IS the fact, not a judgement.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const shortDate = (iso: string): string => {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};

/** Diverging per-day bars around a zero baseline — the composition visual
 *  that makes concentration legible at a glance. SSR-stable SVG (no ids,
 *  no gradients); each bar carries its date + value as a <title>. */
function FlowBars({ bars }: { bars: Array<{ date: string; netFlow: number }> }) {
  if (bars.length === 0) return null;
  const w = 252;
  const h = 64;
  const zero = h / 2;
  const maxAbs = Math.max(...bars.map((b) => Math.abs(b.netFlow)), 1);
  const bw = Math.floor(w / bars.length) - 6;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Daily net flows across the window" className="max-w-full">
      <line x1="0" y1={zero} x2={w} y2={zero} stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
      {bars.map((b, i) => {
        const x = i * Math.floor(w / bars.length) + 3;
        const mag = (Math.abs(b.netFlow) / maxAbs) * (zero - 4);
        const y = b.netFlow >= 0 ? zero - mag : zero;
        return (
          <rect
            key={b.date}
            x={x}
            y={y}
            width={bw}
            height={Math.max(1.5, mag)}
            rx="1"
            fill={b.netFlow >= 0 ? "#5eead4" : "#ff5d5d"}
            fillOpacity="0.8"
          >
            <title>{`${prettyDate(b.date)}: ${fmtUsd(b.netFlow, { compact: true, sign: true })}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

export function EtfIntelCard({ etf }: { etf: EtfIntelPayload }) {
  if (!etf.available) return null;
  const tone = etf.net != null && etf.net > 0 ? "text-signal-green" : etf.net != null && etf.net < 0 ? "text-signal-red" : "text-ink-300";
  const first = etf.bars[0]?.date;
  const last = etf.bars[etf.bars.length - 1]?.date;
  return (
    <section aria-label="ETF demand — the week in flows">
      <div className="flex items-baseline justify-between gap-3 mb-2.5 flex-wrap">
        <h2 className="eyebrow text-editorial">ETF demand</h2>
        <span className="eyebrow text-ink-500">
          {etf.windowDays} trading days{etf.asOf ? ` · to ${prettyDate(etf.asOf)}` : ""}
        </span>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
          <div className="min-w-0">
            {/* NOW */}
            <div className={`font-mono text-stat leading-none tabular-nums ${tone}`}>{etf.netLabel}</div>
            <div className="mt-1.5 text-caption text-ink-500">net over {etf.windowDays} trading days</div>

            {/* CHANGE */}
            {etf.prevNetLabel && etf.deltaLabel && (
              <div className="mt-3.5 space-y-0.5">
                <p className="text-caption text-ink-300">
                  Previous {etf.windowDays} trading days: <span className="font-mono tabular-nums">{etf.prevNetLabel}</span>
                </p>
                <p className="text-caption text-ink-400">
                  Change: <span className="font-mono tabular-nums text-ink-200">{etf.deltaLabel}</span>
                </p>
              </div>
            )}
          </div>

          {/* COMPOSITION */}
          <div className="min-w-0">
            <FlowBars bars={etf.bars} />
            {first && last && (
              <div className="mt-1 flex justify-between text-micro text-ink-600" aria-hidden>
                <span>{shortDate(first)}</span>
                <span>{shortDate(last)}</span>
              </div>
            )}
          </div>
        </div>

        {/* CONCENTRATION + CONTEXT — deterministic sentences, present only
            when honestly claimable. */}
        {(etf.concentrationLine || etf.contextLine) && (
          <div className="mt-4 pt-3.5 border-t border-white/[0.06] space-y-1">
            {etf.concentrationLine && <p className="text-caption text-ink-200 max-w-measure">{etf.concentrationLine}</p>}
            {etf.contextLine && <p className="text-caption text-ink-400 max-w-measure">{etf.contextLine}</p>}
          </div>
        )}

        <Link href="/etf" className="mt-3.5 inline-flex items-center gap-1 text-caption text-ink-400 hover:text-ink-100 transition-colors">
          View ETF Flows
          <ArrowUpRight className="w-3 h-3" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
