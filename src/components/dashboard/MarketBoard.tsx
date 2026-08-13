import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { MarketBoard as MarketBoardPayload } from "@/lib/cycleDashboardIntel";
import type { Movement } from "@/lib/marketMovers";
import {
  formatMovement,
  formatValue,
  meaningLine,
  rarityLine,
  thenNowLine,
  periodAdjective,
} from "@/lib/marketMovers";

// Market Board (V2.1 Phase 2) — the whole considered market, ranked, with
// strongly asymmetric attention. The founder's acceptance criterion: this
// must never read as a 15-row data table. Material rows carry full weight;
// routine rows recede into one quiet block that PROVES the quiet claim;
// unavailable rows close the board with the engine's own reason. Every
// number and sentence is quoted from the movers' contract and describe
// layer — the renderer performs layout and emphasis only, and emphasis
// follows SIGNIFICANCE, never direction: no green/red, gold only at
// unusual/exceptional. Expansion is native <details> — zero client JS.

const PERIODS = [1, 7, 30] as const;
const PERIOD_LABEL: Record<number, string> = { 1: "1D", 7: "7D", 30: "30D" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

/** A deliberately quiet inline spark — plain polyline, no gradient, no ids
 *  (SSR-stable), opacity tuned by the row's emphasis tier. */
function Spark({ data, dim }: { data: readonly number[]; dim: boolean }) {
  if (data.length < 2) return null;
  const w = 72;
  const h = 20;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 2 - ((v - min) / span) * (h - 4)).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className={dim ? "opacity-25" : "opacity-60"}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** The cadence/as-of tail a row owes the reader, when it owes one. */
function honestyTail(m: Movement, boardAsOf: string): string | null {
  const parts: string[] = [];
  if (m.kind === "flow") parts.push("trading-day series");
  else if (m.window.cadenceDays >= 7) parts.push("weekly series");
  if (m.asOf < boardAsOf) parts.push(`measured to ${prettyDate(m.asOf)}`);
  return parts.length ? parts.join(" · ") : null;
}

function BandWord({ m }: { m: Movement }) {
  if (m.rarityState !== "available") return <span className="eyebrow text-ink-600">Comparison maturing</span>;
  const gold = m.band === "exceptional" || m.band === "unusual";
  const label = m.band.charAt(0).toUpperCase() + m.band.slice(1);
  return <span className={`eyebrow ${gold ? "text-editorial" : "text-ink-500"}`}>{label}</span>;
}

function Row({ m, boardAsOf, tier }: { m: Movement; boardAsOf: string; tier: "material" | "routine" }) {
  const dim = tier === "routine";
  const tail = honestyTail(m, boardAsOf);
  return (
    <details className="group">
      <summary
        className={`list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none px-4 sm:px-5 ${dim ? "py-2" : "py-3"} grid grid-cols-[minmax(0,1fr)_auto_auto] sm:grid-cols-[minmax(0,1fr)_7rem_8.5rem_6.5rem_5.5rem] items-baseline gap-x-3 hover:bg-white/[0.02] transition-colors`}
      >
        <span className="min-w-0 truncate">
          <span className={dim ? "text-caption text-ink-400" : "text-body text-ink-100"}>{m.label}</span>
          {m.state && <span className={`ml-2 ${dim ? "text-micro text-ink-600" : "text-caption text-ink-500"}`}>{m.state}</span>}
        </span>
        {/* NOW — the level, or for the flow row the period's net (signed:
            an inflow/outflow sign is part of the fact, not a judgement). */}
        <span className={`hidden sm:block text-right font-mono tabular-nums ${dim ? "text-caption text-ink-500" : "text-body text-ink-200"}`}>
          {m.kind === "flow" && m.current != null && m.current > 0 ? `+${formatValue(m)}` : formatValue(m)}
        </span>
        {/* CHANGE — the period movement; for the flow row, vs the previous window. */}
        <span className={`text-right font-mono tabular-nums ${dim ? "text-caption text-ink-500" : "text-body text-ink-100"}`}>
          {formatMovement(m)}
        </span>
        <span className="text-right sm:text-left">
          <BandWord m={m} />
        </span>
        <span className={`hidden sm:flex justify-end ${dim ? "text-ink-700" : "text-ink-400"}`}>
          <Spark data={m.spark} dim={dim} />
        </span>
      </summary>
      {/* Expansion — NOW → CHANGE → SIGNIFICANCE → CONTEXT → VIEW, every
          sentence the engine's own. */}
      <div className="px-4 sm:px-5 pb-4 pt-1 space-y-1.5 border-l-2 border-white/[0.06] ml-4 sm:ml-5 mb-2">
        {thenNowLine(m) && <p className="text-caption text-ink-300 font-mono tabular-nums">{thenNowLine(m)}</p>}
        <p className="text-caption text-ink-200 max-w-measure">{meaningLine(m)}</p>
        <p className="text-micro text-ink-500 max-w-measure">{rarityLine(m)}</p>
        {m.broaderContext && <p className="text-caption text-ink-400 max-w-measure">{m.broaderContext.text}</p>}
        {tail && <p className="text-micro text-ink-600">{tail}</p>}
        <Link href={m.href} className="inline-flex items-center gap-1 text-caption text-accent hover:text-accent-soft transition-colors">
          View {m.label}
          <ArrowUpRight className="w-3 h-3" aria-hidden />
        </Link>
      </div>
    </details>
  );
}

export function MarketBoard({ board }: { board: MarketBoardPayload }) {
  const material = board.rows.slice(0, board.materialCount);
  const routine = board.rows.slice(board.materialCount);
  return (
    <section aria-label={`Market board — every reading over the last ${board.period} days`}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5 flex-wrap">
        <h2 className="eyebrow text-editorial">Market board</h2>
        <nav aria-label="Board period" className="flex items-baseline gap-3">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={p === 7 ? "/cycle-dashboard" : `/cycle-dashboard?period=${p}`}
              aria-current={board.period === p ? "true" : undefined}
              className={`eyebrow transition-colors ${board.period === p ? "text-ink-100" : "text-ink-600 hover:text-ink-300"}`}
            >
              {PERIOD_LABEL[p]}
            </Link>
          ))}
        </nav>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
        {material.length > 0 && (
          <ul className="divide-y divide-white/[0.04]">
            {material.map((m) => (
              <li key={m.metricId}>
                <Row m={m} boardAsOf={board.asOf} tier="material" />
              </li>
            ))}
          </ul>
        )}

        {/* The quiet majority — visible, receded, and headed by its own
            factual claim so "nothing much happened" is shown, not implied. */}
        <div className={material.length > 0 ? "border-t border-white/[0.08]" : ""}>
          <div className="px-4 sm:px-5 pt-3 pb-1 eyebrow text-ink-600">
            {material.length > 0
              ? `Within their own ordinary ${periodAdjective(board.period)} range`
              : `Every reading within its own ordinary ${periodAdjective(board.period)} range`}
          </div>
          <ul className="divide-y divide-white/[0.03]">
            {routine.map((m) => (
              <li key={m.metricId}>
                <Row m={m} boardAsOf={board.asOf} tier="routine" />
              </li>
            ))}
          </ul>
        </div>

        {board.unavailable.length > 0 && (
          <div className="border-t border-white/[0.06] px-4 sm:px-5 py-3 space-y-1">
            {board.unavailable.map((u) => (
              <p key={u.metricId} className="text-micro text-ink-600">
                {u.label} — {u.reason}
              </p>
            ))}
          </div>
        )}

        <div className="border-t border-white/[0.06] px-4 sm:px-5 py-3 flex items-baseline justify-between gap-3 flex-wrap">
          <span className="text-micro text-ink-600">{board.orderNote}</span>
          <Link href="/state-of-bitcoin#movers" className="inline-flex items-center gap-1 text-caption text-ink-400 hover:text-ink-100 transition-colors">
            Full market snapshot
            <ArrowUpRight className="w-3 h-3" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
