// Observed-window registry (PR141) — the machine-readable form of the
// Historical Data Integrity Audit.
//
// One place answers, for every historical series HalvingLens holds: where it
// comes from, what KIND of data it is, and the window over which it is
// genuinely present — computed from the committed snapshot itself, never
// hard-coded, so the registry can only report windows that actually exist.
// Future historical features consume this instead of re-deriving windows ad
// hoc; a feature that needs a window the data can't support must refuse,
// not backfill.
//
// `nature` extends the established provenance vocabulary (PR133/PR134):
//   observed  — values a source measured; safe for historical claims
//   derived   — computed deterministically from observed inputs (e.g. 200DMA)
//   estimated — a model over observed inputs (Estimated Mining Cost); always
//               presented with the ESTIMATED treatment, never as observed
//   synthetic — placeholder shapes; MUST never be plotted or counted
//
// Prior-cycle on-chain values inside cycle samples are synthetic fallback
// (CoinMetrics CapRealUSD needs a paid key) — they are deliberately NOT
// registered here, so no historical feature can reach them by accident.

import { PRICE_ARCHIVE } from "./priceArchiveData";
import { SNAPSHOT } from "./snapshot";
import type { OnchainPoint } from "./types";

export type SeriesNature = "observed" | "derived" | "estimated" | "synthetic";

export interface SeriesWindow {
  id: string;
  label: string;
  source: string;
  nature: SeriesNature;
  cadence: "daily" | "weekly" | "mixed" | "trading-day";
  /** ISO dates of the first/last points actually present; null when absent. */
  firstObserved: string | null;
  lastObserved: string | null;
  points: number;
}

const isoFromTs = (ts: number | undefined): string | null =>
  ts != null && Number.isFinite(ts) ? new Date(ts).toISOString().slice(0, 10) : null;

function windowOf(
  meta: Omit<SeriesWindow, "firstObserved" | "lastObserved" | "points">,
  dates: Array<string | null>,
): SeriesWindow {
  const clean = dates.filter((d): d is string => typeof d === "string").sort();
  return {
    ...meta,
    firstObserved: clean[0] ?? null,
    lastObserved: clean[clean.length - 1] ?? null,
    points: clean.length,
  };
}

const onchainDates = (key: string): Array<string | null> =>
  (SNAPSHOT.onchain?.series?.[key] ?? []).map((p: OnchainPoint) => p.date ?? null);

// BGeometrics on-chain series — all observed, all daily, all sharing the
// archive floor PR140 made permanent.
const ONCHAIN_SERIES: Array<{ id: string; label: string }> = [
  { id: "realizedPrice", label: "Realised Price" },
  { id: "mvrvZscore", label: "MVRV Z-Score" },
  { id: "nupl", label: "NUPL" },
  { id: "sopr", label: "SOPR" },
  { id: "rhodl", label: "RHODL Ratio" },
  { id: "reserveRisk", label: "Reserve Risk" },
  { id: "lthSupply", label: "Long-term holder supply" },
  { id: "addresses", label: "Active addresses" },
];

let cache: SeriesWindow[] | null = null;

export function observedWindows(): SeriesWindow[] {
  if (cache) return cache;
  const out: SeriesWindow[] = [];

  // Market price — weekly cycle samples (full history) + rolling daily closes.
  out.push(
    windowOf(
      { id: "price-weekly", label: "Market price (weekly cycle samples)", source: "CoinMetrics community PriceUSD", nature: "observed", cadence: "weekly" },
      SNAPSHOT.cycles.flatMap((c) => {
        const base = Date.parse(`${c.halvingDate}T00:00:00Z`);
        return c.samples.filter((s) => s.price > 0).map((s) => isoFromTs(base + s.day * 86_400_000));
      }),
    ),
  );
  // Daily closes: the permanent archive once populated (Seasonality PR-A),
  // else the snapshot's rolling window — the honest floor either way.
  const dailyDates =
    PRICE_ARCHIVE.length > (SNAPSHOT.priceHistory?.length ?? 0)
      ? PRICE_ARCHIVE.map((p) => p.date)
      : (SNAPSHOT.priceHistory ?? []).map((p) => isoFromTs(p.ts));
  out.push(
    windowOf(
      { id: "price-daily", label: "Market price (daily closes)", source: "CoinMetrics community PriceUSD", nature: "observed", cadence: "daily" },
      dailyDates,
    ),
  );

  // 200-day moving average — derived from the daily closes (needs the 200-day
  // warm-up, so its window starts 200 points into the price window).
  out.push(
    windowOf(
      { id: "ma200", label: "200-day moving average", source: "derived: price / 200d SMA", nature: "derived", cadence: "daily" },
      dailyDates.slice(199),
    ),
  );

  for (const s of ONCHAIN_SERIES) {
    out.push(
      windowOf(
        { id: s.id, label: s.label, source: "BGeometrics · bitcoin-data.com", nature: "observed", cadence: "daily" },
        onchainDates(s.id),
      ),
    );
  }

  // Estimated Mining Cost — a model over observed hashrate. Estimated, never
  // observed, whatever its window says.
  out.push(
    windowOf(
      {
        id: "miningCost",
        label: "Estimated Mining Cost",
        source: SNAPSHOT.productionCost?.source ?? "model: HalvingLens electricity-cost model",
        nature: "estimated",
        // The stored series is weekly to 2025-06-30 and daily after — the
        // declaration matches the data, not the fetch schedule (PR-FRP1;
        // previously mislabelled "daily", flagged in SoB 2.0 discovery).
        cadence: "mixed",
      },
      (SNAPSHOT.productionCost?.points ?? []).map((p) => p.date ?? null),
    ),
  );

  out.push(
    windowOf(
      { id: "fearGreed", label: "Fear & Greed index", source: SNAPSHOT.sentiment?.source ?? "alternative.me", nature: "observed", cadence: "daily" },
      (SNAPSHOT.sentiment?.points ?? []).map((p) => isoFromTs(p.ts)),
    ),
  );
  out.push(
    windowOf(
      { id: "etfFlows", label: "US spot ETF net flows", source: SNAPSHOT.etf?.source ?? "SoSoValue", nature: "observed", cadence: "trading-day" },
      (SNAPSHOT.etf?.points ?? []).map((p) => p.date ?? null),
    ),
  );

  cache = out;
  return cache;
}

export function seriesWindow(id: string): SeriesWindow | null {
  return observedWindows().find((w) => w.id === id) ?? null;
}

/** The overlap window across several series — the honest range for any
 *  feature that needs ALL of them (e.g. the Four Reference Prices full
 *  configuration). Null when any series is absent or the windows don't
 *  overlap. */
export function intersectWindows(ids: string[]): { first: string; last: string } | null {
  let first: string | null = null;
  let last: string | null = null;
  for (const id of ids) {
    const w = seriesWindow(id);
    if (!w || !w.firstObserved || !w.lastObserved) return null;
    if (first === null || w.firstObserved > first) first = w.firstObserved;
    if (last === null || w.lastObserved < last) last = w.lastObserved;
  }
  return first && last && first <= last ? { first, last } : null;
}
