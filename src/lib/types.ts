export type Chain = "ethereum" | "solana" | "base" | "arbitrum" | "bitcoin";

export type InsiderActivity = "quiet" | "accumulating" | "distributing";

export interface Token {
  symbol: string;
  name: string;
  chain: Chain;
  address?: string;
  rank: number;
  price: number;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  fdv: number;
  spark7d: number[];
  // On-chain signals (the wedge)
  smartMoneyFlow24h: number; // USD; positive = net buys by smart wallets
  smartMoneyHolders: number;
  holderConcentrationTop10: number; // 0..1
  freshWalletsPct: number; // 0..1
  netExchangeFlow24h: number; // USD; positive = inflow to CEX (bearish)
  insider: InsiderActivity;
}

export interface SmartWallet {
  address: string;
  label?: string;
  ens?: string;
  chain: Chain;
  pnl30d: number;
  pnlAllTime: number;
  winRate: number; // 0..1
  trades30d: number;
  followers: number;
  bestCall?: { symbol: string; returnPct: number };
  portfolio: Array<{ symbol: string; valueUsd: number; pnlPct: number }>;
}

export interface OnchainTrade {
  id: string;
  walletAddress: string;
  walletLabel?: string;
  side: "buy" | "sell";
  tokenSymbol: string;
  tokenName: string;
  chain: Chain;
  amountUsd: number;
  tokens: number;
  priceImpactPct: number;
  txHash: string;
  timestamp: number; // unix ms
}

export interface HolderBucket {
  label: string; // e.g. "Top 1", "2-10", "11-100"
  pctSupply: number; // 0..1
  wallets: number;
}
