// Shared types + halving constants. The live-data sync and the synthetic
// fallback both produce values shaped to these interfaces.

export type CycleId = 1 | 2 | 3 | 4 | 5;

export interface CycleSample {
  day: number; // days since halving
  price: number;
  mvrv: number; // market cap / realised cap
  mvrvZ: number; // (mvrv - mean) / std; cycle top oscillator
  nupl: number; // net unrealised P&L; -0.3..0.9
  mayer: number; // price / 200d MA
  puell: number; // miner issuance / 365d MA
  reserveRisk: number; // 0.001 .. 0.02
  rainbow: number; // 0..8 band index (0 = fire sale, 8 = maximum bubble)
  sopr: number; // spent output profit ratio; >1 = realising profit
  rhodl: number; // RHODL ratio
  realizedPrice: number; // aggregate cost-basis price
}

export interface Cycle {
  id: CycleId;
  label: string;
  short: string;
  color: string;
  halvingDate: string; // ISO date
  endDate: string | null; // null = current cycle
  endLabel: string;
  rewardBtc: number; // block reward after this halving
  peakPrice: number;
  peakDay: number;
  troughPrice: number;
  troughDay: number;
  samples: CycleSample[];
}

// Halving dates. Halving 1 = genesis is included for reference only.
export const HALVINGS = {
  1: "2009-01-03",
  2: "2012-11-28",
  3: "2016-07-09",
  4: "2020-05-11",
  5: "2024-04-19",
  6: "2028-04-17", // projected
} as const;

export const CYCLE_META: Array<{
  id: Exclude<CycleId, 1>;
  label: string;
  short: string;
  color: string;
  rewardBtc: number;
  startDate: string;
  endDate: string | null;
  endLabel: string;
}> = [
  {
    id: 2,
    label: "Cycle 2 — first halving",
    short: "C2",
    color: "#f5b942",
    rewardBtc: 25,
    startDate: HALVINGS[2],
    endDate: HALVINGS[3],
    endLabel: "→ 2016 halving",
  },
  {
    id: 3,
    label: "Cycle 3 — second halving",
    short: "C3",
    color: "#a78bfa",
    rewardBtc: 12.5,
    startDate: HALVINGS[3],
    endDate: HALVINGS[4],
    endLabel: "→ 2020 halving",
  },
  {
    id: 4,
    label: "Cycle 4 — third halving",
    short: "C4",
    color: "#ff5d5d",
    rewardBtc: 6.25,
    startDate: HALVINGS[4],
    endDate: HALVINGS[5],
    endLabel: "→ 2024 halving",
  },
  {
    id: 5,
    label: "Cycle 5 — fourth halving",
    short: "C5",
    color: "#5eead4",
    rewardBtc: 3.125,
    startDate: HALVINGS[5],
    endDate: null,
    endLabel: "current cycle",
  },
];

export const DAYS_PER_CYCLE = 1458;
export const NEXT_HALVING_DATE = HALVINGS[6];

// How current the snapshot is and which sources fed it.
export interface SnapshotSource {
  /** "live" if any metric came from real APIs, "synthetic" otherwise. */
  mode: "live" | "synthetic" | "mixed";
  /** When the snapshot was produced (ISO). null for synthetic default. */
  fetchedAt: string | null;
  /** Source providers per metric. */
  sources: Partial<
    Record<
      "price" | "realizedCap" | "supply" | "issuance" | "mvrv" | "nupl" | "mayer" | "rainbow" | "puell" | "sopr" | "rhodl" | "reserveRisk" | "realizedPrice",
      string
    >
  >;
}

export interface Snapshot {
  source: SnapshotSource;
  cycles: Cycle[];
  todayDayInCycle: number; // today - cycle 5 halving, in days
  sentiment?: SentimentData | null; // Fear & Greed index; absent until synced
  chain?: ChainTip | null; // live block height; absent until synced
  spot?: SpotPrice | null; // freshest daily price + changes; absent until synced
}

// Crypto Fear & Greed index (alternative.me) — free, keyless market sentiment.
export interface SentimentPoint {
  ts: number; // unix ms (UTC midnight)
  value: number; // 0..100
  classification?: string; // e.g. "Fear", "Greed" — derived in UI; not stored
}

export interface SentimentData {
  source: string;
  fetchedAt: string; // ISO
  points: SentimentPoint[]; // ascending by ts
}

// Live chain tip from mempool.space — enables block-accurate halving maths.
export interface ChainTip {
  blockHeight: number;
  hashrate?: number; // H/s
  fetchedAt: string; // ISO
}

// Freshest daily spot price + true changes, from the daily close series. The
// per-cycle samples are weekly (can be a few days stale), so the headline price
// reads from here when present.
export interface SpotPrice {
  price: number;
  ts: number; // unix ms of the latest daily close
  change24h: number; // %
  change7d?: number; // %
}
