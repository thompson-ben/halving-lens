// Dynamic DCA simulator for the Accumulation Score. Compares a flat weekly
// contribution against one that scales with the historical accumulation
// environment — buying more when conditions were historically cheap, less when
// historically overheated — over Bitcoin's full weekly history.
//
// Educational backtest only: it shows how the rule WOULD have behaved on past
// data. It is not advice and not a prediction of future results.

import { accumulationSeries, overheatedRunStats, type AccumulationBandKey } from "./accumulation";

export interface DcaPlanResult {
  label: string;
  invested: number;
  btc: number;
  avgCost: number; // £ per BTC
  endValue: number;
  roiPct: number;
}

export interface DcaSimulation {
  from: string;
  to: string;
  weeks: number;
  endPrice: number;
  standardWeekly: number;
  dynamicByBand: Record<AccumulationBandKey, number>;
  standard: DcaPlanResult;
  dynamic: DcaPlanResult;
  // Dynamic vs standard, normalised so the comparison is fair.
  roiAdvantagePts: number; // dynamic ROI − standard ROI, in percentage points
  btcPerThousandStandard: number; // BTC accumulated per £1,000 invested
  btcPerThousandDynamic: number;
  extraBtcPctPer1k: number; // % more BTC-per-£ the dynamic plan accumulated
  notes: string[];
}

export interface DcaOptions {
  standardWeekly?: number; // default £100/week
  dynamicByBand?: Record<AccumulationBandKey, number>;
  from?: string; // YYYY-MM-DD inclusive; default = first week with a 200w-MA factor
  to?: string; // YYYY-MM-DD inclusive; default = latest
}

const DEFAULT_DYNAMIC: Record<AccumulationBandKey, number> = {
  deep_value: 200,
  attractive: 150,
  neutral: 100,
  elevated: 75,
  overheated: 50,
};

export function simulateDca(opts: DcaOptions = {}): DcaSimulation {
  const standardWeekly = opts.standardWeekly ?? 100;
  const dynamicByBand = opts.dynamicByBand ?? DEFAULT_DYNAMIC;
  const series = accumulationSeries();

  // Default start: first point where the 200-week factor is available, so both
  // plans run over a window where the score uses its full factor set.
  const defaultFrom = series.find((p) => p.ma200wMult != null)?.date ?? series[0].date;
  const from = opts.from ?? defaultFrom;
  const to = opts.to ?? series[series.length - 1].date;

  const window = series.filter((p) => p.date >= from && p.date <= to);
  const endPrice = window[window.length - 1].price;

  const run = (amountFor: (key: AccumulationBandKey) => number, label: string): DcaPlanResult => {
    let invested = 0;
    let btc = 0;
    for (const p of window) {
      const amt = amountFor(p.bandKey);
      invested += amt;
      btc += amt / p.price;
    }
    const endValue = btc * endPrice;
    return {
      label,
      invested: Math.round(invested),
      btc,
      avgCost: btc > 0 ? invested / btc : 0,
      endValue: Math.round(endValue),
      roiPct: invested > 0 ? Math.round((endValue / invested - 1) * 100) : 0,
    };
  };

  const standard = run(() => standardWeekly, "Standard DCA");
  const dynamic = run((k) => dynamicByBand[k], "Dynamic DCA");

  const btcPerThousandStandard = (standard.btc / standard.invested) * 1000;
  const btcPerThousandDynamic = (dynamic.btc / dynamic.invested) * 1000;

  return {
    from,
    to,
    weeks: window.length,
    endPrice,
    standardWeekly,
    dynamicByBand,
    standard,
    dynamic,
    roiAdvantagePts: dynamic.roiPct - standard.roiPct,
    btcPerThousandStandard,
    btcPerThousandDynamic,
    extraBtcPctPer1k: Math.round((btcPerThousandDynamic / btcPerThousandStandard - 1) * 100),
    notes: [
      "Both plans buy at the weekly sample price; the dynamic plan varies its contribution by the historical accumulation band.",
      "ROI compares per-pound efficiency; the plans invest different totals, so 'BTC per £1,000' is the fairest like-for-like.",
      "Outcome depends heavily on the chosen window; this is descriptive history, not a forecast or advice.",
    ],
  };
}

// ── Accumulate & Distribute ──────────────────────────────────────────────────
// A second rule that not only scales buying but also TRIMS the position in
// historically overheated conditions. It buys when the environment is neutral or
// below, reduces (or pauses) buying when elevated, and in the overheated band it
// stops buying and sells a small, fixed slice of the holding each week.
//
// Sell sizing (the user's question — "what % should we sell?"): rather than
// trying to call the exact top, we spread a target trim across a typical
// overheated stretch. Historically Bitcoin has spent an AVERAGE of `avgWeeks` in
// the overheated band per stretch, so to trim `targetSellPct` of the position
// across a typical stretch we sell `targetSellPct / avgWeeks` of the *current*
// holding each overheated week. A long-term core is intentionally retained.
//
// Educational backtest only — the score never says "sell"; this just shows how a
// mechanical trim-into-strength rule WOULD have behaved on past data.

export interface DistributePlanResult {
  label: string;
  contributed: number; // gross cash put into buys
  proceeds: number; // gross cash realised from trims
  netInvested: number; // contributed − proceeds
  btc: number; // BTC still held at the end
  btcBought: number; // total BTC ever bought (for avg cost)
  avgCost: number; // £ per BTC across buys
  endValue: number; // remaining BTC value + cash realised from trims
  roiPct: number; // endValue vs gross contributed
  sellWeeks: number; // weeks in which a trim occurred
  valuePerThousand: number; // end portfolio value per £1,000 contributed
}

