// Daily-close price archive — accessors and exact month-boundary primitives
// (Seasonality PR-A). Pure reads over the generated PRICE_ARCHIVE data;
// every function is deterministic and covered by scripts/test-price-archive.ts.
//
// Month methodology (founder-specified): a month's closing observation is the
// LAST AVAILABLE daily UTC close inside that calendar month, and a monthly
// return is that close versus the last available daily UTC close of the
// PREVIOUS month. A month with no observations yields null — never an
// interpolation.

import { PRICE_ARCHIVE } from "./priceArchiveData";
import type { OnchainPoint } from "./types";

export interface MonthClose {
  year: number;
  month: number; // 1–12
  date: string; // ISO day of the observation used
  close: number;
}

/** The archive, sorted ascending by date. The generated file is written
 *  sorted; sorting here is a cheap guarantee, not an assumption. */
export function priceArchive(points: readonly OnchainPoint[] = PRICE_ARCHIVE): OnchainPoint[] {
  return [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Observed window of the archive, or null while unpopulated. */
export function priceArchiveWindow(points: readonly OnchainPoint[] = PRICE_ARCHIVE): { from: string; to: string; points: number } | null {
  if (points.length === 0) return null;
  const sorted = priceArchive(points);
  return { from: sorted[0].date, to: sorted[sorted.length - 1].date, points: sorted.length };
}

/** Last available daily UTC close within (year, month), or null. */
export function lastCloseOfMonth(year: number, month: number, points: readonly OnchainPoint[] = PRICE_ARCHIVE): MonthClose | null {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  let best: OnchainPoint | null = null;
  for (const p of points) {
    if (p.date.startsWith(prefix) && (best == null || p.date > best.date)) best = p;
  }
  return best ? { year, month, date: best.date, close: best.value } : null;
}

/** Every month's closing observation over the archive, ascending. */
export function monthCloses(points: readonly OnchainPoint[] = PRICE_ARCHIVE): MonthClose[] {
  const byMonth = new Map<string, OnchainPoint>();
  for (const p of points) {
    const key = p.date.slice(0, 7);
    const cur = byMonth.get(key);
    if (cur == null || p.date > cur.date) byMonth.set(key, p);
  }
  return [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, p]) => ({ year: Number(key.slice(0, 4)), month: Number(key.slice(5, 7)), date: p.date, close: p.value }));
}

/** Exact monthly return %: last close of (year, month) vs last close of the
 *  previous month. Null when either boundary has no observation. */
export function monthlyReturnPct(year: number, month: number, points: readonly OnchainPoint[] = PRICE_ARCHIVE): number | null {
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const end = lastCloseOfMonth(year, month, points);
  const prevEnd = lastCloseOfMonth(prevYear, prevMonth, points);
  if (end == null || prevEnd == null || prevEnd.close <= 0) return null;
  return Math.round((end.close / prevEnd.close - 1) * 1000) / 10;
}

/** Whether (year, month) is fully in the past relative to `todayIso` (an ISO
 *  day). The current month's return is month-to-date, not final. */
export function isCompleteMonth(year: number, month: number, todayIso: string): boolean {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  return monthKey < todayIso.slice(0, 7);
}
