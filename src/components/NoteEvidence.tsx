import { noteData, type ResearchNote } from "@/lib/researchNotes";

// The live data strip inside a Research Note — a compact labelled distribution,
// recomputed from source at render time. Server component; no fabricated numbers.

const ACCENT = "#5eead4";

export function NoteEvidence({ note }: { note: ResearchNote }) {
  const data = noteData(note);
  if (!data) return null;

  if (!data.available) {
    return (
      <div className="card p-6 text-center text-[13px] text-ink-400">
        This figure is unavailable until the underlying data has synced.
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-7 relative">
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-4">{data.title}</div>
      <div className="space-y-2.5">
        {data.rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <div className="w-[46%] sm:w-[38%] shrink-0 text-[12px] text-ink-300 text-right">{row.label}</div>
            <div className="flex-1 h-6 rounded-md bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-md flex items-center justify-end pr-2"
                style={{
                  width: `${Math.max(row.pct, 4)}%`,
                  background: row.highlight ? "rgba(94,234,212,0.28)" : "rgba(255,255,255,0.09)",
                  borderRight: row.highlight ? `2px solid ${ACCENT}` : "none",
                }}
              >
                <span className={`font-mono text-[11.5px] ${row.highlight ? "text-accent" : "text-ink-300"}`}>{row.value}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11.5px] text-ink-500">{data.caption}</p>
      <p className="mt-1 text-[11px] text-ink-600">{data.rangeLabel}</p>
      <div className="watermark">halvinglens.com · {note.id}</div>
    </div>
  );
}