export interface DistributeSimulation {
  from: string;
  to: string;
  weeks: number;
  endPrice: number;
  standardWeekly: number;
  buyByBand: Record<AccumulationBandKey, number>; // contribution multiplier; overheated is 0 (sell instead)
  targetSellPct: number; // % of the position to trim across a typical overheated stretch
  avgOverheatedWeeks: number; // mean length of an overheated stretch (weeks)
  weeklySellPct: number; // targetSellPct / avgOverheatedWeeks, the per-week trim
  overheatedRunCount: number;
  overheatedFirstYear: string;
  standard: DcaPlanResult;
  distribute: DistributePlanResult;
  extraValuePctPer1k: number; // distribute end-value-per-£ vs standard
  btcRetainedPct: number; // distribute end BTC ÷ standard end BTC (× 100)
  cashOutPct: number; // proceeds as a share of the end portfolio
  notes: string[];
}

export interface DistributeOptions {
  standardWeekly?: number;
  buyByBand?: Record<AccumulationBandKey, number>;
  targetSellPct?: number; // default 20
  from?: string;
  to?: string;
}

const DEFAULT_BUY: Record<AccumulationBandKey, number> = {
  deep_value: 2,
  attractive: 1.5,
  neutral: 1,
  elevated: 0.5,
  overheated: 0, // overheated weeks sell instead of buying
};

export function simulateAccumulateDistribute(opts: DistributeOptions = {}): DistributeSimulation {
  const standardWeekly = opts.standardWeekly ?? 100;
  const buyByBand = opts.buyByBand ?? DEFAULT_BUY;
  const targetSellPct = opts.targetSellPct ?? 20;
  const series = accumulationSeries();

  const defaultFrom = series.find((p) => p.ma200wMult != null)?.date ?? series[0].date;
  const from = opts.from ?? defaultFrom;
  const to = opts.to ?? series[series.length - 1].date;
  const window = series.filter((p) => p.date >= from && p.date <= to);
  const endPrice = window[window.length - 1].price;

  const runs = overheatedRunStats();
  const avgOverheatedWeeks = runs.avgWeeks > 0 ? runs.avgWeeks : 1;
  // Per-week trim, as a fraction of the current holding. Guarded to [0, 1].
  const weeklySellFrac = Math.min(1, Math.max(0, targetSellPct / 100 / avgOverheatedWeeks));

  // Standard flat DCA over the same window (buy-only, never sells) — the baseline.
  let sInvested = 0;
  let sBtc = 0;
  for (const p of window) {
    sInvested += standardWeekly;
    sBtc += standardWeekly / p.price;
  }
  const standard: DcaPlanResult = {
    label: "Standard DCA",
    invested: Math.round(sInvested),
    btc: sBtc,
    avgCost: sBtc > 0 ? sInvested / sBtc : 0,
    endValue: Math.round(sBtc * endPrice),
    roiPct: sInvested > 0 ? Math.round(((sBtc * endPrice) / sInvested - 1) * 100) : 0,
  };

  // Accumulate & Distribute.
  let contributed = 0;
  let proceeds = 0;
  let btc = 0;
  let btcBought = 0;
  let sellWeeks = 0;
  for (const p of window) {
    if (p.bandKey === "overheated") {
      const sellBtc = btc * weeklySellFrac;
      if (sellBtc > 0) {
        btc -= sellBtc;
        proceeds += sellBtc * p.price;
        sellWeeks += 1;
      }
    } else {
      const amt = standardWeekly * (buyByBand[p.bandKey] ?? 0);
      if (amt > 0) {
        contributed += amt;
        btc += amt / p.price;
        btcBought += amt / p.price;
      }
    }
  }
  const endValue = btc * endPrice + proceeds;
  const distribute: DistributePlanResult = {
    label: "Accumulate & Distribute",
    contributed: Math.round(contributed),
    proceeds: Math.round(proceeds),
    netInvested: Math.round(contributed - proceeds),
    btc,
    btcBought,
    avgCost: btcBought > 0 ? contributed / btcBought : 0,
    endValue: Math.round(endValue),
    roiPct: contributed > 0 ? Math.round(((endValue / contributed) - 1) * 100) : 0,
    sellWeeks,
    valuePerThousand: contributed > 0 ? (endValue / contributed) * 1000 : 0,
  };

  const standardValuePerThousand = sInvested > 0 ? (sBtc * endPrice) / sInvested * 1000 : 0;

  return {
    from,
    to,
    weeks: window.length,
    endPrice,
    standardWeekly,
    buyByBand,
    targetSellPct,
    avgOverheatedWeeks,
    weeklySellPct: weeklySellFrac * 100,
    overheatedRunCount: runs.count,
    overheatedFirstYear: runs.firstYear,
    standard,
    distribute,
    extraValuePctPer1k:
      standardValuePerThousand > 0
        ? Math.round((distribute.valuePerThousand / standardValuePerThousand - 1) * 100)
        : 0,
    btcRetainedPct: sBtc > 0 ? Math.round((btc / sBtc) * 100) : 0,
    cashOutPct: endValue > 0 ? Math.round((proceeds / endValue) * 100) : 0,
    notes: [
      "Buys on neutral-or-below weeks, eases off when elevated, and in the overheated band stops buying and trims a fixed slice of the holding each week.",
      "The weekly trim is target% ÷ the average historical length of an overheated stretch, so a target trim is spread across a typical stretch rather than timed to the exact top.",
      "End value counts remaining Bitcoin plus the cash raised from trims (held, not reinvested); 'BTC retained' shows how much of a pure-hold stack is intentionally kept.",
      "A long-term core is deliberately retained — this is not a full exit. Descriptive history only, not a forecast or advice.",
    ],
  };
}
