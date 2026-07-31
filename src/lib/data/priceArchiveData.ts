// GENERATED FILE — written by scripts/sync.ts. Do not edit by hand.
//
// The permanent daily-close archive (Seasonality PR-A). The sync fetches
// CoinMetrics community PriceUSD at FULL depth on every run and union-merges
// it here via the PR140 observed-archive machinery: one point per UTC day,
// fresh wins on a date conflict, nothing observed is ever dropped. The first
// sync run after this file ships performs the 2010→ backfill; every run
// after is idempotent maintenance.
//
// Empty until the first sync run writes it — consumers must treat an empty
// archive as "not yet populated", never as "no history exists".

import type { OnchainPoint } from "./types";

export const PRICE_ARCHIVE: OnchainPoint[] = [];

export const PRICE_ARCHIVE_SOURCE = "CoinMetrics community PriceUSD";
