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

// The halving authority. One verifiable registry: each analysed halving is
// the Bitcoin block that changed the subsidy, and the canonical date is the
// UTC calendar date containing that block — never a local-reporting date.
// Timestamps are the block headers' own, verifiable on any block explorer.
// (Epoch 5's block landed nine minutes past UTC midnight, which is why the
// widely reported US-evening date of 19 April 2024 is NOT the canonical
// date here.)
export const HALVING_EVENTS = {
  2: { blockHeight: 210_000, utcTimestamp: "2012-11-28T15:24:38Z", date: "2012-11-28" },
  3: { blockHeight: 420_000, utcTimestamp: "2016-07-09T16:46:13Z", date: "2016-07-09" },
  4: { blockHeight: 630_000, utcTimestamp: "2020-05-11T19:23:43Z", date: "2020-05-11" },
  5: { blockHeight: 840_000, utcTimestamp: "2024-04-20T00:09:27Z", date: "2024-04-20" },
} as const;

// Halving dates — the compatibility view every existing consumer reads.
// Epochs 2–5 derive from HALVING_EVENTS (the source of truth above);
// halving 1 = genesis is included for reference only, and 6 is a projection.
export const HALVINGS = {
  1: "2009-01-03",
  2: HALVING_EVENTS[2].date,
  3: HALVING_EVENTS[3].date,
  4: HALVING_EVENTS[4].date,
  5: HALVING_EVENTS[5].date,
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

// Provenance of the newest sample's value for metrics fed by delayed external
// feeds (PR133). Records which observation fed today's number, how old that
// observation was relative to the sample date, and whether the value is
// observed or a modelled fallback — so the UI can distinguish observed /
// observed-but-stale / modelled and never present a model as an observation.
export type MetricValueMode = "observed" | "observed-stale" | "modelled";

export interface MetricProvenance {
  source: string; // provider label, or the model label when mode = "modelled"
  observedAt?: string; // ISO date of the observation used; absent when modelled
  ageDays?: number; // sample date minus observedAt; absent when modelled
  mode: MetricValueMode;
}

// The feed-joined metric keys carried on cycle samples.
export type JoinedMetricKey =
  | "mvrvZ"
  | "nupl"
  | "sopr"
  | "realizedPrice"
  | "reserveRisk"
  | "rhodl";

export interface Snapshot {
  source: SnapshotSource;
  cycles: Cycle[];
  todayDayInCycle: number; // today - cycle 5 halving, in days
  sentiment?: SentimentData | null; // Fear & Greed index; absent until synced
  chain?: ChainTip | null; // live block height; absent until synced
  spot?: SpotPrice | null; // freshest daily price + changes; absent until synced
  priceHistory?: PriceHistoryPoint[] | null; // recent daily closes; absent until synced
  etf?: EtfData | null; // US spot BTC ETF flows; absent until a SoSoValue key is wired
  onchain?: OnchainData | null; // BGeometrics on-chain series; absent until a key is wired
  hodlWaves?: HodlWavesData | null; // BGeometrics HODL waves; weekly refresh
  // Per-metric provenance of the NEWEST cycle-5 sample (what "current reading"
  // UIs display). Absent on snapshots generated before PR133.
  todayProvenance?: Partial<Record<JoinedMetricKey, MetricProvenance>> | null;
  // Cost of Production — MODELLED estimate (electricity-cost model; see
  // src/lib/data/productionCost.ts). Absent until a sync with hashrate history
  // has run. points store the CENTRAL estimate only; the low/high band is a
  // documented scalar of central, derived in code.
  productionCost?: ProductionCostData | null;
}

export interface ProductionCostPoint {
  date: string; // ISO date
  value: number; // central estimate, USD per BTC
}

export interface ProductionCostData {
  source: string; // model label incl. assumptions version
  fetchedAt: string; // ISO — when the inputs were fetched
  assumptionsVersion: string;
  hashrateObservedAt: string; // ISO date of the newest hashrate observation used
  points: ProductionCostPoint[]; // ascending by date; weekly older + daily recent
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

// Recent daily close history (for the price page's short-duration views; the
// per-cycle samples are only weekly).
export interface PriceHistoryPoint {
  ts: number; // unix ms (UTC midnight)
  price: number;
}

// US spot Bitcoin ETF daily flows (SoSoValue). netFlow is the day's net
// inflow/outflow in USD; cumulative is the running net total since the FIRST
// STORED observation (recomputed over the merged archive) — the provider's
// window never reached back to the Jan-2024 launch, so this is NOT a
// since-launch figure and must not be presented as one.
export interface EtfFlowPoint {
  date: string; // ISO date
  netFlow: number; // USD, +inflow / -outflow
  cumulative: number; // USD running total
}

export interface EtfData {
  source: string;
  fetchedAt: string; // ISO
  points: EtfFlowPoint[]; // ascending by date
}

// On-chain metric series from BGeometrics / bitcoin-data.com. Each series is a
// dated value series; keyed by metric (e.g. "lthSupply", "mvrvZscore").
export interface OnchainPoint {
  date: string; // ISO date
  value: number;
}

export interface OnchainData {
  source: string;
  fetchedAt: string; // ISO
  series: Record<string, OnchainPoint[]>;
}

// HODL Waves — supply share by coin-age band. Refreshed weekly (12 endpoints
// would exceed the daily free-tier budget). Each band is a dated % series.
export interface HodlWavesData {
  source: string;
  fetchedAt: string; // ISO
  bands: Record<string, OnchainPoint[]>; // band id -> dated percentage series
}
