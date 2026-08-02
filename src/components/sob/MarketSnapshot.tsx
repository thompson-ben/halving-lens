"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { MoverPeriod, MoversResult, Movement } from "@/lib/marketMovers/types";
import {
  formatMovement,
  formatValue,
  meaningLine,
  periodLabel,
  rarityLine,
  steadySummary,
  thenNowLine,
} from "@/lib/marketMovers/describe";
import { MATERIAL_SIGNIFICANCE } from "@/lib/marketMovers/distribution";

// Market Snapshot (SoB 2.0, PR-SB2) — the single answer to "what actually
// moved this week?", replacing the three sections that previously answered
// it separately from the same seven readings.
//
// Three tiers of visual weight, deliberately NOT a 14-row table (which gives
// every reading equal weight, defeating the point) and NOT another card grid:
//   Tier 1  the top three, always shown, whatever the materiality threshold
//   Tier 2  ranks 4–8, compact, expandable
//   Tier 3  everything steady, one line
// The materiality threshold governs LANGUAGE and emphasis only — never
// whether a tier exists (founder decision).
//
// Ranking, rarity and context all come precomputed from the engine; this
// component performs no analysis of its own.

const PERIODS: MoverPeriod[] = [1, 7, 30];

/** Whole days a reading lags the section's reporting anchor. A one-day lag
 *  is the normal publishing cadence and is not worth a note on every row —
 *  anything longer is disclosed. */
const lagDays = (rowAsOf: string, sectionAsOf: string): number =>
  Math.round((Date.parse(`${sectionAsOf}T00:00:00Z`) - Date.parse(`${rowAsOf}T00:00:00Z`)) / 86_400_000);

const toneOf = (m: Movement): string =>
  m.direction === "up" ? "text-signal-green" : m.direction === "down" ? "text-signal-red" : "text-ink-300";

