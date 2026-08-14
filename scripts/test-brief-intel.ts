// DBV2-A — Daily Brief ↔ Cycle Dashboard agreement suite.
//
// The founder guarantee under test: the Daily Brief is ANOTHER PRESENTATION
// of HalvingLens's canonical intelligence, not another intelligence engine.
// Every load-bearing fact in the brief payload must be bit-identical to what
// the dashboard's own authorities produce for the same anchor, and the
// module must be structurally incapable of minting its own intelligence
// (source-scan discipline, same as the MW2 suite).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { briefIntel, BRIEF_INTEL_VERSION, DASHBOARD_CTA, FEEDBACK_LINE } from "../src/lib/briefIntel";
import { cycleDashboardIntel, isUnusualRow, marketBoard } from "../src/lib/cycleDashboardIntel";
import { consideredMovers, marketMovers, metricById, formatValue, formatMovement, meaningLine, rarityLine } from "../src/lib/marketMovers";
import { stateWordFor } from "../src/lib/metricCards";
import { lensObservation } from "../src/lib/cycleLens";
import { cycleDayAt } from "../src/lib/cycleDay";

let failures = 0;
function check(name: string, ok: boolean, extra?: unknown) {
  if (ok) console.log(`  ok    ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, extra ?? "");
  }
}

const ANCHORS = ["2026-08-09", "2026-08-10", "2026-08-13", "2026-06-30", "2026-06-09", "2026-07-27", "2026-01-01"];

// ── 1 · Verdict & population agreement ──────────────────────────────────────
console.log("Verdict & considered-population agreement:");
for (const a of ANCHORS) {
  const b = briefIntel(a);
  const g = cycleDashboardIntel(a);
  check(
    `[${a}] verdict is the dashboard's own (activity, label, counts, analysed, material)`,
    b.verdict.activity === g.summary.activity &&
      b.verdict.activityLabel === g.summary.activityLabel &&
      b.verdict.countsLine === g.summary.countsLine &&
      b.verdict.analysed === g.summary.analysed &&
      b.verdict.material === g.summary.material,
  );
  check(`[${a}] payload asOf equals the dashboard's committed anchor`, b.asOf === g.asOf);
}
{
  const considered = consideredMovers(marketMovers(7, "2026-08-13"));
  const b = briefIntel("2026-08-13");
  check(
    "considered population is the movers' own (15 analysed)",
    b.verdict.analysed === considered.movements.length + considered.steady.length && b.verdict.analysed === 15,
  );
}

// ── 2 · Story agreement ─────────────────────────────────────────────────────
console.log("Story agreement (identity, order, facts):");
{
  // Active standout day: story must be the top board row with describe-layer facts.
  const a = "2026-08-13";
  const b = briefIntel(a);
  const top = cycleDashboardIntel(a).board.rows[0];
  check("active day story is the board's own top row", b.story.kind === "mover" && b.story.metricId === top.metricId);
  if (b.story.kind === "mover") {
    check("movement/value/meaning are the describe layer's, verbatim",
      b.story.movement === formatMovement(top) && b.story.valueLabel === formatValue(top) && b.story.meaning === meaningLine(top));
    check("rarity evidence only where the engine permits it, verbatim",
      top.rarityState === "available" ? b.story.evidence === rarityLine(top) : b.story.evidence === null);
    check("band word only at Unusual/Exceptional (founder render rule)",
      isUnusualRow(top) ? b.story.bandWord !== null : b.story.bandWord === null);
    check("state word is the Watch registry's (shared quote path with MW2)",
      b.story.stateWord === stateWordFor(top, cycleDashboardIntel(a).board.asOf));
    check("per-metric asOf rides along from the mover row", b.story.asOf === top.asOf);
    const row30 = marketBoard(30, a).rows.find((m) => m.metricId === top.metricId);
    check("30-day line is the 30D board's own movement",
      row30 && row30.movement != null ? b.story.thirtyDay === `${formatMovement(row30)} over 30 days` : b.story.thirtyDay === null);
    const meta = metricById(top.metricId);
    check("story href is the metric's own page", b.story.href === (meta?.href ?? "/cycle-dashboard"));
  }
}
{
  // Mostly-quiet day: the single material mover self-selects.
  const b = briefIntel("2026-08-10");
  const top = cycleDashboardIntel("2026-08-10").board.rows[0];
  check("mostly-quiet story is the single material mover (engine ranking)",
    b.story.kind === "mover" && b.story.metricId === top.metricId && b.verdict.material === 1);
  check("merely-material mover carries NO band word (no manufactured drama)",
    b.story.kind === "mover" && b.story.bandWord === null);
}
{
  // State-change day: the Watch's own headline, verbatim.
  const a = "2026-06-09";
  const b = briefIntel(a);
  const mi = cycleDashboardIntel(a).watch.mostInteresting;
  check("state-change story quotes watch.mostInteresting verbatim",
    b.story.kind === "state_change" && mi != null && b.story.headline === mi.headline && b.story.href === mi.href);
}

