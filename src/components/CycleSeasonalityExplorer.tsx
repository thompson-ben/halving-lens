"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Mode, SeriesKey } from "@/lib/seasonalityCore";
import type { CycleSeasonalityPayload, CompactCycleCell } from "@/lib/cycleSeasonalityPayload";
import type { CycleSpan } from "@/lib/cycleSeasonality";
import { HeadingButton, highlightShadow, type Highlight } from "./seasonalityHighlight";

// The Cycle-Aligned Seasonality explorer (PR-V2B). Rows are cycles, columns
// are months since halving (transposed on mobile). Everything is precomputed
// in the payload — no filters, no client recomputation. Cells distinguish
// FIVE states with distinct visuals AND accessible labels (founder
// requirement): a complete anchored month (solid), a completed cycle's final
// partial stub (thin dashed neutral border), the current cycle's
// month-to-date (thicker dashed accent border), a month not observed in a
// series' window (faint, disabled), and a month outside the cycle's span
// (blank, disabled). A historical stub is never presented as a full month
// or as the live current month. Initial desktop positioning scrolls ONLY
// the grid container; the quiet jump controls cover both directions.

function cellColor(value: number | null, partial: boolean): string {
  if (value == null) return "rgba(255,255,255,0.03)";
  const a = Math.abs(value);
  const tier = a >= 15 ? 0.42 : a >= 5 ? 0.26 : 0.13;
  const bg = value > 0 ? `rgba(61,220,151,${tier})` : value < 0 ? `rgba(255,93,93,${tier})` : "rgba(255,255,255,0.06)";
  return partial ? bg.replace(/[\d.]+\)$/, "0.10)") : bg;
}

const fmtV = (v: number): string => `${v > 0 ? "+" : ""}${v}%`;

interface CellState {
  kind: "complete" | "stub" | "mtd" | "unobserved" | "outside";
  value: number | null;
}

/** One shared state resolver + label helper — the five states carry DISTINCT
 *  visual treatments and DISTINCT accessible labels on both layouts. */
function cellState(span: CycleSpan, month: number, hit: [number, 0 | 1] | undefined): CellState {
  const monthsInSpan = spanMonths(span);
  if (month >= monthsInSpan) return { kind: "outside", value: null };
  if (!hit) return { kind: "unobserved", value: null };
  if (hit[1] === 1) return { kind: span.completed ? "stub" : "mtd", value: hit[0] };
  return { kind: "complete", value: hit[0] };
}

/** Months a cycle's span reaches (complete + its clipped final month). */
function spanMonths(span: CycleSpan): number {
  // Derived client-side from the anchor/end pair the payload carries: count
  // anchored months whose start precedes the span end.
  let k = 0;
  while (addMonths(span.anchor, k) < span.endExclusive) k++;
  return k;
}

