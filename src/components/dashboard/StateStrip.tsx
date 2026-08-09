import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { DashboardStripState } from "@/lib/cycleDashboardIntel";

// State of the Cycle (CD3) — one concise strip, not three cards. Three
// independent dimensions with canonical state vocabularies; every word is
// quoted from the payload, which quotes the owning engine. Direction and
// state are carried in words — colour is never load-bearing here.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export function StateStrip({ states }: { states: DashboardStripState[] }) {
  return (
    <section aria-label="State of the cycle">
      <h2 className="eyebrow text-accent mb-2">State of the cycle</h2>
      <dl className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
        {states.map((s) => (
          <div key={s.id} className="grid grid-cols-[auto_1fr] sm:grid-cols-[8.5rem_1fr] gap-x-4 items-baseline py-2.5">
            <dt className="eyebrow text-ink-500">{s.label}</dt>
            <dd className="flex items-baseline gap-x-3 gap-y-1 flex-wrap min-w-0">
              {s.available ? (
                <>
                  <span className="text-subhead text-ink-50 font-medium">{s.stateLabel}</span>
                  {s.detail && <span className="font-mono text-caption tabular-nums text-ink-400">{s.detail}</span>}
                  {s.sinceDate && !s.sinceIsSeriesStart && (
                    <span className="text-caption text-ink-500">since {prettyDate(s.sinceDate)}</span>
                  )}
                  <Link
                    href={s.href}
                    className="inline-flex items-center gap-1 text-caption text-ink-400 hover:text-ink-100 transition-colors"
                  >
                    View
                    <ArrowUpRight className="w-3 h-3" aria-hidden />
                  </Link>
                </>
              ) : (
                <span className="text-caption text-ink-500">Not measurable — {s.unavailableReason}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
