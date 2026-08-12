// Cost of Production — HalvingLens electricity-cost model (v1, 2026-07).
//
// The third reference price: Market Price (what Bitcoin trades for),
// Realised Price (aggregate holder cost basis), Cost of Production (the
// estimated electricity cost to mine one new Bitcoin).
//
// MODELLED, and labelled as such everywhere. The model is deliberately the
// simplest defensible one — observed network hashrate x a documented fleet-
// efficiency assumption x a stated electricity-price band, divided by daily
// issuance. Hardware, cooling, labour, pool fees and financing are EXCLUDED.
// It is a network-level electricity estimate: not any miner's break-even, not
// a price floor, not intrinsic value, not a prediction.
//
//   daily_energy_kWh = hashrate_THs * efficiency_J_per_TH * 86,400 / 3,600,000
//   cost_per_btc     = (daily_energy_kWh * electricity_usd_per_kwh) / btc_per_day
//
// Every assumption lives in this file, versioned. Changing an assumption must
// bump ASSUMPTIONS_VERSION so published history is traceable to the model that
// produced it.

export const ASSUMPTIONS_VERSION = "v1 (2026-07)";

// Network-weighted average fleet efficiency, joules per terahash, stepped by
// year. Reference points: Cambridge CBECI's weighted-efficiency assumptions
// and public miner-fleet disclosures (efficiency of deployed fleets lags the
// best available ASIC by several years). Values are deliberately round — the
// model claims no false precision. History before 2016 is not modelled: fleet
// composition (CPU/GPU/FPGA/early-ASIC eras) is too uncertain to defend.
export const EFFICIENCY_J_PER_TH: Array<{ from: string; jPerTh: number }> = [
  { from: "2016-01-01", jPerTh: 250 },
  { from: "2017-01-01", jPerTh: 160 },
  { from: "2018-01-01", jPerTh: 110 },
  { from: "2019-01-01", jPerTh: 80 },
  { from: "2020-01-01", jPerTh: 60 },
  { from: "2021-01-01", jPerTh: 48 },
  { from: "2022-01-01", jPerTh: 40 },
  { from: "2023-01-01", jPerTh: 34 },
  { from: "2024-01-01", jPerTh: 28 },
  { from: "2025-01-01", jPerTh: 24 },
  { from: "2026-01-01", jPerTh: 21 },
];

export const MODEL_START_DATE = EFFICIENCY_J_PER_TH[0].from;

// Industrial electricity price band, USD per kWh. Central estimate $0.06 with
// a $0.04–$0.08 sensitivity band — the band IS part of the honesty: real
// miners sit across (and occasionally outside) this range.
export const ELECTRICITY_USD_PER_KWH = { low: 0.04, central: 0.06, high: 0.08 } as const;

import { HALVING_EVENTS } from "./types";

// Block subsidy schedule by date (UTC). Fees are excluded from the issuance
// denominator — including them would LOWER the modelled cost per BTC; the
// exclusion is stated in the methodology.
//
// Daily-resolution approximation, stated honestly: subsidy eras change on
// the UTC calendar date containing the halving block (the HALVING_EVENTS
// authority), not at the block itself. The 2024 halving block was mined at
// 00:09:27 UTC on 20 April, so this model treats all of 20 April as
// post-halving although its first nine minutes were not. The model is
// daily-resolution, not block-resolution, by design.
const SUBSIDY_ERAS: Array<{ from: string; subsidy: number }> = [
  { from: "2009-01-03", subsidy: 50 },
  { from: HALVING_EVENTS[2].date, subsidy: 25 },
  { from: HALVING_EVENTS[3].date, subsidy: 12.5 },
  { from: HALVING_EVENTS[4].date, subsidy: 6.25 },
  { from: HALVING_EVENTS[5].date, subsidy: 3.125 },
];

const BLOCKS_PER_DAY = 144;

export function subsidyAt(isoDate: string): number {
  let s = SUBSIDY_ERAS[0].subsidy;
  for (const era of SUBSIDY_ERAS) {
    if (era.from <= isoDate) s = era.subsidy;
  }
  return s;
}

export function btcIssuedPerDay(isoDate: string): number {
  return subsidyAt(isoDate) * BLOCKS_PER_DAY;
}

export function efficiencyAt(isoDate: string): number | null {
  if (isoDate < MODEL_START_DATE) return null;
  let e: number | null = null;
  for (const step of EFFICIENCY_J_PER_TH) {
    if (step.from <= isoDate) e = step.jPerTh;
  }
  return e;
}

export interface ProductionCostEstimate {
  low: number;
  central: number;
  high: number;
}

// Central + band estimate for one day. Returns null before the model start,
// or for missing/non-positive hashrate — the metric drops out cleanly, never
// zero, never a stale carry.
export function productionCostAt(
  hashrateThs: number | null | undefined,
  isoDate: string,
): ProductionCostEstimate | null {
  if (hashrateThs == null || !Number.isFinite(hashrateThs) || hashrateThs <= 0) return null;
  const jPerTh = efficiencyAt(isoDate);
  if (jPerTh == null) return null;
  const kwhPerDay = (hashrateThs * jPerTh * 86_400) / 3_600_000;
  const btcPerDay = btcIssuedPerDay(isoDate);
  if (!(btcPerDay > 0)) return null;
  const central = (kwhPerDay * ELECTRICITY_USD_PER_KWH.central) / btcPerDay;
  // Electricity price is a pure linear factor, so the band is a scalar of the
  // central estimate.
  const est = {
    low: central * (ELECTRICITY_USD_PER_KWH.low / ELECTRICITY_USD_PER_KWH.central),
    central,
    high: central * (ELECTRICITY_USD_PER_KWH.high / ELECTRICITY_USD_PER_KWH.central),
  };
  return sane(est) ? est : null;
}

// Sanity window — a modelled cost outside this range indicates a broken input
// (typically a hashrate unit error), and the day is dropped rather than shown.
export function sane(est: ProductionCostEstimate): boolean {
  return (
    est.low > 50 &&
    est.high < 5_000_000 &&
    est.low < est.central &&
    est.central < est.high
  );
}

// Premium of Market Price over the central Cost of Production estimate.
export function productionPremiumPct(price: number, central: number): number | null {
  if (!(price > 0) || !(central > 0)) return null;
  return (price / central - 1) * 100;
}

// Evidence-led classification of the price-to-cost relationship. Thresholds
// are anchored to the model's own uncertainty rather than invented round
// numbers: "near" means within the ±33% electricity band ($0.04–$0.08 around
// $0.06); "below" means under even the low-band estimate would imply; premium
// tiers step at the band width (~33%) and twice the band width (~67%).
export type ProductionCostBand =
  | "below-cost"
  | "near-cost"
  | "moderate-premium"
  | "elevated-premium";

export function classifyPremium(premiumPct: number): { band: ProductionCostBand; label: string } {
  if (premiumPct <= -33) return { band: "below-cost", label: "Below estimated mining cost" };
  if (premiumPct < 33) return { band: "near-cost", label: "Near estimated mining cost" };
  if (premiumPct < 67) return { band: "moderate-premium", label: "Moderate premium to mining cost" };
  return { band: "elevated-premium", label: "Elevated premium to mining cost" };
}
