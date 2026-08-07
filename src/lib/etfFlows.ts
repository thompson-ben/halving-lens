// ETF Flows — the public "what are institutions doing?" read that powers the
// upgraded /etf page. It derives everything the dashboard needs from the single
// aggregate series the snapshot already carries ({date, netFlow, cumulative} per
// day across ALL US spot BTC ETFs). It deliberately does NOT fabricate per-fund
// data: the source is aggregate-only, so the per-ETF table stays an honest
// "coming soon" until a per-issuer source is connected.

import { ETF, etfStats, type EtfFlowPoint, type EtfStats } from "./etf";

export interface FlowWindow {
  days: number; // how many data points the window actually covers
  net: number; // summed net flow over the window (USD)
  avgPerDay: number; // mean daily net flow over the window (USD)
}

export interface FlowStreak {
  direction: "inflow" | "outflow" | "flat";
  length: number; // consecutive days in that direction, ending today
}

export interface EtfFlowsRead {
  connected: boolean;
  source: string | null;
  fetchedAt: string | null;
  seriesStart: string | null; // first date in the series (NOT the real Jan-2024 launch)
  totalDays: number;
  base: EtfStats; // latest / cumulative / biggest in-out / trailingWeek
  windows: { d7: FlowWindow; d30: FlowWindow; d90: FlowWindow };
  avgDaily: number; // mean daily net flow across the WHOLE series
  streak: FlowStreak;
  // Percentile rank of today's net flow across the whole series (100 = biggest
  // inflow day on record, 0 = biggest outflow day on record).
  todayPercentile: number | null;
  // Yesterday-vs-today: change in the daily net-flow figure.
  dayDelta: number | null;
  prev: EtfFlowPoint | null;
  points: EtfFlowPoint[];
}

function windowOf(points: EtfFlowPoint[], n: number): FlowWindow {
  const slice = points.slice(-n);
  const net = slice.reduce((sum, p) => sum + p.netFlow, 0);
  return { days: slice.length, net, avgPerDay: slice.length ? net / slice.length : 0 };
}

function streakOf(points: EtfFlowPoint[]): FlowStreak {
  if (!points.length) return { direction: "flat", length: 0 };
  const sign = (v: number) => (v > 0 ? 1 : v < 0 ? -1 : 0);
  const last = sign(points[points.length - 1].netFlow);
  if (last === 0) return { direction: "flat", length: 0 };
  let length = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    if (sign(points[i].netFlow) === last) length++;
    else break;
  }
  return { direction: last > 0 ? "inflow" : "outflow", length };
}

// Rank of today's net flow across the series, 0..100 (percentile).
function todayPercentileOf(points: EtfFlowPoint[]): number | null {
  if (points.length < 2) return null;
  const today = points[points.length - 1].netFlow;
  const below = points.filter((p) => p.netFlow <= today).length;
  return Math.round((below / points.length) * 100);
}

export function etfFlowsRead(): EtfFlowsRead {
  const points = ETF.points;
  const base = etfStats();
  const totalDays = points.length;
  const avgDaily = totalDays ? points.reduce((sum, p) => sum + p.netFlow, 0) / totalDays : 0;

  return {
    connected: ETF.connected,
    source: ETF.source,
    fetchedAt: ETF.fetchedAt,
    seriesStart: points[0]?.date ?? null,
    totalDays,
    base,
    windows: {
      d7: windowOf(points, 7),
      d30: windowOf(points, 30),
      d90: windowOf(points, 90),
    },
    avgDaily,
    streak: streakOf(points),
    todayPercentile: todayPercentileOf(points),
    dayDelta: points.length >= 2 ? points[points.length - 1].netFlow - points[points.length - 2].netFlow : null,
    prev: points.length >= 2 ? points[points.length - 2] : null,
    points,
  };
}

// Plain-English interpretation of the current flow regime — measured, never
// sensational. Driven by the trailing-week direction + magnitude and the streak.
export function etfFlowsInterpretation(r: EtfFlowsRead): string {
  if (!r.connected) return "ETF flow data isn't connected yet.";
  const wk = r.base.trailingWeek;
  const streak = r.streak;
  const streakClause =
    streak.length >= 2 ? ` That's ${streak.length} straight days of net ${streak.direction}s.` : "";
  if (wk > 1e9) return `Institutional demand looks strong — net inflows over the past 7 trading days.${streakClause}`;
  if (wk > 0) return `Institutional demand is positive but modest over the past 7 trading days.${streakClause}`;
  if (wk > -1e9) return `Demand has cooled — roughly flat to slightly negative over the past 7 trading days.${streakClause}`;
  return `Net selling pressure over the past 7 trading days — the ETFs have been in net outflow.${streakClause}`;
}