const DIM = (y: number, m: number): number =>
  [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
function addMonths(iso: string, k: number): string {
  const y0 = Number(iso.slice(0, 4)); const m0 = Number(iso.slice(5, 7)); const d0 = Number(iso.slice(8, 10));
  const y = y0 + Math.floor((m0 - 1 + k) / 12); const m = ((m0 - 1 + k) % 12 + 12) % 12 + 1;
  return `${y}-${String(m).padStart(2, "0")}-${String(Math.min(d0, DIM(y, m))).padStart(2, "0")}`;
}

function cellAria(span: CycleSpan, month: number, s: CellState): string {
  const name = `${span.label}, month ${month}`;
  switch (s.kind) {
    case "complete":
      return `${name}: ${fmtV(s.value!)}. Open details.`;
    case "stub":
      return `${name}: ${fmtV(s.value!)}, partial final month — the cycle ended ${span.endExclusive}. Open details.`;
    case "mtd":
      return `${name}: ${fmtV(s.value!)}, month to date. Open details.`;
    case "unobserved":
      return `${name}: not observed in this series' window`;
    case "outside":
      return span.completed
        ? `${name}: the cycle ended before this month`
        : `${name}: not yet occurred`;
  }
}

/** Border treatment per state — the stub (thin dashed neutral) and the
 *  month-to-date (thicker dashed accent) differ by width AND colour, and
 *  both differ from complete months; labels carry the meaning regardless. */
function stateClasses(kind: CellState["kind"]): string {
  if (kind === "stub") return "border border-dashed border-white/30";
  if (kind === "mtd") return "border-2 border-dashed border-accent/70";
  return "";
}

export function CycleSeasonalityExplorer({ payload }: { payload: CycleSeasonalityPayload }) {
  const [mode, setMode] = useState<Mode>("returns");
  const [series, setSeries] = useState<SeriesKey>("market");
  const [picked, setPicked] = useState<{ cycleId: number; month: number } | null>(null);
  const [hover, setHover] = useState<{ cycleId: number; month: number; x: number; y: number } | null>(null);
  const [highlight, setHighlight] = useState<Highlight>(null);
  const pinOrigin = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const mobileRows = useRef<Record<number, HTMLElement | null>>({});

  const closePicked = () => {
    setPicked(null);
    pinOrigin.current?.focus();
    pinOrigin.current = null;
  };

  // Escape peels the topmost layer: detail sheet first, then the highlight.
  useEffect(() => {
    if (!picked && !highlight) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (picked) closePicked();
      else setHighlight(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, highlight]);

  useEffect(() => {
    if (picked) closeBtn.current?.focus();
  }, [picked]);

  // Initial desktop positioning: bring the current month into view by
  // scrolling ONLY the grid container — the document never moves.
  const curMonth = payload.position?.month ?? 0;
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = Math.max(0, (curMonth - 5) * 44);
  }, [curMonth]);

  const gridKey = `${mode}:${series}` as const;
  const grid = payload.grids[gridKey];
  const byKey = useMemo(() => {
    const m = new Map<string, [number, 0 | 1]>();
    for (const [cid, month, v, p] of (grid?.cells ?? []) as CompactCycleCell[]) m.set(`${cid}-${month}`, [v, p]);
    return m;
  }, [grid]);

  const months = Array.from({ length: payload.horizon + 1 }, (_, i) => i);
  const meta = payload.series[series];
  const valuationOnMarket = mode === "valuation" && series === "market";
  const valueLabel =
    mode === "returns"
      ? `Monthly change of ${meta.label}, by months since halving`
      : `Average distance of Market Price vs ${meta.label}`;

  // Highlight semantics on this grid: "month" = month-since-halving column,
  // "year" carries the cycleId (the shared type's field name).
  const hlMonth = highlight?.kind === "month" ? highlight.month : highlight?.kind === "cell" ? highlight.month : null;
  const hlCycle = highlight?.kind === "year" ? highlight.year : highlight?.kind === "cell" ? highlight.year : null;
  const isHlCell = (cid: number, m: number) => highlight?.kind === "cell" && highlight.year === cid && highlight.month === m;
  const inCross = (cid: number, m: number) => !isHlCell(cid, m) && (cid === hlCycle || m === hlMonth);
  const toggleMonth = (m: number) => setHighlight(highlight?.kind === "month" && highlight.month === m ? null : { kind: "month", month: m });
  const toggleCycle = (cid: number) => setHighlight(highlight?.kind === "year" && highlight.year === cid ? null : { kind: "year", year: cid });

  const stateAt = (span: CycleSpan, m: number) => cellState(span, m, byKey.get(`${span.id}-${m}`));
  const activePick = picked ?? (hover ? { cycleId: hover.cycleId, month: hover.month } : null);
  const activeSpan = activePick ? payload.spans.find((s) => s.id === activePick.cycleId) : undefined;
  const activeState = activePick && activeSpan ? stateAt(activeSpan, activePick.month) : undefined;

  const jumpToCurrent = () => {
    if (scroller.current) scroller.current.scrollLeft = Math.max(0, (curMonth - 5) * 44);
    mobileRows.current[curMonth]?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  const jumpToStart = () => {
    if (scroller.current) scroller.current.scrollLeft = 0;
    mobileRows.current[0]?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const renderCell = (span: CycleSpan, m: number, layout: "desktop" | "mobile") => {
    const s = stateAt(span, m);
    const clickable = s.value != null;
    const selected = isHlCell(span.id, m);
    return (
      <button
        key={`${span.id}-${m}`}
        onMouseMove={layout === "desktop" ? (e) => setHover({ cycleId: span.id, month: m, x: e.clientX, y: e.clientY }) : undefined}
        onClick={clickable ? (e) => { pinOrigin.current = e.currentTarget; setPicked({ cycleId: span.id, month: m }); setHighlight({ kind: "cell", year: span.id, month: m }); } : undefined}
        disabled={!clickable}
        aria-label={cellAria(span, m, s)}
        className={`h-7 rounded-[4px] text-[10px] tabular-nums transition-[transform] duration-200 focus-visible:relative focus-visible:z-10 disabled:cursor-default ${clickable && layout === "desktop" ? "hover:scale-[1.06] hover:z-10" : ""} ${stateClasses(s.kind)} ${selected ? "relative z-[5]" : ""}`}
        style={{
          background: s.kind === "outside" ? "transparent" : cellColor(s.value, s.kind === "stub" || s.kind === "mtd"),
          boxShadow: highlightShadow(selected, inCross(span.id, m)),
        }}
      />
    );
  };

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(["returns", "valuation"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setPicked(null); }}
              className={`px-3.5 py-1.5 rounded-lg text-[12.5px] border transition-colors ${mode === m ? "border-accent/40 bg-accent/[0.08] text-accent" : "border-white/[0.08] text-ink-400 hover:text-ink-200"}`}
            >
              {m === "returns" ? "Monthly returns" : "vs reference price"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["market", "trend", "holders", "miners"] as SeriesKey[]).map((s) => {
            const disabled = mode === "valuation" && s === "market";
            return (
              <button
                key={s}
                onClick={() => { if (!disabled) { setSeries(s); setPicked(null); } }}
                disabled={disabled}
                title={disabled ? "Market Price can't be measured against itself — pick a reference price." : undefined}
                className={`px-3 py-1.5 rounded-lg text-[12px] border transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${series === s ? "border-accent/40 bg-accent/[0.08] text-accent" : "border-white/[0.08] text-ink-400 hover:text-ink-200"}`}
              >
                {payload.series[s].label}
                {payload.series[s].nature === "estimated" && <span className="ml-1.5 text-[9px] uppercase tracking-[0.1em] text-signal-violet">est</span>}
              </button>
            );
          })}
        </div>
      </div>

      {valuationOnMarket ? (
        <div className="card p-6 text-[13.5px] text-ink-300 leading-relaxed max-w-2xl">
          Market Price can&apos;t be measured against itself. Pick the 200-Day Average, Realised
          Price or Est. Mining Cost to see how far the market traded from that reference through
          each cycle&apos;s months.
        </div>
      ) : (
        <>
          {/* Quiet grid navigation — scrolls the grid, never the document */}
          <div className="flex items-center gap-3 -mt-3 text-[11.5px]">
            <button onClick={jumpToStart} className="text-ink-400 hover:text-ink-100 underline decoration-ink-700 underline-offset-2 transition-colors">
              Start at month 0
            </button>
            <span className="text-ink-700">·</span>
            <button onClick={jumpToCurrent} className="text-ink-400 hover:text-ink-100 underline decoration-ink-700 underline-offset-2 transition-colors">
              Jump to current month ({curMonth})
            </button>
          </div>

          {/* Desktop: cycles as rows, months 0–horizon as columns, grid-only
              horizontal scroll with a sticky cycle-label column. */}
          <div className="hidden sm:block overflow-x-auto" ref={scroller} onMouseLeave={() => setHover(null)}>
            <div className="inline-grid" style={{ gridTemplateColumns: `4.2rem repeat(${months.length}, 2.5rem)`, gap: 2 }}>
              <div className="sticky left-0 z-10 bg-ink-950" />
              {months.map((m) => (
                <HeadingButton
                  key={m}
                  label={String(m)}
                  fullName={`month ${m}`}
                  axis="column"
                  active={hlMonth === m && highlight?.kind === "month"}
                  isCurrent={m === curMonth}
                  onToggle={() => toggleMonth(m)}
                  className="text-center text-[9.5px] pb-1"
                />
              ))}
              {payload.spans.map((span) => (
                <CycleRowLabelAndCells key={span.id} span={span}>
                  <div className="sticky left-0 z-10 bg-ink-950 leading-7 text-right">
                    <HeadingButton
                      label={span.label.slice(0, 4)}
                      fullName={span.label}
                      axis="row"
                      active={hlCycle === span.id && highlight?.kind === "year"}
                      isCurrent={!span.completed}
                      onToggle={() => toggleCycle(span.id)}
                      className="text-[10.5px] pr-2 text-right leading-7 w-full"
                    />
                  </div>
                  {months.map((m) => renderCell(span, m, "desktop"))}
                </CycleRowLabelAndCells>
              ))}
            </div>
          </div>

          {/* Mobile: transposed — months as rows (natural vertical scroll),
              cycles as columns. No horizontal scrolling at all. */}
          <div className="sm:hidden">
            <div className="grid" style={{ gridTemplateColumns: `2.6rem repeat(${payload.spans.length}, minmax(0, 1fr))`, gap: 2 }}>
              <div />
              {payload.spans.map((span) => (
                <HeadingButton
                  key={span.id}
                  label={span.short}
                  fullName={span.label}
                  axis="column"
                  active={hlCycle === span.id && highlight?.kind === "year"}
                  isCurrent={!span.completed}
                  onToggle={() => toggleCycle(span.id)}
                  className="text-center text-[10px] pb-1"
                />
              ))}
              {months.map((m) => (
                <CycleRowLabelAndCells key={m} span={null}>
                  <div
                    ref={(el) => { mobileRows.current[m] = el; }}
                    className="leading-7 text-right"
                  >
                    <HeadingButton
                      label={`M${m}`}
                      fullName={`month ${m}`}
                      axis="row"
                      active={hlMonth === m && highlight?.kind === "month"}
                      isCurrent={m === curMonth}
                      onToggle={() => toggleMonth(m)}
                      className="text-[9.5px] pr-1.5 text-right leading-7 w-full"
                    />
                  </div>
                  {payload.spans.map((span) => renderCell(span, m, "mobile"))}
                </CycleRowLabelAndCells>
              ))}
            </div>
          </div>

          {/* Cell-state legend — the five states, named the way the labels
              speak them; colour is never the only cue. */}
          <p className="text-[11px] text-ink-500 leading-relaxed max-w-3xl">
            Solid cells are complete anchored months. A thin dashed border marks a completed
            cycle&apos;s <span className="text-ink-300">partial final month</span> (cut short by the next
            halving); a thicker dashed <span className="text-accent">accent border</span> marks the current
            cycle&apos;s <span className="text-ink-300">month to date</span>. Faint cells are months a series
            doesn&apos;t observe; blank cells fall outside a cycle&apos;s span. {valueLabel}.
          </p>
        </>
      )}

      {/* Desktop hover tooltip */}
      {hover && activeState?.value != null && !picked && activeSpan && (
        <div
          className="hidden sm:block fixed z-40 pointer-events-none"
          style={{ left: Math.min(hover.x + 14, typeof window !== "undefined" ? window.innerWidth - 300 : hover.x), top: hover.y + 14 }}
        >
          <CycleTooltipCard span={activeSpan} month={hover.month} state={activeState} detail={payload.detail[`${activeSpan.id}-${hover.month}`]} valueLabel={valueLabel} standingClose={payload.standingClose} />
        </div>
      )}

      {/* Pinned detail — labelled dialog, close takes focus, Escape/close
          return focus to the activating cell (the PR162 contract). */}
      {picked && activeSpan && activeState?.value != null && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={`${activeSpan.label}, month ${picked.month} details`}
          className="fixed inset-x-0 bottom-0 z-50 p-3 sm:max-w-sm sm:left-auto sm:right-6 sm:bottom-6"
        >
          <div className="relative">
            <button
              ref={closeBtn}
              onClick={closePicked}
              aria-label="Close details"
              className="absolute -top-2 -right-2 z-10 w-7 h-7 rounded-full bg-ink-950 border border-white/[0.15] text-ink-300 text-[13px]"
            >
              ×
            </button>
            <CycleTooltipCard span={activeSpan} month={picked.month} state={activeState} detail={payload.detail[`${activeSpan.id}-${picked.month}`]} valueLabel={valueLabel} standingClose={payload.standingClose} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Fragment helper so both layouts express "a label plus its cells". */
function CycleRowLabelAndCells({ children }: { span: CycleSpan | null; children: React.ReactNode }) {
  return <>{children}</>;
}

function CycleTooltipCard({
  span, month, state, detail, valueLabel, standingClose,
}: {
  span: CycleSpan;
  month: number;
  state: CellState;
  detail: { config: string; asOf: string } | undefined;
  valueLabel: string;
  standingClose: string;
}) {
  const stateLine =
    state.kind === "stub"
      ? `Partial final month — the cycle ended ${span.endExclusive}.`
      : state.kind === "mtd"
        ? "Month to date — still running."
        : null;
  return (
    <div className="w-[280px] rounded-xl border border-white/[0.1] bg-[#0b0f15] shadow-2xl p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[12.5px] text-ink-200">{span.label} · month {month}</div>
        {state.kind !== "complete" && (
          <div className="text-[9.5px] uppercase tracking-[0.1em] text-ink-500">{state.kind === "mtd" ? "month to date" : "partial"}</div>
        )}
      </div>
      <div className={`mt-1 font-display text-[24px] leading-none tabular-nums ${state.value != null && state.value > 0 ? "text-signal-green" : state.value != null && state.value < 0 ? "text-signal-red" : "text-ink-300"}`}>
        {state.value != null ? fmtV(state.value) : "—"}
      </div>
      <div className="mt-1 text-[10.5px] text-ink-500">{valueLabel}</div>
      {stateLine && <div className="mt-2 text-[11px] text-ink-400">{stateLine}</div>}
      {detail && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500">Configuration · week of {detail.asOf}</div>
          <div className="mt-0.5 text-[12px] text-ink-200 leading-snug">{detail.config}</div>
        </div>
      )}
      <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[10px] text-ink-600">{standingClose}</div>
    </div>
  );
}
