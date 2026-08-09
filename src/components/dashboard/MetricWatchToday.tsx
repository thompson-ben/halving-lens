import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { MetricWatch, MetricWatchCandidate } from "@/lib/metricWatch";

// Metric Watch — today (CD3). Two first-class engine outputs with
// deliberately asymmetric treatment: Most Interesting is the page's one
// editorial event card; One to Watch is a quieter approach aside. Every
// market string is the engine's verbatim — this component performs layout
// only. When both are null the section renders one restrained quiet state
// using the engine-owned quiet line: no placeholders, no fake substitute.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

const LIFECYCLE_WORD = { transition: "New", recent: "Recent", standing: "Standing" } as const;

/** The movers' band vocabulary, member-facing: gold only at the two bands
 *  that mean something unusual happened; the evidence line always travels
 *  alongside (the historicalContext directly below). */
function BandChip({ c }: { c: MetricWatchCandidate }) {
  const sig = c.significance;
  if (!sig || sig.rarityState !== "available") return null;
  const label = sig.band.charAt(0).toUpperCase() + sig.band.slice(1);
  const tone =
    sig.band === "exceptional" || sig.band === "unusual"
      ? "border-editorial/35 bg-editorial/[0.08] text-editorial"
      : "border-white/12 bg-white/[0.03] text-ink-400";
  return <span className={`eyebrow px-2 py-0.5 rounded-full border ${tone}`}>{label}</span>;
}

function MostInteresting({ c, pageAsOf }: { c: MetricWatchCandidate; pageAsOf: string }) {
  const lagged = c.asOf < pageAsOf;
  return (
    <article className="card p-5 sm:p-6">
      <div className="eyebrow text-editorial">Most interesting · what deserves attention</div>
      <h3 className="mt-2.5 font-display text-headline font-medium tracking-tight-2 text-ink-50 leading-snug max-w-measure">
        {c.headline}
      </h3>
      <div className="mt-3 flex items-baseline gap-x-3 gap-y-1 flex-wrap">
        <span className="font-display text-stat leading-none tabular-nums text-ink-50">{c.currentLabel}</span>
        {c.movementLabel && <span className="font-mono text-subhead tabular-nums text-ink-200">{c.movementLabel}</span>}
        <BandChip c={c} />
      </div>
      <div className="mt-4 pt-3.5 border-t border-white/[0.06] space-y-1.5">
        <p className="text-body text-ink-200 leading-relaxed max-w-measure">{c.whyNoteworthy}</p>
        {c.historicalContext && <p className="text-caption text-ink-500">{c.historicalContext}</p>}
        {c.lifecycle && (
          <p className="text-caption text-ink-500">
            {LIFECYCLE_WORD[c.lifecycle.state]} — since {prettyDate(c.lifecycle.sinceDate)}
          </p>
        )}
      </div>
      <div className="mt-3.5 flex items-baseline justify-between gap-3 flex-wrap">
        <Link
          href={c.href}
          className="inline-flex items-center gap-1 text-caption text-accent hover:text-accent-soft transition-colors"
        >
          View {c.label}
          <ArrowUpRight className="w-3 h-3" aria-hidden />
        </Link>
        {lagged && <span className="text-micro text-ink-600">Measured to {prettyDate(c.asOf)}, this reading&apos;s latest observation.</span>}
      </div>
    </article>
  );
}

function OneToWatch({ c }: { c: MetricWatchCandidate }) {
  return (
    <aside className="border-l-2 border-editorial/50 pl-4">
      <div className="eyebrow text-ink-400">One to watch · approaching a meaningful state</div>
      <p className="mt-1.5 text-subhead text-ink-100 font-medium leading-snug max-w-measure">{c.headline}</p>
      <p className="mt-1 text-body text-ink-300 leading-relaxed max-w-measure">{c.whyNoteworthy}</p>
      {c.historicalContext && <p className="mt-1 text-caption text-ink-500 max-w-measure">{c.historicalContext}</p>}
      <Link
        href={c.href}
        className="mt-2 inline-flex items-center gap-1 text-caption text-ink-400 hover:text-ink-100 transition-colors"
      >
        View {c.label}
        <ArrowUpRight className="w-3 h-3" aria-hidden />
      </Link>
    </aside>
  );
}

export function MetricWatchToday({ watch, quietSupport }: { watch: MetricWatch; quietSupport: string }) {
  const quiet = watch.mostInteresting === null && watch.oneToWatch === null;
  return (
    <section aria-label="Metric Watch — today">
      <h2 className="eyebrow text-editorial mb-3">Metric Watch · today</h2>
      {quiet ? (
        <div>
          <p className="text-subhead text-ink-200 max-w-measure leading-relaxed">{watch.quietLine}</p>
          <p className="mt-1.5 text-caption text-ink-500 max-w-measure">{quietSupport}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {watch.mostInteresting && <MostInteresting c={watch.mostInteresting} pageAsOf={watch.asOf} />}
          {watch.oneToWatch && <OneToWatch c={watch.oneToWatch} />}
        </div>
      )}
    </section>
  );
}
