// Backtest for the HalvingLens Accumulation Score. Turns the gauge into evidence:
// for every historical week, bucket it by its (point-in-time) score band, then
// measure what an accumulation made then would have done 1 / 2 / 4 years later.
//
// Strictly descriptive history — not a forecast, not a strategy. We surface
// observation counts and caveats prominently because the honesty IS the product.

import { accumulationSeries, ACCUMULATION_BANDS, type AccumulationBandKey } from "./accumulation";

const MS_DAY = 86_400_000;

export const HORIZON_YEARS = [1, 2, 4] as const;

export interface HorizonStat {
  years: number;
  n: number; // observations with a full forward window
  avg: number | null; // mean forward return %
  median: number | null;
  best: number | null;
  worst: number | null;
}

export interface BandPerformance {
  key: AccumulationBandKey;
  label: string;
  range: [number, number];
  n: number; // total observations in this band (any horizon)
  horizons: HorizonStat[];
}

export interface BacktestResult {
  bands: BandPerformance[];
  totalObservations: number;
  dateRange: { from: string; to: string };
  notes: string[];
}

// Linearly-interpolated price at a timestamp on the (sorted) series. Returns null
// when ts is past the end of the data — so forward windows that run off the edge
// are excluded rather than clamped (no fabricated outcome).
function priceAtTs(series: { ts: number; price: number }[], ts: number): number | null {
  if (!series.length) return null;
  if (ts < series[0].ts || ts > series[series.length - 1].ts) return null;
  for (let i = 1; i < series.length; i++) {
    if (series[i].ts >= ts) {
      const a = series[i - 1];
      const b = series[i];
      const f = (ts - a.ts) / (b.ts - a.ts || 1);
      return a.price + (b.price - a.price) * f;
    }
  }
  return series[series.length - 1].price;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function runAccumulationBacktest(): BacktestResult {
  const series = accumulationSeries();
  const priced = series.map((p) => ({ ts: p.ts, price: p.price }));

  // Collect forward returns per band per horizon.
  const acc = new Map<AccumulationBandKey, Map<number, number[]>>();
  for (const b of ACCUMULATION_BANDS) {
    const h = new Map<number, number[]>();
    for (const y of HORIZON_YEARS) h.set(y, []);
    acc.set(b.key, h);
  }
  const bandTotals = new Map<AccumulationBandKey, number>();

  for (const p of series) {
    bandTotals.set(p.bandKey, (bandTotals.get(p.bandKey) ?? 0) + 1);
    for (const y of HORIZON_YEARS) {
      const future = priceAtTs(priced, p.ts + y * 365 * MS_DAY);
      if (future == null || p.price <= 0) continue;
      const ret = (future / p.price - 1) * 100;
      acc.get(p.bandKey)!.get(y)!.push(ret);
    }
  }

  const bands: BandPerformance[] = ACCUMULATION_BANDS.map((b) => ({
    key: b.key,
    label: b.label,
    range: b.range,
    n: bandTotals.get(b.key) ?? 0,
    horizons: HORIZON_YEARS.map((y) => {
      const rs = acc.get(b.key)!.get(y)!;
      return {
        years: y,
        n: rs.length,
        avg: rs.length ? Math.round(rs.reduce((a, c) => a + c, 0) / rs.length) : null,
        median: rs.length ? Math.round(median(rs)) : null,
        best: rs.length ? Math.round(Math.max(...rs)) : null,
        worst: rs.length ? Math.round(Math.min(...rs)) : null,
      };
    }),
  }));

  return {
    bands,
    totalObservations: series.length,
    dateRange: { from: series[0].date, to: series[series.length - 1].date },
    notes: [
      "Score is reconstructed point-in-time (trailing 200d/200w averages + running ATH); no future data leaks into a past score.",
      "Forward returns are calendar-forward on the continuous weekly series. Windows that run past the latest data are excluded, so longer horizons have fewer observations.",
      "The 4-year horizon is supported by roughly 2–3 independent cycles only — read its band stats as indicative, not statistically robust.",
      "Weekly observations overlap and are autocorrelated; they are not independent samples.",
      "Historical context only. Past behaviour is not a forecast and this is not financial advice.",
    ],
  };
}
