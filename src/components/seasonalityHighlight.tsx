"use client";

// Shared row/column/cell highlight primitives for the seasonality grids
// (extracted from SeasonalityExplorer in PR-V2B so the calendar and
// cycle-aligned explorers use ONE implementation — same semantics, same
// accessibility contract). Pure visual state: never a calculation input.

export const SEASONALITY_GOLD = "#d9b96a";

/** Row/column/cell highlight — "cell" carries a full crosshair (the cell
 *  plus its row and column companions). */
export type Highlight =
  | { kind: "month"; month: number }
  | { kind: "year"; year: number }
  | { kind: "cell"; year: number; month: number }
  | null;

/** The two visual tiers under the selected cell itself: the crosshair ring
 *  on the exact cell, and a quiet inset accent on its row/column
 *  companions. */
export function highlightShadow(isCell: boolean, inCross: boolean): string | undefined {
  if (isCell) return `0 0 0 2px ${SEASONALITY_GOLD}`;
  if (inCross) return "inset 0 0 0 1px rgba(217,185,106,0.4)";
  return undefined;
}

/** A month/year/cycle heading as a highlight toggle: aria-pressed carries
 *  the state, the underline marks selection without relying on colour, and
 *  the global focus ring covers keyboard visibility. */
export function HeadingButton({
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
