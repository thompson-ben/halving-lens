import { briefStat, type EvidenceBrief } from "@/lib/evidenceBriefs";

// The single live figure at the heart of an Evidence Brief: a large headline
// number and a compact horizontal-bar visual, both recomputed from source at
// render time. Server component — no interactivity, no fabricated numbers.

const ACCENT = "#5eead4";

export function BriefEvidence({ brief }: { brief: EvidenceBrief }) {
  const stat = briefStat(brief);

  if (!stat.available) {
    return (
      <div className="card p-6 text-center">
        <div className="font-display text-[40px] text-ink-500">—</div>
        <p className="mt-2 text-[13px] text-ink-400">{stat.statement}</p>
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-8 relative">
      {/* Headline figure */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-x-6 gap-y-3">
        <div className="font-display text-[64px] sm:text-[76px] leading-none tracking-tight-2" style={{ color: ACCENT }}>
          {stat.headline}
        </div>
        <div className="pb-1.5">
          <p className="text-[15px] leading-snug text-ink-100 max-w-sm">{stat.statement}</p>
          {stat.sub && <p className="mt-1.5 text-[13px] text-ink-400">{stat.sub}</p>}
        </div>
      </div>

      {/* Bars */}
      {stat.bars.length > 0 && (
        <div className="mt-7 space-y-2.5">
          {stat.bars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-3">
              <div className="w-[42%] sm:w-[34%] shrink-0 text-[12px] text-ink-300 text-right">{bar.label}</div>
              <div className="flex-1 h-6 rounded-md bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-md flex items-center justify-end pr-2"
                  style={{
                    width: `${Math.max(bar.pct, 4)}%`,
                    background: bar.highlight ? "rgba(94,234,212,0.28)" : "rgba(255,255,255,0.09)",
                    borderRight: bar.highlight ? `2px solid ${ACCENT}` : "none",
                  }}
                >
                  <span className={`font-mono text-[11.5px] ${bar.highlight ? "text-accent" : "text-ink-300"}`}>{bar.value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {stat.barCaption && <p className="mt-4 text-[11.5px] text-ink-500">{stat.barCaption}</p>}
      <p className="mt-1 text-[11px] text-ink-600">{stat.rangeLabel} · recomputed live from source.</p>

      <div className="watermark">halvinglens.com · {brief.id}</div>
    </div>
  );
}
