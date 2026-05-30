// Halving countdown + issuance facts. Uses the live block height when present;
// otherwise estimates it from the calendar so the section always works. The
// halving happens on a *block*, not a clock, so the date/time is always an
// estimate and is labelled as such in the UI.

import { CHAIN, CURRENT_CYCLE, HALVINGS, SOURCE, TODAY_DAY_IN_CYCLE } from "./btcData";

const BLOCKS_PER_HALVING = 210_000;
const BLOCKS_PER_DAY = 144;
const MIN_PER_BLOCK = 10;
const MAX_SUPPLY = 21_000_000;

// Epoch boundaries in block height. Cycle 5 (the current epoch) began at the
// 2024 halving = block 840,000; the next halving is at 1,050,000.
const LAST_HALVING_BLOCK = 840_000;
const NEXT_HALVING_BLOCK = 1_050_000;

// Supply mined through the first four halving epochs (50+25+12.5+6.25 BTC ×
// 210,000 blocks each) = the supply already issued at block 840,000.
const SUPPLY_AT_LAST_HALVING = BLOCKS_PER_HALVING * (50 + 25 + 12.5 + 6.25); // 19,687,500

export interface HalvingStats {
  blockBased: boolean; // true when a live block height fed the maths
  blockHeight: number;
  blocksToHalving: number;
  daysToHalving: number;
  estimatedDate: string; // ISO — estimated next-halving date
  estimatedTargetMs: number; // ms timestamp to count down to
  progressPct: number; // through the current epoch
  currentReward: number;
  nextReward: number;
  dailyIssuance: number; // BTC/day now
  dailyIssuanceNext: number;
  issuedSinceHalving: number; // BTC minted this epoch so far
  issuedUntilHalving: number; // BTC left to mint this epoch
  minedSupply: number;
  pctMined: number;
  annualInflationPct: number;
  hashrateEHs: number | null;
}

export function halvingStats(): HalvingStats {
  const currentReward = CURRENT_CYCLE.rewardBtc; // 3.125
  const nextReward = currentReward / 2;

  const blockBased = !!CHAIN?.blockHeight;
  const blockHeight = CHAIN?.blockHeight ?? LAST_HALVING_BLOCK + TODAY_DAY_IN_CYCLE * BLOCKS_PER_DAY;

  const blocksToHalving = Math.max(0, NEXT_HALVING_BLOCK - blockHeight);
  const daysToHalving = Math.round((blocksToHalving / BLOCKS_PER_DAY) * 10) / 10;

  // Count down from the snapshot time so the clock is stable across renders.
  const baseMs = CHAIN?.fetchedAt
    ? Date.parse(CHAIN.fetchedAt)
    : (SOURCE.fetchedAt ? Date.parse(SOURCE.fetchedAt) : Date.now());
  const estimatedTargetMs = baseMs + blocksToHalving * MIN_PER_BLOCK * 60_000;
  const estimatedDate = new Date(estimatedTargetMs).toISOString();

  const progressPct = ((blockHeight - LAST_HALVING_BLOCK) / BLOCKS_PER_HALVING) * 100;

  const dailyIssuance = BLOCKS_PER_DAY * currentReward;
  const dailyIssuanceNext = BLOCKS_PER_DAY * nextReward;
  const issuedSinceHalving = (blockHeight - LAST_HALVING_BLOCK) * currentReward;
  const issuedUntilHalving = blocksToHalving * currentReward;

  const minedSupply = SUPPLY_AT_LAST_HALVING + (blockHeight - LAST_HALVING_BLOCK) * currentReward;
  const pctMined = (minedSupply / MAX_SUPPLY) * 100;
  const annualInflationPct = ((dailyIssuance * 365) / minedSupply) * 100;

  return {
    blockBased,
    blockHeight,
    blocksToHalving,
    daysToHalving,
    estimatedDate,
    estimatedTargetMs,
    progressPct,
    currentReward,
    nextReward,
    dailyIssuance,
    dailyIssuanceNext,
    issuedSinceHalving,
    issuedUntilHalving,
    minedSupply,
    pctMined,
    annualInflationPct,
    hashrateEHs: CHAIN?.hashrate ? CHAIN.hashrate / 1e18 : null,
  };
}

export const NEXT_HALVING_YEAR = HALVINGS[6].slice(0, 4);
