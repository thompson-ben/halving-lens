import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { MetricWatch } from "@/lib/metricWatch";
import type { ChangeSummary as ChangeSummaryPayload } from "@/lib/cycleDashboardIntel";
import type { Movement } from "@/lib/marketMovers";
import { formatMovement, meaningLine, rarityLine } from "@/lib/marketMovers";
import { MetricWatchToday } from "./MetricWatchToday";

// What Changed? — the executive summary (V2.1 Phase 1). One section that
// answers "has much actually changed?" before anything else on the page asks
// for attention: the canonical activity word, the considered-population
// counts, the small set of rows worth looking at — then the Metric Watch
// block, whose significance claims stay the engine's verbatim. Layout only:
// every word here is quoted from the payload or the movers' own formatters,
// no threshold or classification is re-derived, and a quiet week renders as
// a first-class finding, never as empty space.
//
// Visual emphasis follows significance, not direction (founder rule): the
// movement figures render in neutral ink with their sign; only the band word
// carries the editorial accent, and only at unusual/exceptional.

function BandWord({ m }: { m: Movement }) {
  const gold = m.band === "exceptional" || m.band === "unusual";
  const label = m.band.charAt(0).toUpperCase() + m.band.slice(1);
  return (
    <span className={`eyebrow ${gold ? "text-editorial" : "text-ink-500"}`}>{label}</span>
  );
}

function AttentionRow({ m, why }: { m: Movement; why?: boolean }) {
  return (
    <li>
      <Link
        href={m.href}
        className="group block py-1.5"
      >
        <span className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
          <span className="text-body text-ink-100 group-hover:text-ink-50 transition-colors">{m.label}</span>
          <span className="font-mono text-body tabular-nums text-ink-200">{formatMovement(m)}</span>
          <BandWord m={m} />
          <ArrowUpRight className="w-3 h-3 text-ink-600 group-hover:text-ink-300 transition-colors" aria-hidden />
        </span>
        {/* WHY this interrupted you — the significance engine's own meaning
            and evidence sentences, verbatim, only where the engine permits
            the rarity claim. Visually subordinate to the mover itself. */}
        {why && m.rarityState === "available" && (
          <>
            <span className="block mt-0.5 text-caption text-ink-300 max-w-measure">{meaningLine(m)}</span>
            <span className="block mt-0.5 text-micro text-ink-500 max-w-measure">{rarityLine(m)}</span>
          </>
        )}
      </Link>
    </li>
  );
}

export function ChangeSummary({
  summary,
  watch,
  quietSupport,
}: {
  summary: ChangeSummaryPayload;
  watch: MetricWatch;
  quietSupport: string;
}) {
  return (
    <section aria-label="What changed — last 7 days">
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <h2 className="eyebrow text-editorial">What changed?</h2>
        <span className="eyebrow text-ink-500">Last 7 days</span>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
        {/* The verdict word — activity, never bullishness */}
        <div className="font-display text-headline font-medium tracking-tight-2 text-ink-50 leading-snug">
          {summary.activityLabel}
        </div>
        <p className="mt-1.5 text-caption text-ink-400 max-w-measure">{summary.countsLine}</p>

        {summary.needsAttention.length > 0 && (
          <div className="mt-4 pt-3.5 border-t border-white/[0.06]">
            <div className="eyebrow text-ink-400">Worth looking at</div>
            <ul className="mt-1 space-y-1.5">
              {summary.needsAttention.map((m) => (
                <AttentionRow key={m.metricId} m={m} why />
              ))}
            </ul>
          </div>
        )}

        {summary.alsoMoving.length > 0 && (
          <div className={summary.needsAttention.length > 0 ? "mt-2" : "mt-4 pt-3.5 border-t border-white/[0.06]"}>
            <div className="eyebrow text-ink-400">Also moving</div>
            <ul className="mt-1">
              {summary.alsoMoving.map((m) => (
                <AttentionRow key={m.metricId} m={m} />
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Significance vs its own history — a different question, answered by
          a different engine; the distinction is deliberate and preserved. */}
      <div className="mt-5">
        <MetricWatchToday watch={watch} quietSupport={quietSupport} />
      </div>
    </section>
  );
}