// ── 3 · Quiet findings ──────────────────────────────────────────────────────
console.log("Quiet findings (gates, rotation, honesty):");
{
  const b = briefIntel("2026-08-09");
  const strip = cycleDashboardIntel("2026-08-09").strip;
  check("quiet day selects a quiet shape", ["quiet_duration", "quiet_lens", "quiet_floor", "etf"].includes(b.story.kind));
  if (b.story.kind === "quiet_duration") {
    const src = strip.find((s) => s.label === (b.story as { label: string }).label);
    check("duration finding quotes the strip's own state, sinceDate and asOf",
      src != null && b.story.stateLabel === src.stateLabel && b.story.sinceDate === src.sinceDate && b.story.asOf === src.asOf);
    check("duration is day arithmetic on those two canonical dates",
      b.story.days === Math.round((Date.parse(b.story.asOf) - Date.parse(b.story.sinceDate)) / 86_400_000));
    check("duration never claimed on a series-start run", src != null && !src.sinceIsSeriesStart);
  }
}
{
  const b = briefIntel("2026-07-27");
  const obs = lensObservation(cycleDayAt("2026-07-27"));
  check("lens finding quotes the Lens observation sentence verbatim",
    b.story.kind !== "quiet_lens" || (obs != null && b.story.sentence === obs.sentence && b.story.lifecycle === obs.lifecycle));
  check("standing lens observations never surface as a daily finding",
    b.selection.considered.every((c) => c.candidate !== "cycle lens" || !c.outcome.includes("standing") || !c.qualified));
}
{
  // The floor is a real, reachable edition (scenario 7).
  const b = briefIntel("2026-01-01");
  check("the quietest edition is reachable: verdict + quiet line + states + CTA only",
    b.story.kind === "quiet_floor" && b.alsoToday.length === 0);
}
{
  // Rotation only ever picks QUALIFIED candidates.
  for (const a of ["2026-08-09", "2026-07-27", "2026-01-01", "2026-03-09"]) {
    const b = briefIntel(a);
    const names: Record<string, string> = { quiet_duration: "state duration", quiet_lens: "cycle lens", etf: "etf composition", quiet_floor: "watch quiet line" };
    const picked = names[b.story.kind];
    const row = b.selection.considered.find((c) => c.candidate === picked);
    check(`[${a}] selected quiet form was a qualified candidate`, row != null && row.qualified);
  }
}

// ── 4 · ETF discipline ──────────────────────────────────────────────────────
console.log("ETF discipline (as-of, vocabulary):");
{
  const live = briefIntel();
  const etf = cycleDashboardIntel().etf;
  const texts = JSON.stringify(live);
  check("ETF language is trading-day language, never '/wk' or 'past week'", !/\/wk|past week/i.test(texts));
  if (etf.available && etf.netLabel) {
    const anyEtf = [live.story, ...live.alsoToday.map((x) => ({ kind: x.source, text: x.text }))];
    const usesEtf = live.story.kind === "etf" || live.alsoToday.some((x) => x.source === "etf_swing");
    check("live ETF sentences quote the card's own labels verbatim",
      !usesEtf || texts.includes(etf.netLabel));
    void anyEtf;
  }
  // At a historical anchor whose flows read post-dates it, no ETF sentence appears.
  const b0630 = briefIntel("2026-06-30");
  const s0630 = JSON.stringify([b0630.story, b0630.alsoToday]);
  check("anchored editions never quote a flows read that post-dates them",
    b0630.story.kind !== "etf" && !b0630.alsoToday.some((x) => x.source === "etf_swing") && !/trading days:/.test(s0630));
  check("…the flow ROW (anchored, honest) may still be the story", b0630.story.kind === "mover" && b0630.story.metricId === "etf_flows");
}

