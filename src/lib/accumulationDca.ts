// Dynamic DCA simulator for the Accumulation Score. Compares a flat weekly
// contribution against one that scales with the historical accumulation
// environment — buying more when conditions were historically cheap, less when
// historically overheated — over Bitcoin's full weekly history.
//
// Educational backtest only: it shows how the rule WOULD have behaved on past
// data. It is not advice and not a prediction of future results.

import { accumulationSeries, overheatedRunStats, cheapRunStats, type AccumulationBandKey } from "./accumulation";

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

// ── Three-way comparison: DCA vs Dynamic DCA vs Dynamic DCA + Distribution ────
// All three run over the SAME window and the SAME weekly budget, so they answer
// one question: given long-term growth, which rule did most with the money?
//
//   1. Standard DCA      — flat weekly buy, never sells.
//   2. Dynamic DCA       — buy scaled by the historical band (more when cheap,
//                          less when overheated), never sells.
//   3. + Distribution    — same scaled buying, but in the overheated band it
//                          stops buying and TRIMS the holding, pays capital gains
//                          tax on the realised profit, banks the net as a cash
//                          "war chest", then redeploys that war chest into extra
//                          buys when Bitcoin is back in attractive-or-cheaper
//                          territory ("buy the dip with realised profit").
//
// Sell sizing: trim `targetSellPct` spread across a typical overheated stretch,
// i.e. targetSellPct ÷ average historical overheated weeks per week. Redeploy
// sizing is symmetric: spend the war chest across a typical cheap stretch.
//
// Capital gains: a flat `taxRatePct` of each trim's PROFIT (proceeds above the
// average-cost basis of the Bitcoin sold) is deducted before banking the cash.
//
// Educational backtest only — the score never says "buy" or "sell"; this shows
// how each mechanical rule WOULD have behaved on past data. Not advice.

export interface ScenarioResult {
  key: "standard" | "dynamic" | "distribute";
  label: string;
  investedNew: number; // external money the saver actually contributed
  btc: number; // BTC held at the end
  cash: number; // leftover war-chest cash (distribution only)
  endValue: number; // btc × endPrice + cash
  roiPct: number; // endValue vs investedNew
  avgCost: number; // £ per BTC acquired
  valuePerThousand: number; // end value per £1,000 of new money
  btcPerThousand: number; // BTC per £1,000 of new money
}

export interface DistributeExtra {
  proceedsGross: number; // total cash from trims, before tax
  taxPaid: number; // capital gains tax deducted
  reinvested: number; // war-chest cash redeployed into extra buys
  sellWeeks: number;
  btcRetainedPct: number; // end BTC ÷ Dynamic DCA's end BTC (× 100)
}

export interface ThreeWaySimulation {
  from: string;
  to: string;
  weeks: number;
  endPrice: number;
  standardWeekly: number;
  buyByBand: Record<AccumulationBandKey, number>;
  targetSellPct: number;
  taxRatePct: number;
  avgOverheatedWeeks: number;
  weeklySellPct: number; // targetSellPct ÷ avgOverheatedWeeks
  avgCheapWeeks: number;
  weeklyRedeployPct: number; // share of the war chest deployed per cheap week
  overheatedRunCount: number;
  overheatedFirstYear: string;
  standard: ScenarioResult;
  dynamic: ScenarioResult;
  distribute: ScenarioResult & DistributeExtra;
  bestKey: "standard" | "dynamic" | "distribute"; // by end value per £1,000
  notes: string[];
}

export interface ThreeWayOptions {
  standardWeekly?: number;
  buyByBand?: Record<AccumulationBandKey, number>;
  targetSellPct?: number; // default 20
  taxRatePct?: number; // default 20
  from?: string;
  to?: string;
}

const DEFAULT_BUY_LADDER: Record<AccumulationBandKey, number> = {
  deep_value: 2,
  attractive: 1.5,
  neutral: 1,
  elevated: 0.5,
  overheated: 0.25, // Dynamic DCA buys this; Distribution sells instead
};

