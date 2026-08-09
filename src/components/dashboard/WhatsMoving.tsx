import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatMovement } from "@/lib/marketMovers";
import type { WhatsMovingRail } from "@/lib/cycleDashboardIntel";

// What's Moving (CD4 treatment) — the scanning layer beneath the Lens,
// now a compact aligned panel instead of a text list. Selection, order,
// dedupe, cap and the 7-day window are byte-identical to CD3: this file
// only aligns columns and separates the footer. Numbers and rarity words
// are the movers engine's own; the sign always travels with the number so
// colour is reinforcement, never the meaning. No mini charts, no rank
// numerals, no new interpretation.

const toneOf = (dir: string) =>
  dir === "up" ? "text-signal-green" : dir === "down" ? "text-signal-red" : "text-ink-300";

export function WhatsMoving({ rail }: { rail: WhatsMovingRail }) {
  return (
    <section aria-label="What's moving — last 7 days">
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <h2 className="eyebrow text-accent">What&apos;s moving</h2>
        <span className="eyebrow text-ink-600">Last 7 days</span>
      </div>

      {rail.rows.length > 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <ul className="divide-y divide-white/[0.05]">
            {rail.rows.map((m) => {
              const bandWord =
                m.rarityState !== "available"
                  ? "Comparison maturing"
                  : m.band.charAt(0).toUpperCase() + m.band.slice(1);
              const gold = m.rarityState === "available" && (m.band === "exceptional" || m.band === "unusual");
              return (
                <li key={m.metricId}>
                  <Link
                    href={m.href}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] sm:grid-cols-[minmax(0,1fr)_7.5rem_9rem_auto] items-baseline gap-x-4 px-4 sm:px-5 py-3 group hover:bg-white/[0.015] transition-colors"
                  >
                    <span className="text-body text-ink-100 truncate group-hover:text-ink-50">{m.label}</span>
                    <span className={`font-mono text-body tabular-nums text-right ${toneOf(m.direction)}`}>
                      {formatMovement(m)}
                    </span>
                    <span className={`text-caption text-right sm:text-left ${gold ? "text-editorial" : "text-ink-500"}`}>{bandWord}</span>
                    <ArrowUpRight className="hidden sm:block w-3 h-3 text-ink-500 group-hover:text-ink-200 justify-self-end self-center" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-white/[0.05] px-4 sm:px-5 py-2.5 flex items-baseline justify-between gap-3 flex-wrap">
            <p className="text-caption text-ink-500">{rail.scopeLine}</p>
            <Link
              href="/state-of-bitcoin#movers"
              className="inline-flex items-center gap-1 text-caption text-accent hover:text-accent-soft whitespace-nowrap transition-colors"
            >
              Full market snapshot
              <ArrowUpRight className="w-3 h-3" aria-hidden />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="text-caption text-ink-500 max-w-measure">{rail.scopeLine}</p>
          <Link
            href="/state-of-bitcoin#movers"
            className="inline-flex items-center gap-1 text-caption text-accent hover:text-accent-soft whitespace-nowrap transition-colors"
          >
            Full market snapshot
            <ArrowUpRight className="w-3 h-3" aria-hidden />
          </Link>
        </div>
      )}
    </section>
  );
}