// ── 5 · States, CTA, collision rule, FRP, feedback ──────────────────────────
console.log("States, CTA, collision rule, FRP conditional, feedback:");
for (const a of ANCHORS) {
  const b = briefIntel(a);
  const strip = cycleDashboardIntel(a).strip;
  check(`[${a}] State of the Cycle rows are the dashboard strip, verbatim`,
    b.states.length === strip.length &&
      b.states.every((r, i) => r.stateLabel === strip[i].stateLabel && r.detail === strip[i].detail && r.sinceDate === strip[i].sinceDate && r.asOf === strip[i].asOf && r.href === strip[i].href));
  check(`[${a}] /cycle-dashboard CTA present in every edition`, b.cta === DASHBOARD_CTA && b.cta.href === "/cycle-dashboard" && b.verdict.href === "/cycle-dashboard");
  check(`[${a}] ONE secondary insight maximum (founder collision rule)`, b.alsoToday.length <= 1);
  check(`[${a}] feedback open door present and subordinate (payload constant, reply kind)`, b.feedback === FEEDBACK_LINE && b.feedback.kind === "reply");
  check(`[${a}] anchored editions never evaluate the live-only FRP pack`,
    !b.alsoToday.some((x) => x.source === "frp_configuration"));
  check(`[${a}] version pinned`, b.version === BRIEF_INTEL_VERSION);
}
{
  // Displaced secondaries are recorded, never rendered — the collision is
  // visible in the diagnostics whenever more than one candidate qualified.
  const live = briefIntel();
  const qualifiedSecondaries = live.selection.considered.filter(
    (c) => c.qualified && (c.outcome.includes("secondary slot") || c.outcome.includes("displaced")),
  );
  check("collision rule: qualifying secondaries beyond the first are displaced with a recorded reason",
    live.alsoToday.length <= 1 &&
      (qualifiedSecondaries.length <= 1 || qualifiedSecondaries.some((c) => c.outcome.includes("displaced"))));
  check("FRP secondary (when it wins the slot) quotes the framework's configuration verbatim",
    !live.alsoToday.some((x) => x.source === "frp_configuration") ||
      live.alsoToday[0].text.startsWith("New configuration this week:"));
}

// ── 6 · Subjects ────────────────────────────────────────────────────────────
console.log("Subject discipline:");
{
  for (const a of ANCHORS) {
    const b = briefIntel(a);
    check(`[${a}] subject chosen from the day's own candidates`, b.subjectCandidates.includes(b.subject));
    const quietWords = /quiet week|nothing needs your attention|held within their own ordinary/i;
    if (b.verdict.activity !== "quiet") {
      check(`[${a}] non-quiet edition never wears a quiet subject`, !quietWords.test(b.subject));
    }
  }
  {
    // Founder amendment: quiet-floor subjects are evidence-led — never the
    // absolutist "nothing needs your attention" framing.
    const floor = briefIntel("2026-01-01");
    check("quiet-floor subjects are evidence-led (no 'nothing needs your attention')",
      floor.subjectCandidates.every((c) => !/nothing needs your attention/i.test(c)) &&
        floor.subjectCandidates.some((c) => /A quiet week across all \d+ Bitcoin readings/.test(c)));
  }
  const BANNED = [/\bwill\b/i, /\bforecast/i, /\bpredict/i, /\btarget\b/i, /\bbuy\b/i, /\bsell\b/i, /guarantee/i, /\bshould (rise|fall|hit)\b/i];
  const all = ANCHORS.map((a) => JSON.stringify(briefIntel(a))).join(" ");
  check("no forecast/banned vocabulary anywhere in any payload", BANNED.every((re) => !re.test(all)), BANNED.filter((re) => re.test(all)).map(String));
}

// ── 7 · Year sweep — verdict agreement + stability ──────────────────────────
console.log("Year sweep:");
{
  let ok = true;
  for (let i = 0; i < 52; i++) {
    const d = new Date(Date.UTC(2026, 7, 10) - i * 7 * 86_400_000).toISOString().slice(0, 10);
    try {
      const b = briefIntel(d);
      const g = cycleDashboardIntel(d);
      if (b.verdict.activityLabel !== g.summary.activityLabel || b.verdict.countsLine !== g.summary.countsLine) ok = false;
      if (!["mover", "state_change", "etf", "quiet_duration", "quiet_lens", "quiet_floor"].includes(b.story.kind)) ok = false;
    } catch {
      ok = false;
    }
  }
  check("brief↔dashboard verdict agreement holds across a year of weekly anchors", ok);
}