function Spark({ values, tone }: { values: number[]; tone: string }) {
  if (!values || values.length < 3) return null;
  const w = 104;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const d = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${(i / (values.length - 1)) * w} ${h - ((v - min) / span) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="overflow-visible">
      <path d={d} fill="none" stroke={tone} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Significance chip — always paired with the evidence line beneath it, so a
 *  band label can never travel without its sample size and window. */
function BandChip({ m }: { m: Movement }) {
  if (m.rarityState !== "available") {
    return (
      <span className="text-[9.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border border-white/12 bg-white/[0.03] text-ink-400">
        Comparison maturing
      </span>
    );
  }
  const label = m.band === "exceptional" ? "Exceptional" : m.band === "unusual" ? "Unusual" : m.band === "notable" ? "Notable" : "Routine";
  const cls =
    m.band === "exceptional" || m.band === "unusual"
      ? "border-[#d9b96a]/35 bg-[#d9b96a]/[0.08] text-[#d9b96a]"
      : "border-white/12 bg-white/[0.03] text-ink-400";
  return <span className={`text-[9.5px] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

function Tier1Row({ m, rank, asOf }: { m: Movement; rank: number; asOf: string }) {
  const tone = m.direction === "up" ? "#3ddc97" : m.direction === "down" ? "#ff5d5d" : "#8893a4";
  const belowThreshold = m.significance < MATERIAL_SIGNIFICANCE;
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[10px] font-mono text-ink-600">{String(rank).padStart(2, "0")}</span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-ink-300">{m.label}</span>
            <BandChip m={m} />
            {m.state && <span className="text-[10px] text-ink-500">{m.state}</span>}
            {m.nature === "estimated" && (
              <span className="text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border border-signal-violet/25 text-signal-violet bg-signal-violet/[0.08]">
                Estimated
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2.5 flex-wrap">
            <span className={`font-display text-[28px] sm:text-[34px] leading-none tabular-nums ${toneOf(m)}`}>
              {formatMovement(m)}
            </span>
            <span className="text-[11.5px] text-ink-500">over {periodLabel(m.period)}</span>
          </div>
          {thenNowLine(m) && <div className="mt-1.5 text-[12.5px] text-ink-300 tabular-nums">{thenNowLine(m)}</div>}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <Spark values={m.spark} tone={tone} />
          <Link href={m.href} className="inline-flex items-center gap-1 text-[11.5px] text-ink-400 hover:text-ink-100 transition-colors">
            {m.what}
            <ArrowUpRight className="w-3 h-3" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="mt-4 pt-3.5 border-t border-white/[0.06] space-y-1.5">
        <p className="text-[13px] text-ink-200 leading-relaxed">
          {belowThreshold ? "Largest remaining move · ordinary within its own record." : meaningLine(m)}
        </p>
        <p className="text-[11px] text-ink-500">{rarityLine(m)}</p>
        {m.broaderContext && <p className="text-[11px] text-ink-500">{m.broaderContext.text}</p>}
        {lagDays(m.asOf, asOf) > 1 && (
          <p className="text-[10.5px] text-ink-600">Measured to {m.asOf}, this reading&rsquo;s latest observation.</p>
        )}
      </div>
    </div>
  );
}

function Tier2Row({ m, rank }: { m: Movement; rank: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.05] last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 py-3 text-left hover:bg-white/[0.015] transition-colors rounded"
      >
        <span className="text-[10px] font-mono text-ink-600 w-5 shrink-0">{String(rank).padStart(2, "0")}</span>
        <span className="text-[12.5px] text-ink-200 flex-1 min-w-0 truncate">{m.label}</span>
        <span className="text-[12px] text-ink-400 tabular-nums hidden sm:inline">{formatValue(m)}</span>
        <span className={`text-[12.5px] tabular-nums w-24 text-right ${toneOf(m)}`}>{formatMovement(m)}</span>
        <span className="hidden sm:block shrink-0">
          <BandChip m={m} />
        </span>
        <span className="text-ink-600 text-[11px] w-3 shrink-0" aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="pb-3.5 pl-8 pr-3 space-y-1.5">
          <p className="text-[12.5px] text-ink-300 leading-relaxed">{meaningLine(m)}</p>
          {thenNowLine(m) && <p className="text-[11.5px] text-ink-400 tabular-nums">{thenNowLine(m)}</p>}
          <p className="text-[11px] text-ink-500">{rarityLine(m)}</p>
          {m.broaderContext && <p className="text-[11px] text-ink-500">{m.broaderContext.text}</p>}
          <Link href={m.href} className="inline-flex items-center gap-1 text-[11.5px] text-accent hover:text-accent-soft">
            {m.label}
            <ArrowUpRight className="w-3 h-3" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}

export function MarketSnapshot({ initial }: { initial: Record<MoverPeriod, MoversResult> }) {
  const [period, setPeriod] = useState<MoverPeriod>(7);
  const result = initial[period];

  const { tier1, tier2, steady, materialCount } = useMemo(() => {
    const ranked = [...result.movements, ...result.steady];
    const t1 = ranked.slice(0, 3);
    const t2 = ranked.slice(3, 8);
    const rest = ranked.slice(8);
    return {
      tier1: t1,
      tier2: t2,
      steady: rest,
      materialCount: result.movements.length,
    };
  }, [result]);

  // Materiality language only — never whether a tier renders.
  const quiet = materialCount === 0;
  const analysed = tier1.length + tier2.length + steady.length;
  const scope = quiet
    ? `${analysed} market readings analysed · none moved materially over the last ${periodLabel(period)}. The ranked readings below were all historically ordinary.`
    : `${analysed} market readings analysed · ${materialCount} moved materially over the last ${periodLabel(period)}${
        materialCount < 3 ? ". The remaining ranked readings were historically ordinary." : "."
      }`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[12px] text-ink-400 leading-relaxed max-w-2xl">{scope}</p>
        <div className="flex items-center gap-1 shrink-0" role="group" aria-label="Comparison period">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={`px-2.5 py-1 rounded-md text-[11.5px] border transition-colors ${
                period === p ? "border-accent/40 bg-accent/[0.08] text-accent" : "border-white/[0.08] text-ink-500 hover:text-ink-200"
              }`}
            >
              {p === 1 ? "24h" : `${p}d`}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {tier1.map((m, i) => (
          <Tier1Row key={m.metricId} m={m} rank={i + 1} asOf={result.asOf} />
        ))}
      </div>

      {tier2.length > 0 && (
        <div className="card px-4 sm:px-5 py-1">
          {tier2.map((m, i) => (
            <Tier2Row key={m.metricId} m={m} rank={i + 4} />
          ))}
        </div>
      )}

      {steady.length > 0 && <SteadyLine steady={steady} />}

      {result.unavailable.length > 0 && (
        <p className="text-[11px] text-ink-600 leading-relaxed">
          Not measurable over {periodLabel(period)}:{" "}
          {result.unavailable.map((u) => `${u.label} (${u.reason})`).join(" · ")}.
        </p>
      )}
    </div>
  );
}

function SteadyLine({ steady }: { steady: Movement[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-4">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full text-left flex items-start gap-2">
        <span className="text-ink-600 text-[11px] mt-0.5" aria-hidden>{open ? "−" : "+"}</span>
        <span className="text-[12.5px] text-ink-300 leading-relaxed">{steadySummary(steady)}</span>
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {steady.map((m) => (
            <div key={m.metricId} className="flex items-center justify-between gap-3 text-[11.5px]">
              <Link href={m.href} className="text-ink-400 hover:text-ink-100 transition-colors truncate">{m.label}</Link>
              <span className="text-ink-500 tabular-nums shrink-0">
                {formatValue(m)} <span className={toneOf(m)}>{formatMovement(m)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
