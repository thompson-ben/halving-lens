import { cycleSummary } from "@/lib/cycleSummary";
import { cycleStatus } from "@/lib/stateOfBitcoin";

// "Where Are We?" — the visual language of HalvingLens. Two scales of one truth:
//   • the RING is the mark — the four-year cycle as a loop of distinct chapters,
//     the current one lit, giving an instantly-ownable brand anchor.
//   • the JOURNEY is the story — a winding trail through those chapters with
//     today marked "You are here", the page's focal point.
// Pure orientation, deterministic, historical-context only. The chapters ahead
// are the known SHAPE of a cycle (structure), never a forecast. The evidence for
// where we sit lives in the sections below.

const RING_C = 753.98; // circumference at r=120

// The timeless chapter spine — the structural stages of a halving cycle, by how
// far through the four years we are. Fixed geometry (ring arcs proportional to
// each chapter's real span; journey nodes evenly spaced along a fixed meander),
// so the identity stays recognisable while only the *state* changes day to day.
interface Chapter {
  short: string;
  lo: number; // fraction of the cycle where this chapter starts
  hi: number;
  rot: number; // ring arc rotation (deg)
  dash: string; // ring arc dasharray
  node: [number, number]; // journey node position in the 720×150 viewBox
  labelLeft: number; // % across the trail for the HTML label
}

const CHAPTERS: Chapter[] = [
  { short: "Accumulation", lo: 0.0, hi: 0.2, rot: -87.84, dash: "141.8 753.98", node: [60, 96], labelLeft: 8.3 },
  { short: "Expansion", lo: 0.2, hi: 0.45, rot: -15.84, dash: "179.5 753.98", node: [210, 64], labelLeft: 29 },
  { short: "Mid-Cycle", lo: 0.45, hi: 0.7, rot: 74.16, dash: "179.5 753.98", node: [360, 84], labelLeft: 50 },
  { short: "Late-Cycle", lo: 0.7, hi: 0.9, rot: 164.16, dash: "141.8 753.98", node: [510, 58], labelLeft: 71 },
  { short: "Pre-Halving", lo: 0.9, hi: 1.0, rot: 236.16, dash: "66.4 753.98", node: [660, 80], labelLeft: 91.7 },
];

// Fixed cubic segments of the winding trail (Catmull-Rom through the nodes), so
// the "travelled so far" portion is just the segments up to today's chapter.
const SEGMENTS = [
  "C85,90.667 160,66 210,64",
  "C260,62 310,85 360,84",
  "C410,83 460,58.667 510,58",
  "C560,57.333 635,76.333 660,80",
];
const FULL_PATH = `M60,96 ${SEGMENTS.join(" ")}`;

const RING = { done: "rgba(94,234,212,0.5)", future: "rgba(94,234,212,0.14)" };

