// "Documenting the Bitcoin Cycle" — episode prep, assembled entirely from the
// shared snapshot aggregators and metric-change service. Because it reuses the
// exact same computed numbers and commentary as the /snapshot dashboard, the
// weekly episode, the social packs and the website can never quote different
// weekly figures (PART 11 — the website is the single source of truth).
//
// The structure mirrors the standard episode running order (PART 7), so the
// founder can record with minimal or no separate research preparation.

import { metricChange } from "./metricChange";
import { snapshotWhatChanged, snapshotContext, snapshotWatchItems } from "./snapshot";
import { cycleSummary } from "./cycleSummary";
import { selectChartOfWeek } from "./chartOfWeek";
import { latestFindings } from "./findings";
import { fmtUsd } from "./format";

export interface EpisodeBrief {
  opening: string;
  scoreboard: string[];
  whatChanged: string[];
  context: string;
  chartOfWeek: { title: string; why: string };
  research: { id: string; title: string; conclusion: string } | null;
  watch: string[];
}

export function episodeBrief(): EpisodeBrief {
  const s = cycleSummary();
  const price = metricChange("price");
  const c7 = price.changes.find((c) => c.period === 7 && c.available);
  const weekMove =
    c7 && c7.pctChange != null && Math.abs(c7.pctChange) >= 0.05
      ? `${c7.pctChange >= 0 ? "up" : "down"} ${Math.abs(c7.pctChange).toFixed(1)}% on the week`
      : "little changed on the week";

  const scoreboard = (["market_health", "sentiment", "accumulation", "etf_flow"] as const)
    .map((id) => metricChange(id))
    .filter((m) => m.available)
    .map((m) => m.summary);

  const cotw = selectChartOfWeek();
  const finding = latestFindings(1)[0] ?? null;

  return {
    opening: `Bitcoin is ${fmtUsd(s.price)}, ${weekMove}, at day ${s.cycleDay} of the cycle (${s.progressPct}% through).`,
    scoreboard,
    whatChanged: snapshotWhatChanged(5).map((c) => c.title),
    context: snapshotContext().summary,
    chartOfWeek: { title: cotw.title, why: cotw.why[0] },
    research: finding ? { id: finding.id, title: finding.title, conclusion: finding.headline } : null,
    watch: snapshotWatchItems().map((w) => `${w.title} — ${w.trigger}`),
  };
}

// A copyable plain-text script in the standard episode running order.
export function episodeBriefText(): string {
  const b = episodeBrief();
  const lines: string[] = [];
  lines.push("DOCUMENTING THE BITCOIN CYCLE — episode prep");
  lines.push("");
  lines.push("1. OPENING");
  lines.push(b.opening);
  lines.push("");
  lines.push("2. MARKET SNAPSHOT");
  b.scoreboard.forEach((l) => lines.push(`• ${l}`));
  lines.push("");
  lines.push("3. WHAT CHANGED THIS WEEK");
  if (b.whatChanged.length) b.whatChanged.forEach((l) => lines.push(`• ${l}`));
  else lines.push("• A quiet week — no material shifts across the core readings.");
  lines.push("");
  lines.push("4. CHART OF THE WEEK");
  lines.push(`${b.chartOfWeek.title} — ${b.chartOfWeek.why}`);
  lines.push("");
  lines.push("5. HISTORICAL CONTEXT");
  lines.push(b.context);
  lines.push("");
  lines.push("6. RESEARCH CORNER");
  lines.push(b.research ? `${b.research.id} — ${b.research.title}: ${b.research.conclusion}` : "No research finding published yet.");
  lines.push("");
  lines.push("7. WHAT WE'RE WATCHING");
  b.watch.forEach((l) => lines.push(`• ${l}`));
  lines.push("");
  lines.push("Historical context. Not prediction. Not financial advice.");
  return lines.join("\n");
}
