"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fmtUsd } from "@/lib/format";
import type { LensClientPayload, LensPayloadCycle } from "@/lib/lensPayload";

// The Lens (Cycle Dashboard V2, CD2) — the interactive heart of the Cycle
// Dashboard. Purely presentational: every number, sentence and unavailable
// state arrives pre-computed from the CD1 engine via the server payload.
// This component owns interaction (drag, touch, keyboard, URL state) and
// layout — it computes and phrases no market claims.
//
// The accessible range input is the canonical control; the pointer overlay
// is an enhancement of it, never the only way in.

const DAY_MS = 86_400_000;

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function dateAtDay(halvingIso: string, day: number): string {
  return dateFmt.format(new Date(Date.parse(`${halvingIso}T00:00:00Z`) + day * DAY_MS));
}

const fmtMult = (m: number): string => (m >= 10 ? `${m.toFixed(1)}×` : `${m.toFixed(2)}×`);
const fmtPct1 = (v: number): string => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`;

// Lifecycle → editorial treatment. Fresh developments carry the editorial
// accent; standing context stays quiet and says how long it has stood.
const LIFECYCLE_EYEBROW: Record<string, string> = {
  transition: "New at this point",
  recent: "Recent development",
  standing: "Standing context",
};

interface Geometry {
  w: number;
  h: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
  x: (day: number) => number;
  y: (mult: number) => number;
}

function useGeometry(payload: LensClientPayload, width: number): Geometry {
  return useMemo(() => {
    const w = width;
    const h = Math.max(260, Math.min(400, Math.round(w * 0.42)));
    const padL = 44;
    const padR = 46;
    const padT = 14;
    const padB = 26;
    let lo = Infinity;
    let hi = -Infinity;
    for (const c of payload.cycles) {
      for (const m of c.multiple) {
        if (m < lo) lo = m;
        if (m > hi) hi = m;
      }
    }
    const logLo = Math.log10(lo * 0.92);
    const logHi = Math.log10(hi * 1.08);
    const x = (day: number) => padL + (day / payload.maxDay) * (w - padL - padR);
    const y = (mult: number) => padT + (1 - (Math.log10(mult) - logLo) / (logHi - logLo)) * (h - padT - padB);
    return { w, h, padL, padR, padT, padB, x, y };
  }, [payload, width]);
}

const GRID_MULTS = [0.5, 1, 2, 5, 10, 20];

export function CycleLensExplorer({ payload, initialDay }: { payload: LensClientPayload; initialDay: number }) {
  const [day, setDay] = useState(initialDay);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(960);
  const geo = useGeometry(payload, width);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interacted = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // URL + live-region updates happen at an interaction BOUNDARY (debounced),
  // so scrubbing neither spams history nor screen readers.
  const commit = useCallback(
    (d: number) => {
      if (urlTimer.current) clearTimeout(urlTimer.current);
      urlTimer.current = setTimeout(() => {
        if (interacted.current) {
          const url = new URL(window.location.href);
          url.searchParams.set("day", String(d));
          window.history.replaceState(null, "", url);
        }
        if (liveRef.current) {
          const reached = d <= payload.currentCycleDay;
          const current = payload.cycles[payload.cycles.length - 1];
          liveRef.current.textContent = reached
            ? `Day ${d} — ${dateAtDay(current.halvingDate, d)} in the current cycle.`
            : `Day ${d} — beyond the current cycle's record; showing prior-cycle history.`;
        }
      }, 350);
    },
    [payload.currentCycleDay, payload.cycles],
  );

  const moveTo = useCallback(
    (d: number) => {
      const clamped = Math.min(Math.max(Math.round(d), 0), payload.maxDay);
      interacted.current = true;
      setDay(clamped);
      commit(clamped);
    },
    [payload.maxDay, commit],
  );

  // Pointer scrubbing over the chart — an enhancement over the range input.
  const dragging = useRef(false);
  const dayFromClientX = useCallback(
    (clientX: number) => {
      const el = wrapRef.current;
      if (!el) return day;
      const rect = el.getBoundingClientRect();
      const frac = (clientX - rect.left - geo.padL) / (geo.w - geo.padL - geo.padR);
      return frac * payload.maxDay;
    },
    [geo, payload.maxDay, day],
  );
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    moveTo(dayFromClientX(e.clientX));
  };
  const raf = useRef(0);
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const cx = e.clientX;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => moveTo(dayFromClientX(cx)));
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  // Chart paths — built once per payload/size, never per scrub.
  const paths = useMemo(
    () =>
      payload.cycles.map((c) => {
        let d = "";
        for (let i = 0; i <= c.lastDay; i++) {
          d += `${i === 0 ? "M" : "L"}${geo.x(i).toFixed(1)},${geo.y(c.multiple[i]).toFixed(1)}`;
        }
        return { cycle: c, d };
      }),
    [payload, geo],
  );

  const current = payload.cycles.find((c) => c.cycleId === 5)!;
  const priors = payload.cycles.filter((c) => c.cycleId !== 5);
  const reachedCurrent = day <= current.lastDay;
  const obs = day <= payload.currentCycleDay ? payload.observations[day] : 0;
  const cursorX = geo.x(day);

  const at = (c: LensPayloadCycle) =>
    day <= c.lastDay
      ? { date: dateAtDay(c.halvingDate, day), mult: c.multiple[day], dd: c.drawdown[day], mayer: c.mayer[day], price: c.multiple[day] * c.halvingPrice }
      : null;

  return (
    <div>
      {/* Selected-day readout — always visible, above the chart on mobile */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-stat tabular-nums text-ink-50 leading-none">Day {day}</span>
          <span className="text-caption text-ink-400">
            {reachedCurrent
              ? `${dateAtDay(current.halvingDate, day)} in the current cycle`
              : `beyond the current cycle's record (ends day ${current.lastDay})`}
          </span>
        </div>
        <span className="text-micro text-ink-500">of {payload.maxDay} · drag the chart or use the slider</span>
      </div>

      {/* The chart. Decorative duplicate of the slider's state — the range
          input below is the accessible control. */}
      <div
        ref={wrapRef}
        className="relative select-none touch-none cursor-ew-resize"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg width={geo.w} height={geo.h} aria-hidden="true" className="block max-w-full">
          {/* gridlines — hairlines only */}
          {GRID_MULTS.map((m) => (
            <g key={m}>
              <line x1={geo.padL} x2={geo.w - geo.padR} y1={geo.y(m)} y2={geo.y(m)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={geo.padL - 6} y={geo.y(m) + 3.5} textAnchor="end" fontSize={10} fill="#6f7c8e" fontFamily="var(--font-mono, monospace)">
                {m}×
              </text>
            </g>
          ))}
          {/* prior cycles — quiet context, still comparable */}
          {paths
            .filter((p) => p.cycle.cycleId !== 5)
            .map((p) => (
              <path key={p.cycle.cycleId} d={p.d} fill="none" stroke={p.cycle.color} strokeWidth={1.25} opacity={0.4} />
            ))}
          {/* current cycle — the protagonist: a soft halo under a heavier
              solid line, plus a standing endpoint marker at "you are here" */}
          {paths
            .filter((p) => p.cycle.cycleId === 5)
            .map((p) => (
              <g key={5}>
                <path d={p.d} fill="none" stroke="#5eead4" strokeWidth={7} opacity={0.14} />
                <path d={p.d} fill="none" stroke="#5eead4" strokeWidth={2.75} />
              </g>
            ))}
          <circle
            cx={geo.x(current.lastDay)}
            cy={geo.y(current.multiple[current.lastDay])}
            r={4}
            fill="#5eead4"
            stroke="#0a0e14"
            strokeWidth={1.5}
          />
          {/* end-of-line labels — cycles named directly, never colour-only */}
          {payload.cycles.map((c) => (
            <text
              key={c.cycleId}
              x={Math.min(geo.x(c.lastDay) + 5, geo.w - 4)}
              y={geo.y(c.multiple[c.lastDay]) + 3.5}
              fontSize={c.cycleId === 5 ? 11.5 : 10.5}
              fontWeight={c.cycleId === 5 ? 600 : 400}
              fill={c.cycleId === 5 ? "#5eead4" : "#8893a4"}
              fontFamily="var(--font-mono, monospace)"
            >
              {c.cycleId === 5 ? "Now" : c.year}
            </text>
          ))}
          {/* cursor */}
          <line x1={cursorX} x2={cursorX} y1={geo.padT} y2={geo.h - geo.padB} stroke="#d9b96a" strokeWidth={1.25} opacity={0.85} />
          {payload.cycles.map((c) => {
            const a = at(c);
            if (!a) return null;
            return (
              <circle
                key={c.cycleId}
                cx={cursorX}
                cy={geo.y(a.mult)}
                r={c.cycleId === 5 ? 4.5 : 3}
                fill={c.cycleId === 5 ? "#5eead4" : c.color}
                stroke="#0a0e14"
                strokeWidth={1.5}
              />
            );
          })}
          {geo.w >= 560 && (
            <text x={geo.padL} y={geo.h - 8} fontSize={10} fill="#6f7c8e" fontFamily="var(--font-mono, monospace)">
              days since halving →
            </text>
          )}
          <text x={geo.w - geo.padR} y={geo.h - 8} fontSize={10} fill="#6f7c8e" textAnchor="end" fontFamily="var(--font-mono, monospace)">
            × halving price · log scale
          </text>
        </svg>
      </div>

      {/* The canonical control */}
      <label className="block mt-1">
        <span className="sr-only">Cycle day</span>
        <input
          type="range"
          min={0}
          max={payload.maxDay}
          step={1}
          value={day}
          onChange={(e) => moveTo(Number(e.target.value))}
          aria-label="Cycle day"
          aria-valuetext={
            reachedCurrent
              ? `Day ${day} of ${payload.maxDay} — ${dateAtDay(current.halvingDate, day)} in the current cycle`
              : `Day ${day} of ${payload.maxDay} — beyond the current cycle's record`
          }
          className="lens-range w-full"
        />
      </label>
      <p ref={liveRef} aria-live="polite" className="sr-only" />

      {/* Beyond-current state — intentional, never broken */}
      {!reachedCurrent && (
        <p className="mt-4 text-body text-ink-200 leading-relaxed border-l-2 border-editorial/50 pl-3">
          The current cycle has not reached day {day} — its record ends at day {current.lastDay} ({dateAtDay(current.halvingDate, current.lastDay)}).
          The prior cycles' observed history continues below; the current cycle's path is never projected.
        </p>
      )}

      {/* The observation — the editorial interpretation of the chart */}
      {reachedCurrent && (
        <div className="mt-5">
          {obs !== 0 ? (
            <>
              <div className={`eyebrow ${obs.lifecycle === "standing" ? "text-ink-500" : "text-editorial"}`}>
                {LIFECYCLE_EYEBROW[obs.lifecycle]}
                {obs.lifecycle === "standing" && ` · since day ${obs.sinceDay}`}
              </div>
              <p className="mt-1.5 font-display text-headline text-ink-50 leading-snug max-w-measure">
                {payload.sentences[obs.s]}
              </p>
            </>
          ) : (
            <>
              <div className="eyebrow text-ink-500">The Lens</div>
              <p className="mt-1.5 text-body text-ink-400 leading-relaxed max-w-measure">
                No single comparison stands out at this day — nothing crosses the Lens&apos;s declared bar. A quiet reading is a finding, not a gap.
              </p>
            </>
          )}
        </div>
      )}

      {/* Readings at day D — the smallest useful comparison set */}
      <div className="mt-7">
        <div className="eyebrow text-accent mb-2">Every cycle at day {day}</div>
        <div className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
          {payload.cycles.map((c) => {
            const a = at(c);
            const isNow = c.cycleId === 5;
            return (
              <div key={c.cycleId} className="py-2.5 grid grid-cols-[auto_1fr] sm:grid-cols-[7.5rem_1fr] gap-x-4 items-baseline">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="w-2 h-2 rounded-full shrink-0" style={{ background: isNow ? "#5eead4" : c.color }} />
                  <span className={`text-body ${isNow ? "text-ink-50 font-medium" : "text-ink-300"}`}>
                    {isNow ? "Now (2024)" : `${c.year} cycle`}
                  </span>
                </div>
                {a ? (
                  <div className="flex items-baseline gap-x-4 gap-y-1 flex-wrap font-mono text-caption tabular-nums">
                    <span className={isNow ? "text-ink-100" : "text-ink-400"}>{a.date}</span>
                    <span className={isNow ? "text-ink-50" : "text-ink-200"}>{fmtUsd(a.price, { compact: true })}</span>
                    <span className={isNow ? "text-ink-50" : "text-ink-200"}>{fmtMult(a.mult)} from halving</span>
                    <span className={a.dd <= -0.05 ? "text-signal-red/90" : "text-ink-400"}>{a.dd.toFixed(1)}% from high</span>
                    {a.mayer != null && <span className={isNow ? "text-ink-200" : "text-ink-400"}>Mayer {a.mayer.toFixed(2)}</span>}
                  </div>
                ) : (
                  <div className="text-caption text-ink-500">
                    {c.completed ? `ended at day ${c.lastDay}` : `record ends at day ${c.lastDay} — the future has not happened yet`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* What happened next — observed history only, never the current cycle */}
      <div className="mt-6">
        <div className="eyebrow text-accent mb-1">What happened next · observed history</div>
        <p className="text-micro text-ink-500 mb-2.5">
          The real price change each completed cycle recorded after its day {day}. The current cycle shows nothing here — {payload.currentFutureReason.charAt(0).toLowerCase()}{payload.currentFutureReason.slice(1)}
        </p>
        <div className="divide-y divide-white/[0.05] border-y border-white/[0.05]">
          {priors.map((c) => {
            const reachedIt = day <= c.lastDay;
            return (
              <div key={c.cycleId} className="py-2 grid grid-cols-[auto_1fr] sm:grid-cols-[7.5rem_1fr] gap-x-4 items-baseline">
                <span className="text-body text-ink-300">{c.year} cycle</span>
                {reachedIt && c.fwd ? (
                  <div className="flex items-baseline gap-x-5 gap-y-1 flex-wrap font-mono text-caption tabular-nums">
                    {([30, 60, 90] as const).map((w) => {
                      const v = c.fwd![w][day];
                      return (
                        <span key={w} className="inline-flex items-baseline gap-1.5">
                          <span className="text-ink-500">+{w}d</span>
                          {v == null ? (
                            <span className="text-ink-500" title={`Cycle ${c.cycleId}'s record ends at day ${c.lastDay} — a full ${w}-day window from day ${day} is not observable.`}>
                              not observable
                            </span>
                          ) : (
                            <span className={v >= 0 ? "text-signal-green" : "text-signal-red"}>{fmtPct1(v)}</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <span className="text-caption text-ink-500">ended at day {c.lastDay}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