export function WhereAreWe() {
  const s = cycleSummary();
  const status = cycleStatus();
  const progress = Math.max(0, Math.min(100, s.progressPct));
  const pFrac = progress / 100;

  let currentIdx = CHAPTERS.findIndex((c) => pFrac >= c.lo && pFrac < c.hi);
  if (currentIdx < 0) currentIdx = CHAPTERS.length - 1;
  const cur = CHAPTERS[currentIdx];

  // Ring marker at today's exact position around the loop (arcs are proportional
  // to real chapter spans, so the marker uses overall progress).
  const ang = (-90 + pFrac * 360) * (Math.PI / 180);
  const mx = Math.round((160 + 120 * Math.cos(ang)) * 10) / 10;
  const my = Math.round((160 + 120 * Math.sin(ang)) * 10) / 10;

  // Journey: the trail travelled up to today's chapter node (the focal pin).
  const travelled = `M60,96 ${SEGMENTS.slice(0, currentIdx).join(" ")}`;
  const [pinX, pinY] = cur.node;
  const hereLeft = (pinX / 720) * 100;
  const hereTop = ((pinY - 26) / 150) * 100;

  return (
    <section aria-label="Where are we in the Bitcoin cycle" className="pt-2">
      {/* ── The mark + the answer ── */}
      <div className="flex flex-col items-center gap-7 text-center sm:flex-row sm:items-center sm:gap-9 sm:text-left">
        {/* RING — the brand mark, chapters as segments, today's chapter lit */}
        <svg viewBox="0 0 320 320" className="w-[128px] h-[128px] sm:w-[144px] sm:h-[144px] shrink-0" aria-hidden="true">
          <defs>
            <linearGradient id="waw-ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5eead4" />
              <stop offset="1" stopColor="#a78bfa" />
            </linearGradient>
            <filter id="waw-ring-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* faint full loop — the complete cycle underneath */}
          <circle cx="160" cy="160" r="120" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
          {CHAPTERS.map((c, i) => {
            const state = i < currentIdx ? "done" : i === currentIdx ? "current" : "future";
            if (state === "current") {
              return (
                <circle key={c.short} cx="160" cy="160" r="120" fill="none" stroke="url(#waw-ring-grad)" strokeWidth="14"
                  strokeDasharray={c.dash} transform={`rotate(${c.rot} 160 160)`} filter="url(#waw-ring-glow)" />
              );
            }
            return (
              <circle key={c.short} cx="160" cy="160" r="120" fill="none"
                stroke={state === "done" ? RING.done : RING.future}
                strokeWidth={state === "done" ? 9 : 6}
                strokeDasharray={c.dash} transform={`rotate(${c.rot} 160 160)`} />
            );
          })}
          {/* quiet marker — echoes the journey's focal point without competing */}
          <circle cx={mx} cy={my} r="7.5" fill="#5eead4" stroke="#080b10" strokeWidth="3.5" />
        </svg>

        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.28em] text-accent">Where are we?</div>
          <div className="mt-2 text-[10.5px] uppercase tracking-[0.2em] text-ink-500">Current chapter</div>
          <h2 className="mt-1 font-display font-medium tracking-tightest text-ink-50 leading-[1.04] text-[30px] sm:text-[38px]">
            {s.phaseLabel}
          </h2>
          <p className="mt-3 text-[14px] text-ink-300 leading-relaxed max-w-md">{status.sentence}</p>
        </div>
      </div>

      {/* ── The journey — a winding trail through the chapters ── */}
      <div className="mt-8 pt-7 border-t border-white/[0.06]">
        <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 text-center mb-3.5">The chapters of a Bitcoin cycle</div>
        <div className="relative mx-auto max-w-3xl">
          <svg viewBox="0 0 720 150" className="w-full h-auto" aria-hidden="true">
            <defs>
              <linearGradient id="waw-j-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#5eead4" />
                <stop offset="1" stopColor="#a78bfa" />
              </linearGradient>
              <filter id="waw-j-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* the full winding trail, faint */}
            <path d={FULL_PATH} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="2.5" />
            {/* travelled so far */}
            {currentIdx > 0 && (
              <path d={travelled} fill="none" stroke="url(#waw-j-grad)" strokeWidth="3.4" strokeLinecap="round" filter="url(#waw-j-glow)" />
            )}
            {/* chapter nodes: past confident, future whisper (current is the pin below) */}
            {CHAPTERS.map((c, i) => {
              if (i === currentIdx) return null;
              const [x, y] = c.node;
              return i < currentIdx ? (
                <circle key={c.short} cx={x} cy={y} r="4.2" fill="rgba(94,234,212,0.65)" />
              ) : (
                <circle key={c.short} cx={x} cy={y} r="4" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" />
              );
            })}
            {/* the focal point — You are here */}
            <circle className="waw-pulse" cx={pinX} cy={pinY} r="15" fill="#5eead4" opacity="0.5" />
            <circle cx={pinX} cy={pinY} r="17" fill="#5eead4" opacity="0.13" />
            <circle cx={pinX} cy={pinY} r="7.5" fill="#5eead4" stroke="#080b10" strokeWidth="2.5" filter="url(#waw-j-glow)" />
          </svg>
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 text-[11px] uppercase tracking-[0.16em] font-bold text-accent whitespace-nowrap pointer-events-none"
            style={{ left: `${hereLeft}%`, top: `${hereTop}%`, textShadow: "0 0 16px rgba(94,234,212,0.55)" }}
          >
            You are here
          </div>
        </div>
        {/* chapter labels */}
        <div className="relative mx-auto max-w-3xl h-5 mt-1">
          {CHAPTERS.map((c, i) => (
            <span
              key={c.short}
              className={`absolute -translate-x-1/2 text-[11px] leading-tight whitespace-nowrap ${
                i === currentIdx ? "text-ink-50 font-semibold" : i < currentIdx ? "text-ink-400" : "text-ink-600"
              }`}
              style={{ left: `${c.labelLeft}%` }}
            >
              {c.short}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-7 text-center text-[11px] text-ink-600 leading-relaxed max-w-xl mx-auto">
        Past chapters confident, today emphasised, the chapters beyond deliberately faint — the known shape of a
        four-year cycle. Where we are today, not where price goes next. The evidence is below.
      </p>
    </section>
  );
}
