import { metricChange, type MetricId } from "@/lib/metricChange";
import { snapshotWhatChanged } from "@/lib/snapshot";
import { TrackedLink } from "@/components/TrackedLink";

// Compact "what changed?" strip — a condensed sibling of the full WhatsChanged
// panel for pages that want the movement at a glance (Morning Brief, Weekly
// Report, Cycle Comparison). Reads the same shared metric-change service, so the
// numbers match the full panels and the Market Snapshot exactly.

const DEFAULT: MetricId[] = ["price", "market_health", "sentiment", "accumulation", "etf_flow"];
const TONE: Record<"good" | "bad" | "neutral", string> = { good: "text-accent", bad: "text-signal-red", neutral: "text-ink-300" };
const ARROW = { up: "↑", down: "↓", flat: "→" } as const;
const HEADLINE_TONE: Record<"good" | "bad" | "neutral" | "flag", string> = {
  good: "text-accent",
  bad: "text-signal-red",
  neutral: "text-ink-200",
  flag: "text-signal-amber",
};

export function SnapshotStrip({
  metrics = DEFAULT,
  title = "What changed this week",
  showHeadline = true,
}: {
  metrics?: MetricId[];
  title?: string;
  showHeadline?: boolean;
}) {
  const cards = metrics.map((id) => metricChange(id)).filter((m) => m.available);
  if (cards.length === 0) return null;
  const top = showHeadline ? snapshotWhatChanged(1)[0] : undefined;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-500">{title}</span>
        <TrackedLink href="/snapshot" event="snapshot_strip_click" props={{ title }} className="text-[11px] text-accent hover:text-accent-soft">
          Full snapshot →
        </TrackedLink>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
        {cards.map((m) => {
          const c7 = m.changes.find((c) => c.period === 7 && c.available) ?? m.changes.find((c) => c.available);
          return (
            <div key={m.id} className="min-w-0">
              <div className="text-[9.5px] uppercase tracking-[0.12em] text-ink-500 truncate">{m.name}</div>
              <div className="mt-0.5 text-[15px] font-display text-ink-50 tabular-nums leading-none">{m.currentLabel}</div>
              {c7 && c7.available ? (
                <div className={`mt-1 text-[11.5px] tabular-nums ${TONE[c7.good]}`} title={c7.asOfLabel ? `vs ${c7.asOfLabel}` : undefined}>
                  <span aria-hidden>{ARROW[c7.dir]}</span> {c7.pctLabel ?? c7.absLabel}
                </div>
              ) : (
                <div className="mt-1 text-[11.5px] text-ink-600">—</div>
              )}
            </div>
          );
        })}
      </div>
      {top && (
        <div className="mt-3.5 pt-3 border-t border-white/[0.06] text-[12.5px] leading-snug">
          <span className="text-ink-500">Most meaningful: </span>
          <span className={HEADLINE_TONE[top.tone]}>{top.title}</span>
        </div>
      )}
    </div>
  );
}
