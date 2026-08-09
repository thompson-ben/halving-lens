import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatMovement } from "@/lib/marketMovers";
import type { WhatsMovingRail } from "@/lib/cycleDashboardIntel";

// What's Moving (CD3) — the scanning layer beneath Metric Watch. Material
// movers only, engine order, capped: it answers "what else is moving
// underneath the headline?" and stays visually quieter than the sections
// around it — plain rows, no cards, no toggle. Numbers and rarity words
// are the movers engine's own; the sign always travels with the number so
// colour is reinforcement, never the meaning.

const toneOf = (dir: string) =>
  dir === "up" ? "text-signal-green" : dir === "down" ? "text-signal-red" : "text-ink-300";

export function WhatsMoving({ rail }: { rail: WhatsMovingRail }) {
  return (
    <section aria-label="What's moving — last 7 days">
      <h2 className="eyebrow text-accent mb-2">What&apos;s moving · last 7 days</h2>
      {rail.rows.length > 0 && (
        <ul className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
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
                  className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[10rem_7rem_1fr_auto] gap-x-4 items-baseline py-2.5 group"
                >
                  <span className="text-body text-ink-100 truncate group-hover:text-ink-50">{m.label}</span>
                  <span className={`font-mono text-caption tabular-nums text-right sm:text-left ${toneOf(m.direction)}`}>
                    {formatMovement(m)}
                  </span>
                  <span className={`hidden sm:block text-caption ${gold ? "text-editorial" : "text-ink-500"}`}>{bandWord}</span>
                  <ArrowUpRight className="w-3 h-3 text-ink-500 group-hover:text-ink-200 justify-self-end" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-2.5 flex items-baseline justify-between gap-3 flex-wrap">
        <p className="text-caption text-ink-500 max-w-measure">{rail.scopeLine}</p>
        <Link
          href="/state-of-bitcoin#movers"
          className="inline-flex items-center gap-1 text-caption text-accent hover:text-accent-soft whitespace-nowrap transition-colors"
        >
          Full market snapshot
          <ArrowUpRight className="w-3 h-3" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
