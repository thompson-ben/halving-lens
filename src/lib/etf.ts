// ETF flow accessor. Reads live US spot BTC ETF flows from the snapshot (fed by
// SoSoValue during sync once SOSOVALUE_API_KEY is set). Until then `connected`
// is false and the ETF page shows its honest "connecting" state — never
// fabricated numbers.
//
// WIRING (sync side): scripts/sync.ts fetches SoSoValue's ETF historical
// inflow endpoint with header `x-soso-api-key` for asset `us-btc-spot`,
// normalises each day to { date, netFlow, cumulative } (USD) and writes it onto
// the snapshot as `etf`.

import { ETF_FLOWS } from "./btcData";
import type { EtfFlowPoint } from "./data/types";

export type { EtfFlowPoint };

export const ETF = {
  connected: !!ETF_FLOWS && ETF_FLOWS.points.length > 0,
  plannedSource: "SoSoValue · US spot BTC ETF flows",
  source: ETF_FLOWS?.source ?? null,
  fetchedAt: ETF_FLOWS?.fetchedAt ?? null,
  points: (ETF_FLOWS?.points ?? []) as EtfFlowPoint[],
};

export interface EtfStats {
  latest: EtfFlowPoint | null;
  cumulative: number;
  biggestInflow: EtfFlowPoint | null;
  biggestOutflow: EtfFlowPoint | null;
  /** Net flow summed over the last 7 data points. */
  trailingWeek: number;
}

export function etfStats(): EtfStats {
  const pts = ETF.points;
  if (!pts.length) {
    return { latest: null, cumulative: 0, biggestInflow: null, biggestOutflow: null, trailingWeek: 0 };
  }
  const latest = pts[pts.length - 1];
  const biggestInflow = pts.reduce((a, b) => (b.netFlow > a.netFlow ? b : a));
  const biggestOutflow = pts.reduce((a, b) => (b.netFlow < a.netFlow ? b : a));
  const trailingWeek = pts.slice(-7).reduce((sum, p) => sum + p.netFlow, 0);
  return { latest, cumulative: latest.cumulative, biggestInflow, biggestOutflow, trailingWeek };
}
