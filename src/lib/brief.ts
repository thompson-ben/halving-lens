// Daily Bitcoin Cycle Brief generator — composes the engine output + live data
// into a dated brief and copyable X post/thread. No fabricated numbers; every
// figure traces to the live snapshot.

import { format } from "date-fns";
import { cycleSummary } from "./cycleSummary";
import { SOURCE, TODAY_DAY_IN_CYCLE } from "./btcData";
import { fmtPct, fmtUsd } from "./format";

export interface Brief {
  date: string; // display date
  title: string;
  headline: string;
  conclusion: string;
  disclaimer: string;
  updated: string | null;
}

const DISCLAIMER = "Historical cycle behaviour is not a forecast. This is educational analysis, not financial advice.";

export function buildBrief(): Brief {
  const s = cycleSummary();
  const today = SOURCE.fetchedAt ? new Date(SOURCE.fetchedAt) : new Date();
  return {
    date: format(today, "d MMMM yyyy"),
    title: `Bitcoin Cycle Brief — ${format(today, "d MMM yyyy")}`,
    headline:
      s.summary.includes("later") && s.summary.includes("cooler")
        ? "Later by time, cooler by price: Bitcoin continues to diverge from prior cycles."
        : s.summary,
    conclusion: s.support,
    disclaimer: DISCLAIMER,
    updated: SOURCE.fetchedAt ? `${format(today, "d MMM yyyy, HH:mm")} UTC` : null,
  };
}

// Short, copy-paste X post.
export function shortPost(): string {
  const s = cycleSummary();
  const chg =
    s.change24h != null ? ` (${fmtPct(s.change24h, 1)} ${s.changeLabel})` : "";
  return [
    "Bitcoin Cycle Brief:",
    "",
    `BTC ${fmtUsd(s.price)}${chg} · day ${s.cycleDay} of the halving cycle (${s.progressPct}% through).`,
    "",
    s.summary,
    "",
    "At this point, prior cycles had usually already peaked. This cycle is different: slower, flatter, and ETF-supported.",
    "",
    "Historical context, not financial advice.",
    "halving.lens",
  ].join("\n");
}

// Longer thread version (array of tweets).
export function threadPost(): string[] {
  const s = cycleSummary();
  const t: string[] = [];
  t.push(
    `Bitcoin Cycle Brief 🧵\n\nBTC ${fmtUsd(s.price)} · day ${s.cycleDay} of the halving cycle, ${s.progressPct}% through.\n\nPhase: ${s.phaseLabel}.`,
  );
  t.push(`1/ ${s.summary}`);
  t.push(
    `2/ ${s.support}`,
  );
  t.push(
    `3/ How stretched is it? ${s.heatPercentile != null ? `Bitcoin sits around the ${s.heatPercentile}th percentile of its historical range vs its long-term average` : "Mid-range vs its history"} — ${s.heat === "cool" || s.heat === "neutral" ? "not near the extremes that have marked past tops" : "in the higher-risk part of its range"}.`,
  );
  t.push(`4/ What makes this cycle different: ${s.whatsDifferent}`);
  t.push(`5/ What to watch: ${s.whatToWatch}`);
  t.push(
    `Historical cycle behaviour is not a forecast — educational analysis, not financial advice.\n\nFull read: halving.lens`,
  );
  return t;
}

export function briefDayLabel(): string {
  return `Day ${TODAY_DAY_IN_CYCLE} from the 2024 halving`;
}
