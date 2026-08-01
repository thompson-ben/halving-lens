"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  currentContextFrom,
  deserializeCtx,
  inFilter,
  insightsFrom,
  MIN_INSIGHT_N,
  MONTHS,
  shareLabel,
  statsFromCells,
  type FilterContext,
  type Mode,
  type MonthCell,
  type SeriesKey,
  type WindowFilter,
} from "@/lib/seasonalityCore";
import type { GridPayload, MonthDetail, SeasonalityPayload } from "@/lib/seasonalityPayload";

// The Seasonality explorer (PR-C). All maths comes precomputed (cells) or
// recomputed client-side through the SAME pure core functions the server
// engine uses — no duplicated calculations, no data modules in the bundle.
// Interactions: mode / series / filter selectors, hover tooltip (desktop),
// tap bottom-sheet (mobile), and the transposed mobile grid with sticky
// month labels and year headings. No new analytics events — the page-level
// TrackedSection captures section_view / section_click / section_dwell.
//
// Highlighting (interaction PR): month and year headings toggle a row/column
// highlight; picking a cell sets a crosshair (cell + its month + its year).
// Pure visual state — it never feeds statsFromCells, inFilter or any other
// calculation, and it layers UNDER the filter treatment: member cells keep
// full opacity, non-members keep the 25% dimming, highlighted or not.

const GOLD = "#d9b96a";
const MON_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const FILTERS: { key: WindowFilter; label: string }[] = [
  { key: "all", label: "All years" },
  { key: "current-cycle", label: "Current cycle" },
  { key: "previous-cycles", label: "Previous cycles" },
  { key: "above-trend", label: "Above trend" },
  { key: "below-trend", label: "Below trend" },
  { key: "post-halving", label: "Post-halving years" },
  { key: "election", label: "US election years" },
  { key: "midterm", label: "US midterm years" },
];

const SERIES_ORDER: SeriesKey[] = ["market", "trend", "holders", "miners"];

/** Row/column/cell highlight — visual reading aid only, never a calculation
 *  input. "cell" carries a full crosshair (the cell plus its month + year). */
type Highlight =
  | { kind: "month"; month: number }
  | { kind: "year"; year: number }
  | { kind: "cell"; year: number; month: number }
  | null;

/** The two visual tiers under the selected cell itself: the crosshair ring on
 *  the exact cell, and a quiet inset accent on its row/column companions. */
function highlightShadow(isCell: boolean, inCross: boolean): string | undefined {
  if (isCell) return `0 0 0 2px ${GOLD}`;
  if (inCross) return "inset 0 0 0 1px rgba(217,185,106,0.4)";
  return undefined;
}

function cellColor(value: number | null, partial: boolean): { bg: string; fg: string } {
  if (value == null) return { bg: "rgba(255,255,255,0.03)", fg: "#525c6b" };
  const a = Math.abs(value);
  const tier = a >= 15 ? 0.42 : a >= 5 ? 0.26 : 0.13;
  const bg = value > 0 ? `rgba(61,220,151,${tier})` : value < 0 ? `rgba(255,93,93,${tier})` : "rgba(255,255,255,0.06)";
  return { bg: partial ? bg.replace(/[\d.]+\)$/, "0.10)") : bg, fg: "#e6ebf2" };
}

function fmtV(v: number): string {
  return `${v > 0 ? "+" : ""}${v}%`;
}

/** Rebuild the full grid (nulls included) from the compact payload. */
function expand(grid: GridPayload, curYear: number, curMonth: number): MonthCell[] {
  if (grid.firstYear == null) return [];
  const byKey = new Map<string, [number, 0 | 1]>();
  for (const [y, m, v, p] of grid.cells) byKey.set(`${y}-${m}`, [v, p]);
  const cells: MonthCell[] = [];
  for (let y = grid.firstYear; y <= curYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const hit = byKey.get(`${y}-${m}`);
      const future = y === curYear && m > curMonth;
      cells.push({
        year: y,
        month: m,
        value: hit && !future ? hit[0] : null,
        partial: hit ? hit[1] === 1 : false,
        nature: hit && !future ? "observed" : null,
      });
    }
  }
  return cells;
}

