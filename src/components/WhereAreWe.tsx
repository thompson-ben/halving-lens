import { cycleSummary } from "@/lib/cycleSummary";
import { cycleStatus } from "@/lib/stateOfBitcoin";

// "Where Are We?" — the opening orientation for The State of Bitcoin, and the
// visual HalvingLens wants people to remember it by. Not a chart, not a gauge,
// not a progress bar: a calm, editorial trail through the named chapters every
// halving cycle has historically moved through, with today marked "You are
// here". Pure orientation — no axes, no price, no forecast. The chapters ahead
// are the known SHAPE of a four-year cycle (structure, not a prediction); the
// evidence for where we sit lives in the sections below.

// The timeless chapter spine — the structural stages of a halving cycle, by how
// far through the four years we are. Deliberately fixed and simple so the hero
// stays recognisable while the deep-dives below evolve.
const CHAPTERS: { short: string; lo: number; hi: number }[] = [
  { short: "Accumulation", lo: 0, hi: 20 },
  { short: "Expansion", lo: 20, hi: 45 },
  { short: "Mid-Cycle", lo: 45, hi: 70 },
  { short: "Late-Cycle", lo: 70, hi: 90 },
  { short: "Pre-Halving", lo: 90, hi: 100 },
];

const ACCENT = "#5eead4";
const VIOLET = "#a78bfa";

export function WhereAreWe() {
  const s = cycleSummary();
  const status = cycleStatus();
  const progress = Math.max(0, Math.min(100, s.progressPct));

  let currentIdx = CHAPTERS.findIndex((c) => progress >= c.lo && progress < c.hi);
  if (currentIdx < 0) currentIdx = CHAPTERS.length - 1; // 100% → Pre-Halving
  const cur = CHAPTERS[currentIdx];

  // Exact "you are here" position along the rail: which chapter, plus how far
  // through it — so the marker is precise without turning into a percentage read.
  const frac = Math.max(0, Math.min(1, (progress - cur.lo) / (cur.hi - cur.lo || 1)));
  const markerPct = ((currentIdx + frac) / CHAPTERS.length) * 100;
  const center = (i: number) => ((i + 0.5) / CHAPTERS.length) * 100;

  return (
    <section aria-label="Where are we in the Bitcoin cycle" className="pt-2">
      <div className="text-[11px] uppercase tracking-[0.28em] text-accent mb-6">Where are we?</div>

      {/* The trail */}
      <div className="relative mx-auto max-w-3xl px-1" style={{ height: 92 }}>
        {/* rail — faint full length, then the travelled portion in brand gradient */}
        <div className="absolute left-0 right-0" style={{ top: 40 }}>
          <div className="h-[2px] w-full rounded-full bg-white/[0.08]" />
          <div
            className="absolute top-0 left-0 h-[2px] rounded-full"
            style={{ width: `${markerPct}%`, background: `linear-gradient(90deg, ${ACCENT}, ${VIOLET})` }}
          />
        </div>

        {/* chapter nodes */}
        {CHAPTERS.map((c, i) => {
          const done = i < currentIdx;
          const isCurrent = i === currentIdx;
          const left = center(i);
          return (
            <div key={c.short} className="absolute -translate-x-1/2" style={{ left: `${left}%`, top: 0, width: 96 }}>
              <div className="flex flex-col items-center">
                {/* node */}
                <div className="relative" style={{ height: 48, display: "flex", alignItems: "center" }}>
                  {isCurrent ? (
                    <span className="relative flex items-center justify-center">
                      <span className="absolute w-6 h-6 rounded-full" style={{ background: ACCENT, opacity: 0.18 }} />
                      <span className="w-3.5 h-3.5 rounded-full" style={{ background: ACCENT, boxShadow: `0 0 0 3px #05070a, 0 0 14px ${ACCENT}` }} />
                    </span>
                  ) : (
                    <span
                      className="rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        background: done ? "rgba(94,234,212,0.55)" : "transparent",
                        border: done ? "none" : "1.5px solid rgba(255,255,255,0.22)",
                      }}
                    />
                  )}
                </div>
                {/* label */}
                <div
                  className={`mt-1 text-center text-[11px] leading-tight ${
                    isCurrent ? "text-ink-100 font-medium" : done ? "text-ink-400" : "text-ink-600"
                  }`}
                >
                  {c.short}
                </div>
              </div>
            </div>
          );
        })}

        {/* "You are here" flag on the current position */}
        <div className="absolute -translate-x-1/2" style={{ left: `${markerPct}%`, top: -2 }}>
          <div className="text-[9.5px] uppercase tracking-[0.16em] text-accent whitespace-nowrap font-medium">You are here</div>
        </div>
      </div>

      {/* The answer, in plain words */}
      <div className="text-center mt-7 max-w-2xl mx-auto">
        <div className="text-[10.5px] uppercase tracking-[0.2em] text-ink-500 mb-2">Current chapter</div>
        <h2 className="font-display text-[30px] sm:text-[40px] leading-[1.08] tracking-tightest text-ink-50">
          {s.phaseLabel}
        </h2>
        <p className="mt-3 text-[14.5px] text-ink-300 leading-relaxed">{status.sentence}</p>
        <p className="mt-4 text-[11px] text-ink-600 leading-relaxed">
          The stages every halving cycle has historically moved through. This is where we are today —
          not where price goes next. The evidence is below.
        </p>
      </div>
    </section>
  );
}
