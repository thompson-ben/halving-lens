// Honest joins from delayed external feeds (PR133).
//
// BGeometrics publishes daily on-chain series with a 1–2 day lag. The weekly
// cycle samples are dated; an exact-date join therefore MISSES the newest
// sample whenever it is dated past the feed's tail — and the sample silently
// kept its synthetic placeholder, presenting a modelled number as observed
// (the realised-price cliff of 25 Jul 2026).
//
// The rule here: use the latest OBSERVED value at or before the sample's date,
// carried no further than MAX_CARRY_DAYS. These are slow-moving daily
// aggregates, so a value a few days old is the last real observation — honest,
// where a model in live clothing is not. When nothing recent enough exists,
// the caller keeps its modelled fallback and the provenance says so.
//
// Shared by scripts/sync.ts (live pipeline), scripts/repair-snapshot-join.ts
// (offline re-application to a committed snapshot) and the offline test suite.

import type { MetricProvenance, OnchainPoint } from "./types";

export const MS_PER_DAY = 86_400_000;

// A carried observation older than this is not used — the sample falls back to
// its modelled value, and the provenance marks it "modelled".
export const MAX_CARRY_DAYS = 7;

// Feeds publish T+1; an observation at most this old renders as plain
// "observed". Older (but within the carry cap) renders as "observed-stale".
export const STALE_AFTER_DAYS = 1;

// Latest point at or before isoDate. Series must be ascending by date — ISO
// date strings compare lexicographically. Binary search.
export function latestAtOrBefore(series: OnchainPoint[], isoDate: string): OnchainPoint | null {
  let lo = 0;
  let hi = series.length - 1;
  let best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].date <= isoDate) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return best >= 0 ? series[best] : null;
}

export function ageInDays(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / MS_PER_DAY);
}

export interface JoinResult {
  /** Samples that received an observed value. */
  hits: number;
  /** Provenance of the NEWEST sample's value. */
  newestProvenance: MetricProvenance;
}

// Overlay an observed daily series onto dated samples. Every sample takes the
// latest observation at or before its date (within the carry cap); samples
// with nothing recent enough keep whatever value they already carry (the
// modelled fallback from assembly). Returns per-newest-sample provenance so
// the snapshot can label today's number honestly.
export function joinObservedSeries(opts: {
  samples: Array<{ day: number } & Record<string, unknown>>;
  sampleKey: string;
  series: OnchainPoint[];
  halvingDateMs: number;
  sourceLabel: string;
  modelledLabel: string;
  maxCarryDays?: number;
}): JoinResult {
  const { samples, sampleKey, halvingDateMs, sourceLabel, modelledLabel } = opts;
  const maxCarry = opts.maxCarryDays ?? MAX_CARRY_DAYS;
  const series = [...opts.series]
    .filter((p) => Number.isFinite(p.value))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let hits = 0;
  let newestProvenance: MetricProvenance = { source: modelledLabel, mode: "modelled" };

  for (const s of samples) {
    const iso = new Date(halvingDateMs + s.day * MS_PER_DAY).toISOString().slice(0, 10);
    const p = series.length ? latestAtOrBefore(series, iso) : null;
    const age = p ? ageInDays(p.date, iso) : Infinity;
    const isNewest = s === samples[samples.length - 1];
    if (p && age <= maxCarry) {
      (s as Record<string, unknown>)[sampleKey] = p.value;
      hits++;
      if (isNewest) {
        newestProvenance = {
          source: sourceLabel,
          observedAt: p.date,
          ageDays: age,
          mode: age <= STALE_AFTER_DAYS ? "observed" : "observed-stale",
        };
      }
    }
    // else: keep the modelled fallback already on the sample; provenance for
    // the newest sample stays "modelled".
  }

  return { hits, newestProvenance };
}
