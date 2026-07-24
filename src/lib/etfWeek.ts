// ETF demand, composed for the State of Bitcoin editorial layer (PR128). Turns
// the raw daily flows into the three things a first-time visitor needs: what
// happened across the week (7 trading days), what happened on the latest trading
// day, and how we got there (the seven-bar shape). Plus one adaptive, deterministic
// sentence. All figures trace to the live ETF points — no fabrication, and an
// honest unavailable state before the flow source is connected.

import { ETF, etfStats } from "./etf";
import { fmtUsd } from "./format";

export interface EtfBar {
  date: string; // trading-day date
  netFlow: number; // USD
}

export interface EtfWeek {
  available: boolean;
  net7: number; // net over the last 7 trading days
  net7Label: string; // "+$593M"
  net7Positive: boolean;
  latest: { date: string; netFlow: number; label: string; positive: boolean } | null;
  bars: EtfBar[]; // last 7 trading days, oldest → newest
  interpretation: string;
}

function usd(n: number): string {
  return `${n >= 0 ? "+" : "−"}${fmtUsd(Math.abs(n), { compact: true })}`;
}

export function etfWeek(): EtfWeek {
  if (!ETF.connected || ETF.points.length === 0) {
    return {
      available: false,
      net7: 0,
      net7Label: "—",
      net7Positive: false,
      latest: null,
      bars: [],
      interpretation: "Spot ETF flow data isn't connected yet — it will appear here once the source is live.",
    };
  }

  const stats = etfStats();
  const net7 = stats.trailingWeek;
  const bars: EtfBar[] = ETF.points.slice(-7).map((p) => ({ date: p.date, netFlow: p.netFlow }));
  const latestPoint = stats.latest!;
  const latest = {
    date: latestPoint.date,
    netFlow: latestPoint.netFlow,
    label: usd(latestPoint.netFlow),
    positive: latestPoint.netFlow >= 0,
  };

  // Adaptive, deterministic interpretation of the week vs the latest day.
  const weekPos = net7 >= 0;
  const dayPos = latest.netFlow >= 0;
  let interpretation: string;
  if (weekPos && !dayPos) {
    interpretation = "Despite a net outflow on the latest trading day, ETF demand stayed positive across the week.";
  } else if (weekPos && dayPos) {
    interpretation = "Net inflows continued across the week, including on the latest trading day.";
  } else if (!weekPos && dayPos) {
    interpretation = "An inflow on the latest trading day only partly offset a week of net outflows.";
  } else {
    interpretation = "Net outflows persisted across the week, including on the latest trading day.";
  }

  return {
    available: true,
    net7,
    net7Label: usd(net7),
    net7Positive: weekPos,
    latest,
    bars,
    interpretation,
  };
}
