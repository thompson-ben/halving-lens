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

import type { EtfData, EtfFlowPoint, OnchainPoint } from "./types";

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

/** Union-merge the ETF flow archive (V2.1 Phase 0). The SoSoValue endpoint
 *  returns a ROLLING ~300-trading-day window, and until this merge existed the
 *  sync swapped the stored block wholesale — observed trading days silently
 *  fell off the front on every full sync. Same contract as the on-chain merge:
 *  union by date, fresh netFlow wins on a conflict, nothing already observed
 *  is ever dropped. `cumulative` is a running net total SINCE THE FIRST STORED
 *  OBSERVATION (not since the ETFs launched), so it is recomputed over the
 *  merged series — it must never be read as a since-launch figure. */
export function mergeEtfArchives(prev: EtfData | null, fresh: EtfData | null): EtfData | null {
  if (!fresh) return prev;
  if (!prev) return fresh;
  const byDate = new Map<string, number>();
  for (const p of prev.points) {
    if (p && typeof p.date === "string" && Number.isFinite(p.netFlow)) byDate.set(p.date, p.netFlow);
  }
  for (const p of fresh.points) {
    if (p && typeof p.date === "string" && Number.isFinite(p.netFlow)) byDate.set(p.date, p.netFlow);
  }
  let cum = 0;
  const points: EtfFlowPoint[] = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([date, netFlow]) => ({ date, netFlow, cumulative: (cum += netFlow) }));
  return { source: fresh.source, fetchedAt: fresh.fetchedAt, points };
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
