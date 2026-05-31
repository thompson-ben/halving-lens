// Synthetic HODL Waves — supply by age cohort, sampled weekly across each cycle.
// Real HODL Waves come from UTXO age data; the shape we recreate here is the
// canonical one (long-term holders distribute into cycle tops, accumulate at
// bottoms; short-term cohorts swell during euphoria).

import { CURRENT_CYCLE, HODL_WAVES, type CycleSample } from "./btcData";

export interface HodlBand {
  id: string;
  label: string;
  color: string;
}

export const HODL_BANDS: HodlBand[] = [
  { id: "1d", label: "< 1 day", color: "#ff5d5d" },
  { id: "1w", label: "1d – 1w", color: "#ff8a5d" },
  { id: "1m", label: "1w – 1m", color: "#f5b942" },
  { id: "3m", label: "1m – 3m", color: "#dcdc60" },
  { id: "6m", label: "3m – 6m", color: "#7dd87d" },
  { id: "1y", label: "6m – 1y", color: "#3ddc97" },
  { id: "2y", label: "1y – 2y", color: "#4ac4af" },
  { id: "3y", label: "2y – 3y", color: "#5aa9ff" },
  { id: "5y", label: "3y – 5y", color: "#7c8aff" },
  { id: "7y", label: "5y – 7y", color: "#a78bfa" },
  { id: "10y", label: "7y – 10y", color: "#c08bfa" },
  { id: "10y+", label: "10y +", color: "#e0c5ff" },
];

export interface HodlPoint {
  day: number;
  bands: Record<string, number>; // percentages summing to ~100
}

// Generate a realistic supply-by-age distribution given (price/peak, mvrvZ).
function distributionAt(s: CycleSample, cyclePeak: number): Record<string, number> {
  // "Heat" 0..1 derived from how close the cycle is to its peak.
  const heat = Math.max(0, Math.min(1, Math.pow(s.price / cyclePeak, 1.3)));

  // Base "cold" distribution (deep bear): long-term cohorts dominate.
  const cold: Record<string, number> = {
    "1d": 0.5,
    "1w": 1.0,
    "1m": 2.5,
    "3m": 4.0,
    "6m": 5.5,
    "1y": 9.0,
    "2y": 11.0,
    "3y": 11.5,
    "5y": 14.0,
    "7y": 13.0,
    "10y": 12.5,
    "10y+": 15.5,
  };

  // "Hot" distribution (cycle peak): short-term cohorts swell as old supply
  // moves and gets reclassified.
  const hot: Record<string, number> = {
    "1d": 2.0,
    "1w": 4.5,
    "1m": 10.0,
    "3m": 14.0,
    "6m": 14.5,
    "1y": 13.0,
    "2y": 9.0,
    "3y": 7.5,
    "5y": 8.0,
    "7y": 6.5,
    "10y": 5.0,
    "10y+": 6.0,
  };

  const out: Record<string, number> = {};
  let total = 0;
  for (const b of HODL_BANDS) {
    const v = cold[b.id] * (1 - heat) + hot[b.id] * heat;
    out[b.id] = v;
    total += v;
  }
  for (const b of HODL_BANDS) out[b.id] = (out[b.id] / total) * 100;
  return out;
}

export function hodlSeries(): HodlPoint[] {
  const cyclePeak = CURRENT_CYCLE.peakPrice;
  return CURRENT_CYCLE.samples.map((s) => ({
    day: s.day,
    bands: distributionAt(s, cyclePeak),
  }));
}

// True once a full set of live HODL-wave bands is in the snapshot.
export const HODL_LIVE =
  !!HODL_WAVES && Object.keys(HODL_WAVES.bands).length >= HODL_BANDS.length;

export const HODL_SOURCE = HODL_WAVES?.source ?? null;
export const HODL_UPDATED = HODL_WAVES?.fetchedAt ?? null;

// Live HODL series (current cycle), aligned to day-from-halving, normalised to
// 100% per sample. Falls back to the illustrative series when not live.
export function hodlSeriesLive(): HodlPoint[] {
  if (!HODL_LIVE || !HODL_WAVES) return hodlSeries();
  const base = new Date(CURRENT_CYCLE.halvingDate).getTime();
  const MS_DAY = 86_400_000;
  return CURRENT_CYCLE.samples.map((s) => {
    const iso = new Date(base + s.day * MS_DAY).toISOString().slice(0, 10);
    const bands: Record<string, number> = {};
    let total = 0;
    for (const b of HODL_BANDS) {
      const ser = HODL_WAVES!.bands[b.id] ?? [];
      // nearest point at/before this date
      let v = 0;
      for (const p of ser) {
        if (p.date <= iso) v = p.value;
        else break;
      }
      bands[b.id] = v;
      total += v;
    }
    if (total > 0) for (const b of HODL_BANDS) bands[b.id] = (bands[b.id] / total) * 100;
    return { day: s.day, bands };
  });
}
