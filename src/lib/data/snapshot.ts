// This file is the single point of truth the rest of the app reads from.
//
// By default it re-exports the synthetic snapshot so a fresh clone runs
// without any network calls.
//
// `npm run sync` overwrites this file with a concrete data export pulled
// from CoinGecko + CoinMetrics + mempool.space. The overwritten version
// inlines the cycle data and sets `source.mode === "live"`.

import { syntheticSnapshot } from "./synthetic";
import type { Snapshot } from "./types";

export const SNAPSHOT: Snapshot = syntheticSnapshot();