// ── 8 · Source discipline (structural incapability) ─────────────────────────
console.log("Source discipline (scans):");
{
  const stripCm = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const src = readFileSync(join(__dirname, "../src/lib/briefIntel.ts"), "utf8");
  const code = stripCm(src);
  check("clock-free (no Date.now / new Date() / Math.random)", !/Date\.now\s*\(/.test(code) && !/new Date\(\s*\)/.test(code) && !/Math\.random/.test(code));
  check("no significance thresholds re-declared (60/80/95 absent)", !/\b60\b|\b80\b|\b95\b/.test(code));
  check("no movement arithmetic of its own", !/reduce\(\s*\(.*netFlow/.test(code) && !/slice\(-\d/.test(code));
  check("consumes only canonical authorities",
    /from "\.\/cycleDashboardIntel"/.test(src) && /from "\.\/marketMovers"/.test(src) && /from "\.\/cycleLens"/.test(src) && /from "\.\/metricCards"/.test(src));
  check("the retired private stack can never return (no dailyChange/emailBrief/similarity/cycleSummary/accumulation/sentiment/etf-legacy imports)",
    !/from "\.\/dailyChange"|from "\.\/emailBrief"|from "\.\/similarity"|from "\.\/cycleSummary"|from "\.\/accumulation"|from "\.\/sentiment"|from "\.\/etf"/.test(src));
  check("no invented scores (contextScore/confidence vocabulary absent)", !/contextScore|confidence/i.test(code));
  check("editorialVariety used for rotation/freshness only, seeded from the payload's asOf",
    /seedFromString\(intel\.asOf\)/.test(src) && !/dateSeed\(\)/.test(code));
  check("quiet rotation draws from qualified candidates only", /quiet\[idx\]\.story/.test(src) && /const quiet: QuietCandidate\[\] = \[\]/.test(src));
  check("duration honesty: series-start runs are filtered before any claim", /!s\.sinceIsSeriesStart/.test(src));
  check("lens publication policy: standing observations excluded", /obs\.lifecycle !== "standing"/.test(src));
  check("ETF as-of discipline enforced at one gate", /etf\.asOf <= intel\.asOf/.test(src));
  check("FRP conditional quotes the framework's own spell fact", /pack\.spellWeeks === 1/.test(src) && !/spellWeeks [<>]/.test(code));
}

// ── 9 · DBV2-B render layer (source + output scans) ─────────────────────────
console.log("Render-layer discipline (DBV2-B):");
{
  const stripCm = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const src = readFileSync(join(__dirname, "../src/lib/briefEmailV2.ts"), "utf8");
  const code = stripCm(src);
  check("renderer consumes the payload only — no engines, no legacy email content",
    /from "\.\/briefIntel"/.test(src) &&
      !/from "\.\/emailBrief"|from "\.\/dailyChange"|from "\.\/marketMovers"|from "\.\/cycleDashboardIntel"|from "\.\/metricWatch"|from "\.\/cycleLens"|from "\.\/cycleSummary"|from "\.\/accumulation"|from "\.\/sentiment"|from "\.\/similarity"|from "\.\/editorial"/.test(src));
  check("founder hierarchy fixed: verdict → story → secondary → states → CTA → footer",
    (() => {
      const order = ["rows.push(section(verdict", "rows.push(section(story", "if (secondary) rows.push(section(secondary", "rows.push(section(states", "rows.push(section(cta"];
      let last = -1;
      for (const o of order) {
        const i = src.indexOf(o);
        if (i < 0 || i < last) return false;
        last = i;
      }
      return true;
    })());
  check("no extra modules beyond the approved hierarchy (no charts, scores, research, memory blocks)",
    !/contextScore|confidence|Did you know|research library|Signature Read|bitcoinMemory|analyst/i.test(code));
  check("renderer trusts the one-secondary contract (renders alsoToday[0] only)",
    /b\.alsoToday\[0\]/.test(src) && !/alsoToday\.map|alsoToday\[1\]/.test(code));
  check("dominant CTA + subordinate feedback footer, in that order",
    src.indexOf("v2_dashboard_cta") < src.indexOf("b.feedback.line") && /padding:18px 42px/.test(src));
  check("subject is the payload's own", /briefIntel\(anchor\)\.subject/.test(src));
  check("plain-text part mirrors the same hierarchy", /briefEmailV2Text/.test(src) && /THE VERDICT/.test(src) && /STATE OF THE CYCLE/.test(src));
  check("unsubscribe handled; escaping applied to every quoted string", /forHtmlAttr\(unsubUrl\)/.test(src) && /function esc\(/.test(src));

  // Output scans on real editions — hierarchy and honesty in the artifact.
  const { briefEmailV2Html, briefEmailV2Text } = require("../src/lib/briefEmailV2") as typeof import("../src/lib/briefEmailV2");
  for (const a of ["2026-08-13", "2026-01-01"]) {
    const html = briefEmailV2Html("https://example.com/unsub", undefined, a);
    check(`[${a}] rendered email carries the dashboard CTA exactly once`, (html.match(/Open the Cycle Dashboard/g) ?? []).length === 1);
    check(`[${a}] rendered email carries the feedback line after the CTA`, html.indexOf("Reply and tell us") > html.indexOf("Open the Cycle Dashboard"));
    check(`[${a}] rendered email quotes the verdict verbatim`, html.includes(briefIntel(a).verdict.countsLine.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/—/g, "—")));
    const text = briefEmailV2Text(a);
    check(`[${a}] plain-text part present with verdict + CTA`, text.includes(briefIntel(a).verdict.activityLabel) && text.includes("/cycle-dashboard"));
  }
}

console.log("");
if (failures) {
  console.error(`${failures} failure(s).`);
  process.exit(1);
}
console.log("All brief-intel tests passed.");
