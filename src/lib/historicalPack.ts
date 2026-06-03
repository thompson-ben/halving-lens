// Historical Context Pack — cross-channel copy.
//
// Mirrors the daily content pack (Instagram / X thread / LinkedIn / email) but
// for the Historical Context Pack: educational, historical, data-driven and
// professional. The strongest live narrative is chosen the same way the
// carousel is (selectHistoricalNarrative), so the words match the slides.
//
// Strictly historical context — no predictions, no price targets, no signals.

import { SITE_HOST } from "./site";
import { fmtUsd } from "./format";
import { cycleSummary } from "./cycleSummary";
import { drawdownAnalysis } from "./drawdowns";
import { cycleTiming } from "./cycleTiming";
import { whatHappenedNext } from "./cycleIntel";
import { sentimentRead, SENTIMENT_AVAILABLE } from "./sentiment";
import { similarMoments } from "./similarity";
import { selectHistoricalNarrative, historicalTakeawayText } from "./contentCards";
import type { ContentPack } from "./brief";

const signed = (n: number | null): string => (n == null ? "—" : `${n >= 0 ? "+" : ""}${n}%`);

// The narrative reduced to ordered, reusable context lines + a takeaway, so
// every channel tells the same story in its own format.
interface NarrativeCopy {
  title: string;
  points: string[]; // ordered context paragraphs
  takeaway: string;
}

function narrativeCopy(): NarrativeCopy {
  const sel = selectHistoricalNarrative();
  const dd = drawdownAnalysis();
  const t = cycleTiming();
  const w = whatHappenedNext();
  const sr = SENTIMENT_AVAILABLE ? sentimentRead() : null;

  const curMag = Math.abs(dd.current);
  const drawdownLine =
    curMag < 4
      ? "Bitcoin is trading at or near its cycle high. In past cycles, pullbacks of 20–40% were common on the way up."
      : `Bitcoin is about ${Math.round(curMag)}% below its cycle high. At the same point after the halving, the 2012, 2016 and 2020 cycles sat an average of ${Math.round(Math.abs(dd.avgAtStage))}% below their highs.`;

  const positionLine = `Today is day ${t.todayDay} after the 2024 halving. Across the three completed cycles, the bull-market top landed ${t.peakWindow.minDay}–${t.peakWindow.maxDay} days after the halving and the bear-market low ${t.bottomWindow.minDay}–${t.bottomWindow.maxDay} days after.`;

  const whatNextLine =
    w.avg90 != null
      ? `At this same cycle day, the three prior cycles went on to an average of ${signed(w.avg90)} over the next 90 days — with a wide range between them. This is historical context only.`
      : "There isn't enough comparable forward history at this cycle day to summarise — the prior cycles don't all extend this far past the same point.";

  const fgLine = sr
    ? `Market sentiment currently reads ${sr.band.label.toLowerCase()} (Fear & Greed ${sr.value}/100). Sentiment extremes have historically clustered near cycle turning points — a contrarian read, not a timing tool.`
    : "";

  const top = similarMoments(1)[0];
  const similarLine = top
    ? `Today's market conditions most closely resemble ${top.dateLabel} (${top.year} cycle) — a ${top.similarity}% match on cycle position, drawdown and price heat. After that moment, the next 90 days returned ${signed(top.next.d90)} — historical context only.`
    : "";

  let points: string[];
  if (sel.narrative === "similar") {
    points = [similarLine, drawdownLine, positionLine, whatNextLine].filter(Boolean);
  } else if (sel.narrative === "drawdown") {
    points = [drawdownLine, positionLine, whatNextLine, fgLine].filter(Boolean);
  } else if (sel.narrative === "fear_greed") {
    points = [fgLine, drawdownLine, whatNextLine].filter(Boolean);
  } else {
    points = [positionLine, drawdownLine, whatNextLine].filter(Boolean);
  }

  return { title: sel.title, points, takeaway: historicalTakeawayText(sel.narrative) };
}

const HASHTAGS = "#Bitcoin #BTC #crypto #bitcoinhalving #bitcoincycle #halvinglens #marketcycles #onchain";

export function historicalInstagram(): string {
  const n = narrativeCopy();
  const s = cycleSummary();
  return [
    `Bitcoin — ${n.title}`,
    "",
    `₿ ${fmtUsd(s.price)} · Day ${s.cycleDay} (${s.progressPct}% through the cycle)`,
    "",
    ...n.points.flatMap((p) => [p, ""]),
    n.takeaway,
    "",
    "📊 The clearest view of the Bitcoin cycle — link in bio.",
    "",
    "Historical context, not financial advice.",
    "",
    HASHTAGS,
  ].join("\n");
}

export function historicalThread(): string[] {
  const n = narrativeCopy();
  const s = cycleSummary();
  const t: string[] = [];
  t.push(`${n.title} 🧵\n\nBitcoin cycle context — day ${s.cycleDay}, ${s.progressPct}% through the halving cycle. History, not a forecast.`);
  n.points.forEach((p, i) => t.push(`${i + 1}/ ${p}`));
  t.push(`Takeaway: ${n.takeaway}`);
  t.push(`Historical context, not a forecast — educational analysis, not financial advice.\n\nMore: ${SITE_HOST}`);
  return t;
}

export function historicalLinkedin(): string {
  const n = narrativeCopy();
  const s = cycleSummary();
  return [
    `Bitcoin Cycle — ${n.title}`,
    "",
    `Bitcoin is trading at ${fmtUsd(s.price)}, day ${s.cycleDay} of the halving cycle (${s.progressPct}% through).`,
    "",
    ...n.points.flatMap((p) => [p, ""]),
    n.takeaway,
    "",
    "Historical cycle behaviour is not a forecast. This is educational analysis, not financial advice.",
    "",
    `More: ${SITE_HOST}`,
  ].join("\n");
}

export function historicalEmail(): { subject: string; body: string } {
  const n = narrativeCopy();
  const s = cycleSummary();
  const subject = `Bitcoin Cycle in context — ${n.title}`;
  const body = [
    `Bitcoin Cycle — Historical Context`,
    n.title,
    "",
    "—",
    "",
    `The numbers: BTC ${fmtUsd(s.price)} · day ${s.cycleDay} of the cycle (${s.progressPct}% through).`,
    "",
    ...n.points.flatMap((p) => [p, ""]),
    `Key takeaway`,
    n.takeaway,
    "",
    "—",
    "",
    `See the full cycle view, with charts: https://${SITE_HOST}`,
    "",
    "Historical cycle behaviour is not a forecast. This is educational analysis, not financial advice.",
  ].join("\n");
  return { subject, body };
}

// The full cross-channel pack for the Historical Context Pack — same shape as
// the daily contentPack() so the studio and any future automation are uniform.
export function historicalContentPack(): ContentPack {
  const email = historicalEmail();
  return {
    xPost: historicalThread()[1] ?? historicalInstagram(),
    xThread: historicalThread(),
    instagram: historicalInstagram(),
    linkedin: historicalLinkedin(),
    emailSubject: email.subject,
    emailBody: email.body,
  };
}
