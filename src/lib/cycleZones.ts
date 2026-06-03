// Cycle context — the data behind the signature "Where are we in the cycle?"
// chart. Historical phase zones (derived from where prior cycles actually
// expanded and topped), the historical peak/low windows, the five headline
// stats, and the answer-first dynamic insight. Historical context, never a
// forecast.

import { CURRENT_CYCLE, TODAY_DAY_IN_CYCLE, DAYS_PER_CYCLE } from "./btcData";
import { cycleTiming } from "./cycleTiming";
import { cycleScorecard, cycleSummary } from "./cycleSummary";
import { drawdownAnalysis } from "./drawdowns";
import { sentimentRead, sentimentPercentile, SENTIMENT_AVAILABLE } from "./sentiment";

export interface CycleZone {
  key: "accumulation" | "expansion" | "euphoria" | "blow_off";
  label: string;
  color: string; // hex for the translucent background band
  startDay: number;
  endDay: number;
}

export interface DayWindow {
  startDay: number;
  endDay: number;
  label: string;
}

export interface CycleContext {
  axisMax: number;
  todayDay: number;
  zones: CycleZone[];
  peakWindow: DayWindow;
  lowWindow: DayWindow;
  // The current cycle's price path, by day since the halving.
  priceByDay: { day: number; price: number }[];
}

// Phase zones derived from the three completed cycles' real peak window: the
// expansion ramps into the peak window (where prior cycles topped), euphoria is
// the run into the average top, blow-off is the topping band itself. Not
// arbitrary percentages — anchored to when past cycles actually peaked.
export function cycleContext(): CycleContext {
  const t = cycleTiming();
  const peak = t.peakWindow;
  const low = t.bottomWindow;
  const accEnd = Math.round(peak.minDay * 0.5);

  const zones: CycleZone[] = [
    { key: "accumulation", label: "Accumulation", color: "#3ddc97", startDay: 0, endDay: accEnd },
    { key: "expansion", label: "Expansion", color: "#f5b942", startDay: accEnd, endDay: peak.minDay },
    { key: "euphoria", label: "Euphoria", color: "#ff9f43", startDay: peak.minDay, endDay: peak.meanDay },
    { key: "blow_off", label: "Blow-off top", color: "#ff5d5d", startDay: peak.meanDay, endDay: peak.maxDay },
  ];

  const priceByDay = CURRENT_CYCLE.samples
    .filter((s) => s.price > 0)
    .map((s) => ({ day: s.day, price: s.price }));

  return {
    axisMax: DAYS_PER_CYCLE,
    todayDay: TODAY_DAY_IN_CYCLE,
    zones,
    peakWindow: { startDay: peak.minDay, endDay: peak.maxDay, label: "Historical peak window" },
    lowWindow: { startDay: low.minDay, endDay: low.maxDay, label: "Historical low window" },
    priceByDay,
  };
}

export interface ContextStat {
  label: string;
  value: string;
  tone?: "up" | "down" | "neutral" | "accent";
}

export function cycleContextStats(): ContextStat[] {
  const s = cycleSummary();
  const sc = cycleScorecard();
  const dd = drawdownAnalysis();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  return [
    { label: "Bitcoin price", value: fmtUsdShort(s.price), tone: "neutral" },
    { label: "Cycle day", value: `${s.cycleDay} · ${s.progressPct}%`, tone: "neutral" },
    { label: "Cycle score", value: `${sc.overall} · ${sc.overallLabel}`, tone: "accent" },
    { label: "Current drawdown", value: `${Math.round(dd.current)}%`, tone: dd.current < -0.5 ? "down" : "neutral" },
    { label: "Fear & Greed", value: sr ? `${sr.value} · ${sr.band.label}` : "—", tone: "neutral" },
  ];
}

export interface DynamicInsight {
  metric: string; // e.g. "Current Cycle Day"
  value: string; // e.g. "775"
  headline: string; // the answer-first sentence(s)
}

// Answer-first: the single most salient read of where we are, surfaced ABOVE
// the chart. Window position leads (it's the flagship), then sentiment
// extremes, then drawdown framing, then a plain cycle-position fallback.
export function cycleContextInsight(): DynamicInsight {
  const t = cycleTiming();
  const dd = drawdownAnalysis();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;
  const fg = sr?.value ?? null;
  const day = t.todayDay;

  const peakLabel = `day ${t.peakWindow.minDay}–${t.peakWindow.maxDay}`;
  const lowLabel = `day ${t.bottomWindow.minDay}–${t.bottomWindow.maxDay}`;

  // 1. Position relative to the historical low / peak windows.
  if (day >= t.peakWindow.minDay && day <= t.peakWindow.maxDay) {
    return { metric: "Current cycle day", value: String(day), headline: `You are inside the window where the last three cycles set their bull-market top (${peakLabel} after the halving).` };
  }
  if (t.todayVsBottom === "within") {
    return { metric: "Current cycle day", value: String(day), headline: `You are inside the historical bear-market low window (${lowLabel} after the halving). This is context from three cycles, not a forecast.` };
  }
  if (t.todayVsBottom === "before" && t.daysToBottomOpen <= 75) {
    return { metric: "Current cycle day", value: String(day), headline: `You are now approaching the historical bear-market low window (${lowLabel} after the halving), which opens in about ${t.daysToBottomOpen} days.` };
  }

  // 2. Sentiment extreme.
  if (fg != null && fg <= 20) {
    const pct = sentimentPercentile(fg);
    return { metric: "Fear & Greed", value: String(fg), headline: pct != null ? `Sentiment is in deep fear — only about ${Math.round(pct)}% of recorded history has been this fearful or lower.` : "Sentiment is in deep fear by historical standards." };
  }
  if (fg != null && fg >= 80) {
    const pct = sentimentPercentile(fg);
    return { metric: "Fear & Greed", value: String(fg), headline: pct != null ? `Sentiment is in extreme greed — higher than roughly ${Math.round(pct)}% of all recorded history.` : "Sentiment is in extreme greed by historical standards." };
  }

  // 3. Drawdown framing.
  if (Math.abs(dd.current) >= 8) {
    const avg = Math.abs(dd.avgAtStage);
    const rel = Math.abs(dd.current) < avg - 3 ? "smaller than" : Math.abs(dd.current) > avg + 3 ? "larger than" : "in line with";
    return { metric: "Current drawdown", value: `${Math.round(dd.current)}%`, headline: `This drawdown is ${rel} the ~${Math.round(avg)}% prior cycles averaged at the same point after the halving.` };
  }

  // 4. Fallback — plain cycle position.
  return { metric: "Current cycle day", value: String(day), headline: `Day ${day} of the halving cycle. Prior cycles set their bull-market top around ${peakLabel} and their bear-market low around ${lowLabel} after the halving.` };
}

function fmtUsdShort(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k`;
  return `$${n.toFixed(0)}`;
}