export function simulateThreeWay(opts: ThreeWayOptions = {}): ThreeWaySimulation {
  const standardWeekly = opts.standardWeekly ?? 100;
  const buyByBand = opts.buyByBand ?? DEFAULT_BUY_LADDER;
  const targetSellPct = opts.targetSellPct ?? 20;
  const taxRatePct = opts.taxRatePct ?? 20;
  const series = accumulationSeries();

  const defaultFrom = series.find((p) => p.ma200wMult != null)?.date ?? series[0].date;
  const from = opts.from ?? defaultFrom;
  const to = opts.to ?? series[series.length - 1].date;
  const window = series.filter((p) => p.date >= from && p.date <= to);
  const endPrice = window[window.length - 1].price;

  const oRuns = overheatedRunStats();
  const cRuns = cheapRunStats();
  const avgOverheatedWeeks = oRuns.avgWeeks > 0 ? oRuns.avgWeeks : 1;
  const avgCheapWeeks = cRuns.avgWeeks > 0 ? cRuns.avgWeeks : 1;
  const weeklySellFrac = Math.min(1, Math.max(0, targetSellPct / 100 / avgOverheatedWeeks));
  // Redeploy the war chest across a typical cheap stretch (fraction of the
  // remaining reserve each cheap week). Guarded to [0, 1].
  const weeklyRedeployFrac = Math.min(1, Math.max(0, 1 / avgCheapWeeks));
  const taxRate = taxRatePct / 100;

  // 1. Standard flat DCA.
  let sInv = 0;
  let sBtc = 0;
  for (const p of window) {
    sInv += standardWeekly;
    sBtc += standardWeekly / p.price;
  }

  // 2. Dynamic DCA — scaled buys every week (including a reduced overheated buy),
  //    never sells.
  let dInv = 0;
  let dBtc = 0;
  for (const p of window) {
    const amt = standardWeekly * (buyByBand[p.bandKey] ?? 0);
    if (amt > 0) {
      dInv += amt;
      dBtc += amt / p.price;
    }
  }

  // 3. Dynamic DCA + Distribution — scaled buys on non-overheated weeks; trim,
  //    tax, bank and redeploy in overheated/cheap weeks.
  let invNew = 0; // external contributions only
  let btc = 0;
  let basis = 0; // average-cost basis of held BTC
  let cash = 0; // war chest (net of tax)
  let proceedsGross = 0;
  let taxPaid = 0;
  let reinvested = 0;
  let sellWeeks = 0;
  for (const p of window) {
    if (p.bandKey === "overheated") {
      // Trim into strength, realise gains, pay tax, bank the rest.
      const sellBtc = btc * weeklySellFrac;
      if (sellBtc > 0) {
        const gross = sellBtc * p.price;
        const costOut = btc > 0 ? basis * (sellBtc / btc) : 0;
        const tax = Math.max(0, gross - costOut) * taxRate;
        btc -= sellBtc;
        basis -= costOut;
        proceedsGross += gross;
        taxPaid += tax;
        cash += gross - tax;
        sellWeeks += 1;
      }
    } else {
      // Regular scaled buy with new money.
      const amt = standardWeekly * (buyByBand[p.bandKey] ?? 0);
      if (amt > 0) {
        invNew += amt;
        btc += amt / p.price;
        basis += amt;
      }
      // Redeploy the war chest when Bitcoin is attractive-or-cheaper.
      if ((p.bandKey === "deep_value" || p.bandKey === "attractive") && cash > 0) {
        const deploy = cash * weeklyRedeployFrac;
        if (deploy > 0) {
          btc += deploy / p.price;
          basis += deploy;
          cash -= deploy;
          reinvested += deploy;
        }
      }
    }
  }

  const mk = (
    key: ScenarioResult["key"],
    label: string,
    invested: number,
    btcEnd: number,
    cashEnd: number,
    costOfHeldBtc: number, // total cost basis of the BTC still held
  ): ScenarioResult => {
    const endValue = btcEnd * endPrice + cashEnd;
    return {
      key,
      label,
      investedNew: Math.round(invested),
      btc: btcEnd,
      cash: Math.round(cashEnd),
      endValue: Math.round(endValue),
      roiPct: invested > 0 ? Math.round((endValue / invested - 1) * 100) : 0,
      avgCost: btcEnd > 0 ? costOfHeldBtc / btcEnd : 0,
      valuePerThousand: invested > 0 ? (endValue / invested) * 1000 : 0,
      btcPerThousand: invested > 0 ? (btcEnd / invested) * 1000 : 0,
    };
  };

  const standard = mk("standard", "Standard DCA", sInv, sBtc, 0, sInv);
  const dynamic = mk("dynamic", "Dynamic DCA", dInv, dBtc, 0, dInv);
  const distributeBase = mk("distribute", "Dynamic DCA + Distribution", invNew, btc, cash, basis);
  const distribute: ScenarioResult & DistributeExtra = {
    ...distributeBase,
    proceedsGross: Math.round(proceedsGross),
    taxPaid: Math.round(taxPaid),
    reinvested: Math.round(reinvested),
    sellWeeks,
    btcRetainedPct: dBtc > 0 ? Math.round((btc / dBtc) * 100) : 0,
  };

  // Winner for long-term growth = most end value per £1,000 of new money.
  const ranked = [standard, dynamic, distribute].sort((a, b) => b.valuePerThousand - a.valuePerThousand);
  const bestKey = ranked[0].key;

  return {
    from,
    to,
    weeks: window.length,
    endPrice,
    standardWeekly,
    buyByBand,
    targetSellPct,
    taxRatePct,
    avgOverheatedWeeks,
    weeklySellPct: weeklySellFrac * 100,
    avgCheapWeeks,
    weeklyRedeployPct: weeklyRedeployFrac * 100,
    overheatedRunCount: oRuns.count,
    overheatedFirstYear: oRuns.firstYear,
    standard,
    dynamic,
    distribute,
    bestKey,
    notes: [
      "All three run over the same window and weekly budget; results are compared per £1,000 of new money you contributed, so recycled profit doesn't flatter the distribution plan.",
      "The weekly trim is target% ÷ the average historical overheated stretch; the war chest is redeployed across a typical cheap stretch. Neither tries to call the exact top or bottom.",
      `Capital gains are modelled as a flat ${taxRatePct}% of each trim's realised profit; the net is banked and reinvested into extra buys when Bitcoin is attractive-or-cheaper.`,
      "Selling realises tax and gives up Bitcoin that, in a long uptrend, often kept rising — so distribution can trail pure accumulation even after reinvesting. Descriptive history only, not advice.",
    ],
  };
}
