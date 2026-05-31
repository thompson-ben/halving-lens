import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { whatChanged, type ChangeDir, type WatchLevel } from "@/lib/cycleSummary";
import { priorBrief } from "@/lib/briefArchive";

const LEVEL: Record<WatchLevel, string> = {
  elevated: "text-signal-amber border-signal-amber/25",
  watch: "text-accent border-accent/20",
  calm: "text-ink-400 border-white/[0.06]",
};

function DirIcon({ dir }: { dir: ChangeDir }) {
  if (dir === "up") return <ArrowUp size={14} className="text-signal-green" />;
  if (dir === "down") return <ArrowDown size={14} className="text-signal-red" />;
  return <Minus size={14} className="text-ink-400" />;
}

// "What changed since yesterday?" — the daily reason to come back. Compares
// today's live read against the most recent persisted brief. Never fabricates.
export function WhatChanged() {
  const change = whatChanged(priorBrief());

  return (
    <section>
      <div className="mb-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
          Daily change
        </div>
        <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          What changed since yesterday?
        </h2>
        <p className="mt-2.5 text-[14px] text-ink-300 max-w-2xl leading-relaxed">
          {change.available
            ? `A 30-second read on what moved since the last daily brief (${change.sinceDate}).`
            : "A daily read on what moved — comparing each day against the one before."}
        </p>
      </div>

      {change.available ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {change.items.map((it) => (
            <div key={it.area} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <DirIcon dir={it.direction} />
                  <h3 className="text-[13.5px] font-medium text-ink-100">{it.area}</h3>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full border text-[9.5px] font-medium uppercase tracking-wide ${LEVEL[it.level]}`}
                >
                  {it.level}
                </span>
              </div>
              <div className="mt-3 text-[13px] text-ink-100 leading-relaxed">{it.summary}</div>
              <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
                <span className="text-ink-500">Why it matters: </span>
                {it.why}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-6 lg:p-7">
          <p className="text-[14px] text-ink-300 leading-relaxed max-w-2xl">
            Daily comparison will appear after two daily syncs. We never fabricate a previous day&apos;s
            values — once a second day of real data is stored, you&apos;ll see exactly what changed
            here every morning.
          </p>
        </div>
      )}
    </section>
  );
}
