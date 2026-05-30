// Bitcoin price series + headline stats for the /price page. Uses the recent
// daily close history when present (for short-duration views); falls back to
// the weekly cycle-derived series, which also powers the full-history view.

import { CYCLES, CURRENT_CYCLE, PRICE_HISTORY, SPOT } from "./btcData";

const MS_DAY = 86_400_000;

export interface PricePoint {
  ts: number;
  price: number;
}

// Full dated price series reconstructed from every cycle's weekly samples.
function datedCyclePrices(): PricePoint[] {
  const out: PricePoint[] = [];
  for (const c of CYCLES) {
    const base = new Date(c.halvingDate).getTime();
    for (const s of c.samples) {
      if (s.price > 0) out.push({ ts: base + s.day * MS_DAY, price: s.price });
    }
  }
  return out.sort((a, b) => a.ts - b.ts);
}

export const PRICE_RANGES = [
  { key: "1W", label: "1W", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "1Y", label: "1Y", days: 365 },
  { key: "All", label: "All", days: Infinity },
] as const;

export type PriceRangeKey = (typeof PRICE_RANGES)[number]["key"];

export function priceSeries(key: PriceRangeKey): PricePoint[] {
  if (key === "All") return datedCyclePrices();
  const cfg = PRICE_RANGES.find((r) => r.key === key)!;
  const src = PRICE_HISTORY.length ? PRICE_HISTORY : datedCyclePrices();
  if (!src.length) return [];
  const last = src[src.length - 1].ts;
  return src.filter((p) => p.ts >= last - cfg.days * MS_DAY);
}

export interface PriceStats {
  current: number;
  change24h: number | null;
  change7d: number | null;
  ath: number;
  fromAthPct: number;
}

export function priceStats(): PriceStats {
  const ath = CYCLES.reduce((m, c) => Math.max(m, c.peakPrice), 0);
  const current =
    SPOT?.price ?? CURRENT_CYCLE.samples[CURRENT_CYCLE.samples.length - 1].price;
  return {
    current,
    change24h: SPOT?.change24h ?? null,
    change7d: SPOT?.change7d ?? null,
    ath,
    fromAthPct: ath > 0 ? (current / ath - 1) * 100 : 0,
  };
}
