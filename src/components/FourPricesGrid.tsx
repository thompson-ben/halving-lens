"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtUsd, fmtPct } from "@/lib/format";

// The four prices (PR-FRP2) — the relationship is the story. Each reference
// card reads, in order: the current price, the gap to market, the gap's
// TRAJECTORY over the selected period, its adaptive rarity, and only then
// the reference's own movement as supporting context.
//
// Purely presentational: every sentence arrives pre-rendered from the
// reference-gap engine and the movers describe layer. This component owns
// the period toggle and the layout — it computes and phrases nothing.

export type Period = 1 | 7 | 30;
export const PERIODS: Period[] = [1, 7, 30];

export interface GapView {
  available: boolean;
  /** e.g. "9% above → level over the last 7 days." */
  trajectory?: string;
  /** Adaptive rarity narrative and its supporting evidence. */
  rarityLine?: string | null;
  rarityEvidence?: string | null;
  crossed?: boolean;
  /** Member-facing reason when unavailable. */
  reason?: string;
}

export interface PriceCardData {
  eyebrow: string;
  name: string;
  question: string;
  value: number | null;
  gapPct?: number | null;
  note?: string;
  estimated?: boolean;
  href?: string;
  /** Per-period gap views; absent on the Market Price anchor card. */
  gaps?: Record<Period, GapView>;
  /** Per-period own-movement caption, e.g. "+8.7% over the last 7 days". */
  movement?: Record<Period, string | null>;
}

const periodTab = (p: Period): string => (p === 1 ? "24h" : `${p}d`);

export function FourPricesGrid({ cards }: { cards: PriceCardData[] }) {
  const [period, setPeriod] = useState<Period>(7);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-caption text-ink-500">How each relationship moved:</p>
        <div className="flex rounded-lg border border-white/[0.08] overflow-hidden">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={`px-3 py-1.5 text-micro font-mono transition-colors ${
                period === p ? "bg-white/[0.07] text-ink-50" : "text-ink-500 hover:text-ink-200"
              }`}
            >
              {periodTab(p)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((c) => (
          <Card key={c.name} c={c} period={period} />
        ))}
      </div>
    </div>
  );
}

function Card({ c, period }: { c: PriceCardData; period: Period }) {
  const gap = c.gaps?.[period];
  const move = c.movement?.[period];

  const body = (
    <>
      <div className="eyebrow text-accent">{c.eyebrow}</div>
      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
        <span className="text-subhead font-medium text-ink-50">{c.name}</span>
        {c.estimated && (
          <span className="eyebrow px-1.5 py-0.5 rounded-full border border-signal-violet/25 text-signal-violet bg-signal-violet/[0.08]">
            Estimated
          </span>
        )}
      </div>
      <div className="mt-0.5 text-caption text-ink-500">{c.question}</div>

      {/* 1 · the price  ·  2 · the gap */}
      <div className="mt-3 flex items-baseline gap-2.5 flex-wrap">
        <span className="font-display text-stat tabular-nums text-ink-50 leading-none">
          {c.value != null ? fmtUsd(c.value, { compact: true }) : "—"}
        </span>
        {c.gapPct != null && (
          <span className={`font-mono text-caption tabular-nums ${c.gapPct >= 0 ? "text-signal-green" : "text-signal-red"}`}>
            {fmtPct(c.gapPct, 1)} vs market
          </span>
        )}
      </div>

      {/* 3 · the trajectory — the real story */}
      {gap && gap.available && gap.trajectory && (
        <p className="mt-3 pt-3 border-t border-white/[0.06] text-body text-ink-100 leading-relaxed">
          {gap.trajectory}
        </p>
      )}
      {gap && !gap.available && gap.reason && (
        <p className="mt-3 pt-3 border-t border-white/[0.06] text-caption text-ink-500 leading-relaxed">{gap.reason}</p>
      )}

      {/* 4 · how unusual, in words first */}
      {gap?.available && gap.rarityLine && (
        <div className="mt-1.5">
          <p className="text-caption text-ink-400 leading-relaxed">{gap.rarityLine}</p>
          {gap.rarityEvidence && <p className="text-micro text-ink-600 leading-relaxed">{gap.rarityEvidence}</p>}
        </div>
      )}

      {/* 5 · the reference's own movement — supporting context */}
      {move && <p className="mt-2 text-micro text-ink-500">{c.name} itself: {move}.</p>}

      {c.note && <p className="mt-2.5 text-micro text-ink-600 leading-relaxed">{c.note}</p>}
    </>
  );

  const cls = "card p-4 sm:p-5 block h-full";
  if (!c.href) return <div className={cls}>{body}</div>;
  return (
    <Link href={c.href} className={`${cls} card-interactive`}>
      {body}
    </Link>
  );
}