export function SeasonalityExplorer({ payload }: { payload: SeasonalityPayload }) {
  const [mode, setMode] = useState<Mode>("returns");
  const [series, setSeries] = useState<SeriesKey>("market");
  const [filter, setFilter] = useState<WindowFilter>("all");
  const [picked, setPicked] = useState<{ year: number; month: number } | null>(null);
  const [hover, setHover] = useState<{ year: number; month: number; x: number; y: number } | null>(null);
  const [highlight, setHighlight] = useState<Highlight>(null);
  // Accessibility: the cell that opened the detail sheet, so Escape/close can
  // return focus to it; the sheet's close button takes focus on open.
  const pinOrigin = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement | null>(null);

  const closePicked = () => {
    setPicked(null);
    pinOrigin.current?.focus();
    pinOrigin.current = null;
  };

  // Escape peels the topmost layer: an open detail sheet first, then the
  // row/column/cell highlight.
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

  const ctx = useMemo(() => deserializeCtx(payload.ctx), [payload.ctx]);
  const gridKey = `${mode}:${series}` as const;
  const grid = payload.grids[gridKey];
  const cells = useMemo(
    () => (grid ? expand(grid, payload.curYear, payload.curMonth) : []),
    [grid, payload.curYear, payload.curMonth],
  );
  const stats = useMemo(() => statsFromCells(cells, filter, ctx), [cells, filter, ctx]);
  const current = useMemo(
    () => currentContextFrom(cells, payload.curYear, payload.curMonth, payload.standingClose),
    [cells, payload.curYear, payload.curMonth, payload.standingClose],
  );
  const meta = payload.series[series];
  const windowLabel = grid?.windowFrom
    ? `observed ${grid.windowFrom.slice(0, 4)}–${payload.curYear}${filter === "all" ? "" : ` · ${FILTERS.find((f) => f.key === filter)?.label}`}`
    : "";
  const insights = useMemo(
    () => insightsFrom(stats, windowLabel, meta.nature === "estimated"),
    [stats, windowLabel, meta.nature],
  );

  const years = grid?.firstYear != null ? Array.from({ length: payload.curYear - grid.firstYear + 1 }, (_, i) => grid.firstYear! + i) : [];
  const cellAt = (y: number, m: number) => cells.find((c) => c.year === y && c.month === m);
  const valuationOnMarket = mode === "valuation" && series === "market";
  const share = shareLabel(mode, series);

  const detailFor = (y: number, m: number): MonthDetail | undefined => payload.detail[`${y}-${String(m).padStart(2, "0")}`];
  const valueLabel = mode === "returns" ? `Monthly change of ${meta.label}` : `Average distance of Market Price vs ${meta.label}`;

  const activePick = picked ?? (hover ? { year: hover.year, month: hover.month } : null);
  const activeCell = activePick ? cellAt(activePick.year, activePick.month) : undefined;
  const activeDetail = activePick ? detailFor(activePick.year, activePick.month) : undefined;

  // Filter visibility (UX PR): membership drives cell dimming; the scope line
  // counts the observations actually feeding the filtered statistics.
  const filterLabel = FILTERS.find((f) => f.key === filter)?.label ?? "";
  const filtering = filter !== "all";
  const isMember = (y: number, m: number) => !filtering || inFilter(y, m, filter, ctx);

  // Highlight derivations — a "cell" highlight is a crosshair (its month AND
  // year light up); heading toggles clear on reselection.
  const hlMonth = highlight?.kind === "month" ? highlight.month : highlight?.kind === "cell" ? highlight.month : null;
  const hlYear = highlight?.kind === "year" ? highlight.year : highlight?.kind === "cell" ? highlight.year : null;
  const isHlCell = (y: number, m: number) => highlight?.kind === "cell" && highlight.year === y && highlight.month === m;
  const inCross = (y: number, m: number) => !isHlCell(y, m) && (y === hlYear || m === hlMonth);
  const toggleMonth = (m: number) => setHighlight(highlight?.kind === "month" && highlight.month === m ? null : { kind: "month", month: m });
  const toggleYear = (y: number) => setHighlight(highlight?.kind === "year" && highlight.year === y ? null : { kind: "year", year: y });
  const observedCells = cells.filter((c) => c.value != null && !c.partial);
  const memberCount = filtering ? observedCells.filter((c) => inFilter(c.year, c.month, filter, ctx)).length : observedCells.length;
  const maxFilteredN = stats.length ? Math.max(...stats.map((s) => s.n)) : 0;

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
          <span className="mx-1 text-ink-600">·</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as WindowFilter)}
            aria-label="Window filter"
            className="bg-white/[0.03] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-[12.5px] text-ink-200"
          >
            {FILTERS.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {SERIES_ORDER.map((s) => {
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
          Price or Est. Mining Cost to see how far the market has historically traded from that
          reference through the year.
        </div>
      ) : grid?.windowFrom == null ? (
        <div className="card p-6 text-[13.5px] text-ink-300">This series has no observations yet.</div>
      ) : (
        <>
          {/* Live scope line — what the filter is (and isn't) affecting */}
          {filtering && (
            <p className="text-[12px] text-ink-400 leading-relaxed max-w-3xl -mt-3">
              Statistics and insights below cover the{" "}
              <span className="text-ink-100 tabular-nums">{memberCount}</span> member months of{" "}
              <span className="text-ink-100">{filterLabel}</span> (of {observedCells.length} observed).
              The heatmap always shows the full record — non-member months are dimmed.
            </p>
          )}

          {/* Desktop heatmap: years × months */}
          <div className="hidden sm:block" onMouseLeave={() => setHover(null)}>
            <div className="grid" style={{ gridTemplateColumns: "3.5rem repeat(12, minmax(0, 1fr))", gap: 2 }}>
              <div />
              {MON_SHORT.map((m, i) => (
                <HeadingButton
                  key={m}
                  label={m}
                  fullName={MONTHS[i]}
                  axis="column"
                  active={hlMonth === i + 1 && highlight?.kind === "month"}
                  isCurrent={i + 1 === payload.curMonth}
                  onToggle={() => toggleMonth(i + 1)}
                  className="text-center text-[10.5px] pb-1"
                />
              ))}
              {years.map((y) => (
                <YearRow
                  key={y}
                  y={y}
                  cellAt={cellAt}
                  curYear={payload.curYear}
                  curMonth={payload.curMonth}
                  isMember={isMember}
                  isHlCell={isHlCell}
                  inCross={inCross}
                  yearActive={hlYear === y && highlight?.kind === "year"}
                  onToggleYear={() => toggleYear(y)}
                  onHover={(m, e) => setHover({ year: y, month: m, x: e.clientX, y: e.clientY })}
                  onPick={(m, el) => { pinOrigin.current = el; setPicked({ year: y, month: m }); setHighlight({ kind: "cell", year: y, month: m }); }}
                />
              ))}
            </div>
          </div>

          {/* Mobile heatmap: transposed, months as rows, sticky labels. The
              scroll container stays inside the content column (no negative
              margins) so scrolled cells never peek past the sticky labels
              into the page gutter. */}
          <div className="sm:hidden overflow-x-auto">
            <div className="inline-grid" style={{ gridTemplateColumns: `2.6rem repeat(${years.length}, 2.4rem)`, gap: 2 }}>
              <div className="sticky left-0 z-10 bg-ink-950" />
              {years.map((y) => (
                <HeadingButton
                  key={y}
                  label={String(y).slice(2)}
                  fullName={String(y)}
                  axis="column"
                  active={hlYear === y && highlight?.kind === "year"}
                  isCurrent={y === payload.curYear}
                  onToggle={() => toggleYear(y)}
                  className="text-center text-[9.5px] pb-1"
                />
              ))}
              {MON_SHORT.map((mLabel, mi) => (
                <MobileRow
                  key={mLabel}
                  label={mLabel}
                  fullName={MONTHS[mi]}
                  month={mi + 1}
                  isCurrent={mi + 1 === payload.curMonth}
                  monthActive={hlMonth === mi + 1 && highlight?.kind === "month"}
                  onToggleMonth={() => toggleMonth(mi + 1)}
                  years={years}
                  curYear={payload.curYear}
                  curMonth={payload.curMonth}
                  isMember={isMember}
                  isHlCell={isHlCell}
                  inCross={inCross}
                  onPick={(yi, el) => { pinOrigin.current = el; setPicked({ year: years[yi], month: mi + 1 }); setHighlight({ kind: "cell", year: years[yi], month: mi + 1 }); }}
                  cells={years.map((y) => cellAt(y, mi + 1))}
                />
              ))}
            </div>
          </div>

          {/* Coverage note — honest windows, stated where the grid is */}
          <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-3xl">
            {meta.label}: {meta.nature === "estimated" ? "modelled" : meta.nature} from {grid.windowFrom}. Earlier
            cells are neutral — the record before a series exists is never guessed. Realised Price is observed from
            2022-07-26; Est. Mining Cost is modelled from 2016-01-04.
          </p>

          {/* This month in context */}
          <section className="card-glow p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
              <div className="text-[10.5px] uppercase tracking-[0.22em]" style={{ color: GOLD }}>
                This {current.label} in historical context
              </div>
              <div className="text-[10px] text-ink-500">always vs this month&apos;s full record — unfiltered</div>
            </div>
            {current.mtdPct == null || current.stat == null ? (
              <p className="text-[13px] text-ink-400">Not enough completed history for this month yet.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-3">
                  <Stat label="Month to date" v={fmtV(current.mtdPct)} strong />
                  <Stat label="Historical average" v={fmtV(current.stat.avg)} />
                  <Stat label="Historical median" v={fmtV(current.stat.median)} />
                  <Stat label={share} v={`${current.stat.positivePct}% (n=${current.stat.n})`} />
                  <Stat label="Rank so far" v={current.rank ? `${ordinal(current.rank.position)} of ${current.rank.of}` : "—"} />
                </div>
                {current.similarYears.length > 0 && (
                  <p className="mt-4 text-[12.5px] text-ink-400">
                    Closest past {current.label}s by {mode === "returns" ? "return" : "distance"}:{" "}
                    <span className="text-ink-200">{current.similarYears.join(" · ")}</span>
                  </p>
                )}
                {current.sentence && <p className="mt-3 text-[13px] text-ink-300 leading-relaxed max-w-3xl">{current.sentence}</p>}
              </>
            )}
          </section>

          {/* Month-by-month table */}
          <section>
            <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
              Month by month{filtering && <span className="text-ink-400 normal-case tracking-normal"> · {filterLabel}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-ink-500">
                    <th className="py-2 pr-3 font-normal">Month</th>
                    <th className="py-2 pr-3 font-normal">Average</th>
                    <th className="py-2 pr-3 font-normal">Median</th>
                    <th className="py-2 pr-3 font-normal">{share}</th>
                    <th className="py-2 pr-3 font-normal">Best</th>
                    <th className="py-2 pr-3 font-normal">Worst</th>
                    <th className="py-2 pr-3 font-normal" title="Standard deviation of the month's observations">Typical variation</th>
                    <th className="py-2 font-normal">n</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {stats.map((s) => (
                    <tr key={s.month} className={s.month === payload.curMonth ? "bg-white/[0.02]" : ""}>
                      <td className="py-2 pr-3 text-ink-200">{s.label}</td>
                      <td className={`py-2 pr-3 tabular-nums ${s.avg > 0 ? "text-signal-green" : s.avg < 0 ? "text-signal-red" : "text-ink-300"}`}>{fmtV(s.avg)}</td>
                      <td className="py-2 pr-3 tabular-nums text-ink-300">{fmtV(s.median)}</td>
                      <td className="py-2 pr-3 tabular-nums text-ink-300">{s.positivePct}%</td>
                      <td className="py-2 pr-3 tabular-nums text-ink-400">{fmtV(s.best.value)} <span className="text-ink-600">’{String(s.best.year).slice(2)}</span></td>
                      <td className="py-2 pr-3 tabular-nums text-ink-400">{fmtV(s.worst.value)} <span className="text-ink-600">’{String(s.worst.year).slice(2)}</span></td>
                      <td className="py-2 pr-3 tabular-nums text-ink-400">±{s.dispersion} pts</td>
                      <td className="py-2 tabular-nums text-ink-500">{s.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Insights — never vanish silently: when the observation floor
              empties them, say so instead of unmounting the section. */}
          <section>
            <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
              What the record shows{filtering && <span className="text-ink-400 normal-case tracking-normal"> · {filterLabel}</span>}
            </div>
            {insights.length === 0 ? (
              <div className="card p-4 max-w-2xl">
                <p className="text-[13px] text-ink-300 leading-relaxed">
                  No insights at this filter — each month has fewer than {MIN_INSIGHT_N} observations
                  {maxFilteredN > 0 && <> (largest n = {maxFilteredN})</>}, below the floor for a
                  deterministic claim. The table above still shows the filtered statistics with their
                  sample sizes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.map((i) => (
                  <div key={i.text} className="card p-4">
                    <p className="text-[13px] text-ink-200 leading-relaxed">{i.text}</p>
                    <p className="mt-2 text-[10.5px] text-ink-500">
                      {i.window}
                      {i.estimated && <span className="ml-2 text-[9px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full border border-signal-violet/25 text-signal-violet bg-signal-violet/[0.08]">Estimated</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Desktop hover tooltip */}
      {hover && activeCell && !picked && (
        <div
          className="hidden sm:block fixed z-40 pointer-events-none"
          style={{ left: Math.min(hover.x + 14, typeof window !== "undefined" ? window.innerWidth - 300 : hover.x), top: hover.y + 14 }}
        >
          <TooltipCard cell={activeCell} detail={activeDetail} valueLabel={valueLabel} standingClose={payload.standingClose} />
        </div>
      )}

      {/* Detail sheet (mobile bottom sheet; click-pin on desktop). Dialog
          semantics: labelled, close button takes focus on open, Escape and
          the close control both return focus to the activating cell. */}
      {picked && activeCell && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={`${MONTHS[activeCell.month - 1]} ${activeCell.year} details`}
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
            <TooltipCard cell={activeCell} detail={activeDetail} valueLabel={valueLabel} standingClose={payload.standingClose} />
          </div>
        </div>
      )}
    </div>
  );
}

/** Distinct accessible label per cell state: valued (with month-to-date
 *  suffix), future, or no observation — meaning never rests on colour alone.
 *  The crosshair cell announces its selection. */
function cellAriaLabel(year: number, month: number, c: MonthCell | undefined, curYear: number, curMonth: number, selected = false): string {
  const name = `${MONTHS[month - 1]} ${year}`;
  const sel = selected ? " Selected." : "";
  if (c?.value != null) return `${name}: ${fmtV(c.value)}${c.partial ? ", month to date" : ""}.${sel} Open details.`;
  if (year === curYear && month > curMonth) return `${name}: not yet occurred`;
  return `${name}: no observation in this series' window`;
}

/** A month/year heading as a highlight toggle: aria-pressed carries the
 *  state, the underline marks selection without relying on colour, and the
 *  global focus ring covers keyboard visibility. */
function HeadingButton({
  label, fullName, axis, active, isCurrent, onToggle, className,
}: {
  label: string;
  fullName: string;
  axis: "row" | "column";
  active: boolean;
  isCurrent: boolean;
  onToggle: () => void;
  className: string;
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={active}
      aria-label={`Highlight the ${fullName} ${axis}`}
      className={`${className} rounded-[4px] transition-colors ${active ? "text-[#d9b96a] underline underline-offset-2 decoration-[#d9b96a]/70" : isCurrent ? "text-accent hover:text-ink-200" : "text-ink-500 hover:text-ink-200"}`}
    >
      {label}
    </button>
  );
}

function YearRow({
  y, cellAt, curYear, curMonth, isMember, isHlCell, inCross, yearActive, onToggleYear, onHover, onPick,
}: {
  y: number;
  cellAt: (y: number, m: number) => MonthCell | undefined;
  curYear: number;
  curMonth: number;
  isMember: (y: number, m: number) => boolean;
  isHlCell: (y: number, m: number) => boolean;
  inCross: (y: number, m: number) => boolean;
  yearActive: boolean;
  onToggleYear: () => void;
  onHover: (m: number, e: React.MouseEvent) => void;
  onPick: (m: number, el: HTMLElement) => void;
}) {
  return (
    <>
      <HeadingButton
        label={String(y)}
        fullName={String(y)}
        axis="row"
        active={yearActive}
        isCurrent={y === curYear}
        onToggle={onToggleYear}
        className="text-[10.5px] pr-2 text-right leading-7"
      />
      {Array.from({ length: 12 }, (_, i) => {
        const c = cellAt(y, i + 1);
        const hasValue = c?.value != null;
        const { bg, fg } = cellColor(c?.value ?? null, c?.partial ?? false);
        const selected = isHlCell(y, i + 1);
        return (
          <button
            key={i}
            onMouseMove={(e) => onHover(i + 1, e)}
            onClick={hasValue ? (e) => onPick(i + 1, e.currentTarget) : undefined}
            disabled={!hasValue}
            aria-label={cellAriaLabel(y, i + 1, c, curYear, curMonth, selected)}
            className={`h-7 rounded-[4px] text-[10px] tabular-nums transition-[transform,opacity] duration-200 hover:scale-[1.06] hover:z-10 focus-visible:relative focus-visible:z-10 disabled:cursor-default ${c?.partial ? "border border-dashed border-white/25" : ""} ${selected ? "relative z-10" : ""}`}
            style={{ background: bg, color: fg, opacity: isMember(y, i + 1) ? 1 : 0.25, boxShadow: highlightShadow(selected, inCross(y, i + 1)) }}
          >
            {/* In-cell values only where 12 columns give them room; colour +
                aria-label carry the meaning below lg. */}
            <span className="hidden lg:inline">{hasValue ? fmtV(c!.value!) : ""}</span>
          </button>
        );
      })}
    </>
  );
}

function MobileRow({
  label, fullName, month, isCurrent, monthActive, onToggleMonth, years, curYear, curMonth, isMember, isHlCell, inCross, cells, onPick,
}: {
  label: string;
  fullName: string;
  month: number;
  isCurrent: boolean;
  monthActive: boolean;
  onToggleMonth: () => void;
  years: number[];
  curYear: number;
  curMonth: number;
  isMember: (y: number, m: number) => boolean;
  isHlCell: (y: number, m: number) => boolean;
  inCross: (y: number, m: number) => boolean;
  cells: (MonthCell | undefined)[];
  onPick: (yearIndex: number, el: HTMLElement) => void;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 bg-ink-950 leading-7 text-right">
        <HeadingButton
          label={label}
          fullName={fullName}
          axis="row"
          active={monthActive}
          isCurrent={isCurrent}
          onToggle={onToggleMonth}
          className="text-[10px] pr-1.5 text-right leading-7 w-full"
        />
      </div>
      {cells.map((c, yi) => {
        const hasValue = c?.value != null;
        const { bg } = cellColor(c?.value ?? null, c?.partial ?? false);
        const selected = isHlCell(years[yi], month);
        return (
          <button
            key={yi}
            onClick={hasValue ? (e) => onPick(yi, e.currentTarget) : undefined}
            disabled={!hasValue}
            aria-label={cellAriaLabel(years[yi], month, c, curYear, curMonth, selected)}
            className={`h-7 rounded-[4px] transition-opacity duration-200 focus-visible:relative focus-visible:z-10 disabled:cursor-default ${c?.partial ? "border border-dashed border-white/25" : ""} ${selected ? "relative z-[5]" : ""}`}
            style={{ background: bg, opacity: isMember(years[yi], month) ? 1 : 0.25, boxShadow: highlightShadow(selected, inCross(years[yi], month)) }}
          />
        );
      })}
    </>
  );
}

function TooltipCard({
  cell, detail, valueLabel, standingClose,
}: {
  cell: MonthCell;
  detail: MonthDetail | undefined;
  valueLabel: string;
  standingClose: string;
}) {
  return (
    <div className="w-[280px] rounded-xl border border-white/[0.1] bg-[#0b0f15] shadow-2xl p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[12.5px] text-ink-200">{MONTHS[cell.month - 1]} {cell.year}</div>
        {cell.partial && <div className="text-[9.5px] uppercase tracking-[0.1em] text-ink-500">month to date</div>}
      </div>
      <div className={`mt-1 font-display text-[24px] leading-none tabular-nums ${cell.value != null && cell.value > 0 ? "text-signal-green" : cell.value != null && cell.value < 0 ? "text-signal-red" : "text-ink-300"}`}>
        {cell.value != null ? fmtV(cell.value) : "—"}
      </div>
      <div className="mt-1 text-[10.5px] text-ink-500">{valueLabel}</div>
      {detail?.config && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-500">Configuration</div>
          <div className="mt-0.5 text-[12px] text-ink-200 leading-snug">{detail.config}</div>
        </div>
      )}
      {(detail?.vsTrendPct != null || detail?.vsHoldersPct != null || detail?.vsMinersPct != null) && (
        <div className="mt-2.5 space-y-1 text-[11.5px]">
          {detail?.vsTrendPct != null && <Gap label="vs 200-Day Average" v={detail.vsTrendPct} />}
          {detail?.vsHoldersPct != null && <Gap label="vs Realised Price" v={detail.vsHoldersPct} />}
          {detail?.vsMinersPct != null && <Gap label="vs Est. Mining Cost" v={detail.vsMinersPct} est />}
        </div>
      )}
      {detail?.cycle && (
        <div className="mt-2.5 text-[10.5px] text-ink-500">Day {detail.cycle.day} of cycle {detail.cycle.n}</div>
      )}
      <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[10px] text-ink-600">{standingClose}</div>
    </div>
  );
}

function Gap({ label, v, est }: { label: string; v: number; est?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-400">
        {label}
        {est && <span className="ml-1.5 text-[8.5px] uppercase tracking-[0.1em] text-signal-violet">est</span>}
      </span>
      <span className={`tabular-nums ${v > 0 ? "text-signal-green" : v < 0 ? "text-signal-red" : "text-ink-300"}`}>{fmtV(v)}</span>
    </div>
  );
}

function Stat({ label, v, strong }: { label: string; v: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink-500">{label}</div>
      <div className={`mt-1 tabular-nums ${strong ? "font-display text-[22px] text-ink-50" : "text-[15px] text-ink-200"}`}>{v}</div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}
