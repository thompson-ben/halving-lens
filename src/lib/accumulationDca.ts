// Dynamic DCA simulator for the Accumulation Score. Compares a flat weekly
// contribution against one that scales with the historical accumulation
// environment — buying more when conditions were historically cheap, less when
// historically overheated — over Bitcoin's full weekly history.
//
// Educational backtest only: it shows how the rule WOULD have behaved on past
// data. It is not advice and not a prediction of future results.

import { accumulationSeries, type AccumulationBandKey } from "./accumulation";

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
