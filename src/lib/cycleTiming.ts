// Cycle timing analysis: when, relative to the halving, have past cycles made
// their bull-market high and their bear-market low — and where does that put
// the current cycle. Built only from real price history. Tiny sample (three
// completed cycles), so everything here is framed as historical rhythm, never
// a prediction.

import { format } from "date-fns";
import { CYCLES, HALVINGS, TODAY_DAY_IN_CYCLE, type Cycle } from "./btcData";

const MS_DAY = 86_400_000;
// Ignore the pre-next-halving spike when locating the bull top: a fresh ATH can
// print right before the following halving (as in 2024), which isn't the same
// thing as the cycle's bull-market peak.
const PEAK_CAP_DAY = 1100;

export interface CyclePeakTrough {
  id: number;
  short: string;
  label: string;
  color: string;
  halvingDate: string;
  peakDay: number;
  peakPrice: number;
  peakDate: string; // ISO calendar date of the high
  bottomDay: number | null;
  bottomPrice: number | null;
  bottomDate: string | null;
}

function bullPeak(c: Cycle) {
  const s = c.samples.filter((x) => x.day <= PEAK_CAP_DAY);
  return s.reduce((a, b) => (b.price > a.price ? b : a), s[0]);
}

function bearBottom(c: Cycle, afterDay: number) {
  const s = c.samples.filter((x) => x.day > afterDay);
  if (!s.length) return null;
  return s.reduce((a, b) => (b.price < a.price ? b : a), s[0]);
}

export function cyclePeakTroughs(): CyclePeakTrough[] {
  return CYCLES.map((c) => {
    const p = bullPeak(c);
    const b = bearBottom(c, p.day);
    const base = new Date(c.halvingDate).getTime();
    const dateOf = (day: number) => new Date(base + day * MS_DAY).toISOString();
    return {
      id: c.id,
      short: c.short,
      label: c.label,
      color: c.color,
      halvingDate: c.halvingDate,
      peakDay: p.day,
      peakPrice: p.price,
      peakDate: dateOf(p.day),
      bottomDay: b?.day ?? null,
      bottomPrice: b?.price ?? null,
      bottomDate: b ? dateOf(b.day) : null,
    };
  });
}

export interface DayWindow {
  minDay: number;
  maxDay: number;
  meanDay: number;
  startDate: string; // ISO — current cycle calendar date for minDay
  endDate: string; // ISO — for maxDay
}

function windowFrom(days: number[]): DayWindow {
  const minDay = Math.min(...days);
  const maxDay = Math.max(...days);
  const meanDay = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
  const base = new Date(HALVINGS[5]).getTime();
  const iso = (off: number) => new Date(base + off * MS_DAY).toISOString();
  return { minDay, maxDay, meanDay, startDate: iso(minDay), endDate: iso(maxDay) };
}

export type WindowPosition = "before" | "within" | "after";

function positionOf(day: number, w: DayWindow): WindowPosition {
  if (day < w.minDay) return "before";
  if (day > w.maxDay) return "after";
  return "within";
}

export interface CycleTiming {
  priors: CyclePeakTrough[];
  current: CyclePeakTrough;
  todayDay: number;
  axisMax: number;
  peakWindow: DayWindow;
  bottomWindow: DayWindow;
  currentPeak: { day: number; price: number; date: string };
  currentPeakInWindow: boolean;
  todayVsBottom: WindowPosition;
  daysToBottomOpen: number; // bottomWindow.minDay - todayDay (negative once open)
  daysToBottomClose: number;
  summary: string;
}

export function cycleTiming(): CycleTiming {
  const all = cyclePeakTroughs();
  const priors = all.filter((r) => r.id !== 5);
  const current = all.find((r) => r.id === 5)!;
  const todayDay = TODAY_DAY_IN_CYCLE;
  const base = new Date(HALVINGS[5]).getTime();

  const peakWindow = windowFrom(priors.map((r) => r.peakDay));
  const bottomWindow = windowFrom(
    priors.map((r) => r.bottomDay).filter((d): d is number => d != null),
  );

  const currentPeak = {
    day: current.peakDay,
    price: current.peakPrice,
    date: new Date(base + current.peakDay * MS_DAY).toISOString(),
  };
  const currentPeakInWindow =
    currentPeak.day >= peakWindow.minDay && currentPeak.day <= peakWindow.maxDay;

  const todayVsBottom = positionOf(todayDay, bottomWindow);
  const daysToBottomOpen = bottomWindow.minDay - todayDay;
  const daysToBottomClose = bottomWindow.maxDay - todayDay;

  const fmtD = (iso: string) => format(new Date(iso), "MMM yyyy");
  const peakPart = currentPeakInWindow
    ? `Cycle 5's highest price so far came at day ${currentPeak.day} — inside that historical peak window.`
    : `Cycle 5's highest price so far came at day ${currentPeak.day}.`;

  let bottomPart: string;
  if (todayVsBottom === "before") {
    bottomPart =
      daysToBottomOpen <= 30
        ? `Today is day ${todayDay} — right as that low window opens. If this cycle echoes the last three, the comparable low would land between roughly ${fmtD(bottomWindow.startDate)} and ${fmtD(bottomWindow.endDate)}.`
        : `Today is day ${todayDay}. By that rhythm the comparable low window would open around ${fmtD(bottomWindow.startDate)} and run to about ${fmtD(bottomWindow.endDate)}.`;
  } else if (todayVsBottom === "within") {
    bottomPart = `Today (day ${todayDay}) sits inside the window where the last three cycles reached their bear-market low — roughly ${fmtD(bottomWindow.startDate)} to ${fmtD(bottomWindow.endDate)}.`;
  } else {
    bottomPart = `Today (day ${todayDay}) is past the window where prior cycles reached their bear-market low (${fmtD(bottomWindow.startDate)}–${fmtD(bottomWindow.endDate)}).`;
  }

  const summary =
    `Across the three completed cycles, the bull-market high landed ${peakWindow.minDay}–${peakWindow.maxDay} days after the halving, and the bear-market low ${bottomWindow.minDay}–${bottomWindow.maxDay} days after. ` +
    `${peakPart} ${bottomPart} This is the rhythm of only three cycles, and the ETF era may break it — context, not a forecast.`;

  return {
    priors,
    current,
    todayDay,
    axisMax: 1100,
    peakWindow,
    bottomWindow,
    currentPeak,
    currentPeakInWindow,
    todayVsBottom,
    daysToBottomOpen,
    daysToBottomClose,
    summary,
  };
}
