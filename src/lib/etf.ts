// ETF flow data layer. The user-facing product never shows fabricated ETF
// numbers — until a live source is connected, `ETF.connected` is false and the
// ETF page renders an honest "connecting live data" state.
//
// FOLLOW-UP TASK (wiring live data):
//   1. Register a free SoSoValue API key and add it as a secret/env var
//      (e.g. SOSOVALUE_API_KEY) in GitHub Actions + Vercel.
//   2. In scripts/sync.ts, fetch the US spot BTC ETF historical inflow series
//      (header `x-soso-api-key`, group `us-btc-spot`) and write it onto the
//      snapshot as `etf: { points, ... }`.
//   3. Populate ETF below from the snapshot and set connected = true.
// Fallback source: Dune Analytics API (cached results of a maintained public
// BTC-ETF query). Do NOT scrape Farside (datacenter-blocked + ToS).

export interface EtfFlowPoint {
  /** ISO date */
  date: string;
  /** Net flow in USD for the day (inflows minus outflows). */
  netFlow: number;
  /** Cumulative net flow in USD since spot ETF launch. */
  cumulative: number;
}

export interface EtfData {
  connected: boolean;
  /** Planned source provider, surfaced for transparency. */
  plannedSource: string;
  points: EtfFlowPoint[];
}

export const ETF: EtfData = {
  connected: false,
  plannedSource: "SoSoValue (US spot BTC ETF flows)",
  points: [],
};
