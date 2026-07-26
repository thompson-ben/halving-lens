// Observed-archive merge (PR140).
//
// The BGeometrics free tier returns a ROLLING ~4-year window. The sync
// previously replaced each stored series wholesale with the fresh window, so
// every successful daily fetch silently discarded the oldest observed day —
// observed history we already held in the committed snapshot, lost forever.
//
// These pure functions make the archive grow monotonically instead: fetched
// points are UNION-merged with previously-committed points by date. Fresh
// wins on a date conflict (sources revise recent values); nothing already
// observed is ever dropped. The committed snapshot thereby becomes the
// long-term archive the free tier cannot provide — its earliest observed
// date is a permanent floor, not a rolling edge.
//
// Guarded in CI by scripts/test-observed-archive.ts: a merge may never
// shrink a series' date range or point count below the previous archive's.

import type { OnchainPoint } from "./types";

/** Union-merge two dated series. Fresh wins on date conflict; result is
 *  sorted ascending and contains every date from both inputs. */
export function mergeObservedPoints(
  prev: readonly OnchainPoint[] | undefined,
  fresh: readonly OnchainPoint[] | undefined,
): OnchainPoint[] {
  const byDate = new Map<string, number>();
  for (const p of prev ?? []) {
    if (p && typeof p.date === "string" && Number.isFinite(p.value)) byDate.set(p.date, p.value);
  }
  for (const p of fresh ?? []) {
    if (p && typeof p.date === "string" && Number.isFinite(p.value)) byDate.set(p.date, p.value);
  }
  return [...byDate.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Merge two keyed series archives per point (not per series). Keys present
 *  in either input survive; each key's points are union-merged. */
export function mergeSeriesArchives(
  prev: Record<string, OnchainPoint[]> | undefined,
  fresh: Record<string, OnchainPoint[]> | undefined,
): Record<string, OnchainPoint[]> {
  const out: Record<string, OnchainPoint[]> = {};
  const keys = new Set([...Object.keys(prev ?? {}), ...Object.keys(fresh ?? {})]);
  for (const k of keys) out[k] = mergeObservedPoints(prev?.[k], fresh?.[k]);
  return out;
}
