// MW2-A — dashboard ↔ metric-content-pack agreement tests.
//
// The one product guarantee this suite exists for: the Cycle Dashboard and
// the social pack can NEVER disagree about whether a metric moved, how
// much, how unusual that is, or what may honestly be claimed about it.
// Every card fact is proven equal to the canonical authority it quotes.
//
// Run: npm run test-metric-cards

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { metricCardsGallery, METRIC_CARDS_VERSION, type AnyCardPayload, type MetricCardPayload } from "../src/lib/metricCards";
import { marketBoard, cycleDashboardIntel, isUnusualRow } from "../src/lib/cycleDashboardIntel";
import {
  marketMovers,
  moversAsOf,
  metricById,
  consideredMovers,
  formatValue,
  formatMovement,
  meaningLine,
  rarityLine,
} from "../src/lib/marketMovers";
import { stateRunFrom } from "../src/lib/metricWatch";
import { watchStateFor } from "../src/lib/metricWatch/states";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) console.log(`  ok    ${name}`);
  else {
    failures++;
    console.error(`  FAIL  ${name}${detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ""}`);
  }
}
const iso = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10);
const asOf = moversAsOf();

const allCards = (g: ReturnType<typeof metricCardsGallery>): AnyCardPayload[] => [
  ...g.worthLookingAt,
  ...g.alsoMoving,
  ...g.routine,
  ...g.maturing,
];

// ── 1 · Population + ordering agreement, every period ───────────────────────
console.log("Population and ordering (all periods):");
for (const period of [1, 7, 30] as const) {
  const g = metricCardsGallery(period, asOf);
  const b = marketBoard(period, asOf);
  const cards = allCards(g);
  check(`P${period}: cards ≡ the board's considered rows, nothing extra, nothing missing`, cards.length === b.rows.length && cards.every((c, i) => c.metricId === b.rows[i].metricId));
  check(`P${period}: the composite never appears`, cards.every((c) => c.metricId !== "market_health"));
  check(`P${period}: unavailable entries quoted from the engine`, g.unavailable === b.unavailable);
  check(`P${period}: grouping uses THE exported dashboard rule`, (() => {
    const material = b.rows.slice(0, b.materialCount);
    const worthIds = material.filter(isUnusualRow).map((m) => m.metricId).join();
    const alsoIds = material.filter((m) => !isUnusualRow(m)).map((m) => m.metricId).join();
    return g.worthLookingAt.map((c) => c.metricId).join() === worthIds && g.alsoMoving.map((c) => c.metricId).join() === alsoIds;
  })());
}
{
  const g7 = metricCardsGallery(7, asOf);
  const s = cycleDashboardIntel(asOf).summary;
  check("at 7 days the groups ARE ChangeSummary's sets", g7.worthLookingAt.map((c) => c.metricId).join() === s.needsAttention.map((m) => m.metricId).join() && g7.alsoMoving.map((c) => c.metricId).join() === s.alsoMoving.map((m) => m.metricId).join());
  check("the gallery verdict is the week's verdict, verbatim", g7.verdict.activityLabel === s.activityLabel && g7.verdict.countsLine === s.countsLine);
  check("the Watch passes through by identity", g7.watch === cycleDashboardIntel(asOf).watch);
  check("gallery cached per period+anchor", metricCardsGallery(7, asOf) === g7);
  check("version pinned and machine-readable", g7.version === METRIC_CARDS_VERSION && /^metric-cards-v\d+$/.test(g7.version));
}

// ── 2 · Per-card fact agreement (the core guarantee) ────────────────────────
console.log("Per-card fact agreement with the describe layer:");
{
  const b = marketBoard(7, asOf);
  const g = metricCardsGallery(7, asOf);
  const cards = allCards(g);
  let ok = true;
  const why: string[] = [];
  for (const c of cards) {
    const m = b.rows.find((x) => x.metricId === c.metricId)!;
    if (c.kind === "etf") continue; // proven against the ETF authority in §4
    if (c.heroMovement !== formatMovement(m)) { ok = false; why.push(`${c.metricId} hero`); }
    if (c.valueLabel !== formatValue(m)) { ok = false; why.push(`${c.metricId} value`); }
    const rarityOk = m.rarityState === "available";
    if (rarityOk) {
      const band = m.band.charAt(0).toUpperCase() + m.band.slice(1);
      if (c.bandWord !== band) { ok = false; why.push(`${c.metricId} band`); }
      if (!c.reasonForAttention || c.reasonForAttention.meaning !== meaningLine(m) || c.reasonForAttention.evidence !== rarityLine(m)) { ok = false; why.push(`${c.metricId} reason`); }
      if (c.maturingNote !== null) { ok = false; why.push(`${c.metricId} maturing`); }
    } else {
      if (c.bandWord !== null || c.bandTone !== null) { ok = false; why.push(`${c.metricId} band-gate`); }
      if (c.reasonForAttention !== null) { ok = false; why.push(`${c.metricId} reason-gate`); }
      if (c.maturingNote !== rarityLine(m)) { ok = false; why.push(`${c.metricId} maturing-note`); }
    }
    if (c.spark !== m.spark) { ok = false; why.push(`${c.metricId} spark`); }
    if (c.asOf !== m.asOf || c.href !== m.href || c.what !== m.what) { ok = false; why.push(`${c.metricId} meta`); }
  }
  check("every card fact equals its canonical authority (movement, value, band, reason, spark, meta)", ok, why.slice(0, 5));
  check("gold tone only at unusual/exceptional — significance, never direction", cards.every((c) => c.kind === "etf" || c.bandTone !== "gold" || ["Unusual", "Exceptional"].includes(c.bandWord ?? "")));
  check("state words come from the Watch registry (dashboard strip's own path)", (() => {
    const probe = cards.find((c): c is MetricCardPayload => c.kind === "metric" && c.metricId === "fear_greed");
    if (!probe) return false;
    const run = stateRunFrom(watchStateFor("fear_greed")!, metricById("fear_greed")!.series(), asOf)!;
    return probe.stateWord === run.current.label;
  })());
  check("metrics with no canonical vocabulary carry no state word", cards.filter((c): c is MetricCardPayload => c.kind === "metric" && ["price", "ma200", "realized_price", "drawdown"].includes(c.metricId)).every((c) => c.stateWord === null));
}

// ── 3 · Honesty: hero-first amendment, cadence, other-period cells ──────────
console.log("Founder amendments and honesty:");
{
  const g = metricCardsGallery(7, asOf);
  const cards = allCards(g).filter((c): c is MetricCardPayload => c.kind === "metric");
  check("hero is the selected-period movement with its period stated", cards.every((c) => c.heroPeriodLabel === "in 7 days"));
  check("weekly series never gain a 1-day cell", cards.filter((c) => ["accumulation", "mining_cost"].includes(c.metricId)).every((c) => !c.otherPeriods.some((o) => o.period === 1)));
  check("daily series carry both other-period cells", (() => {
    const c = cards.find((x) => x.metricId === "rhodl")!;
    return c.otherPeriods.map((o) => o.period).sort().join() === "1,30";
  })());
  check("other-period movements equal their own boards' describe output", (() => {
    const c = cards.find((x) => x.metricId === "rhodl")!;
    const m1 = marketBoard(1, asOf).rows.find((m) => m.metricId === "rhodl")!;
    const m30 = marketBoard(30, asOf).rows.find((m) => m.metricId === "rhodl")!;
    const by = Object.fromEntries(c.otherPeriods.map((o) => [o.period, o.movement]));
    return by[1] === formatMovement(m1) && by[30] === formatMovement(m30);
  })());
  check("weekly cadence tag travels on the card (board wording)", cards.filter((c) => c.metricId === "accumulation").every((c) => c.honestyTail != null && /weekly series/.test(c.honestyTail)));
  check("a lagging reading discloses measured-to (board wording)", cards.every((c) => c.asOf >= asOf || (c.honestyTail != null && /measured to/.test(c.honestyTail))));
}

// ── 4 · The ETF card (Route B) ──────────────────────────────────────────────
console.log("ETF card — Route B agreement:");
{
  const g = metricCardsGallery(7, asOf);
  const etf = allCards(g).find((c) => c.metricId === "etf_flows");
  const canonical = cycleDashboardIntel(asOf).etf;
  check("the ETF card exists and uses the flow grammar, not the level card", etf?.kind === "etf");
  if (etf && etf.kind === "etf" && canonical.available) {
    check("hero net + window are the canonical card's, trading-day language explicit", etf.heroNetLabel === canonical.netLabel && /trading days/.test(etf.heroPeriodLabel));
    check("change/composition/concentration/context quoted verbatim", etf.prevNetLabel === canonical.prevNetLabel && etf.deltaLabel === canonical.deltaLabel && etf.bars === canonical.bars && etf.concentrationLine === canonical.concentrationLine && etf.contextLine === canonical.contextLine);
    check("no band word is ever minted for the flow card", !("bandWord" in etf));
  }
  const src = readFileSync(join(__dirname, "../src/lib/metricCards.ts"), "utf8");
  check("the movers' flow row keeps its calendar-day labelling for thumbnails", /calendar days · trading-day series/.test(src));
}

// ── 5 · Quiet day + a year of anchors ───────────────────────────────────────
console.log("Quiet-day behaviour and year sweep:");
{
  const quiet = metricCardsGallery(7, "2026-08-09");
  check("a real quiet anchor yields a quiet verdict and an empty Worth Looking At", quiet.verdict.activity === "quiet" && quiet.worthLookingAt.length === 0 && quiet.routine.length > 0);
}
{
  const endDay = Math.floor(Date.parse(`${asOf}T00:00:00Z`) / 86_400_000);
  let ok = true;
  const texts = new Set<string>();
  for (let d = endDay - 364; d <= endDay; d += 7) {
    const g = metricCardsGallery(7, iso(d));
    const s = cycleDashboardIntel(iso(d)).summary;
    if (g.worthLookingAt.length !== s.needsAttention.length || g.verdict.countsLine !== s.countsLine) ok = false;
    for (const c of allCards(g)) {
      if (c.kind === "metric") {
        texts.add(`${c.heroMovement} ${c.heroPeriodLabel} ${c.bandWord ?? ""} ${c.reasonForAttention?.meaning ?? ""} ${c.reasonForAttention?.evidence ?? ""} ${c.maturingNote ?? ""} ${c.honestyTail ?? ""}`);
      } else {
        texts.add(`${c.heroNetLabel} ${c.heroPeriodLabel} ${c.concentrationLine ?? ""} ${c.contextLine ?? ""}`);
      }
    }
  }
  check("gallery/summary agreement holds across a year of weekly anchors", ok);
  const BANNED = [/about to/i, /\bwill\b/i, /\blikely\b/i, /\bset to\b/i, /\bsuggests?\b/i, /\bexpect/i, /\bforecast/i, /\bbullish\b/i, /\bbearish\b/i, /\bbuy\b/i, /\bsell\b/i, /\btargets?\b/i, /fair value/i];
  const all = [...texts].join(" | ");
  check(`no forecast/banned vocabulary across ${texts.size} distinct card texts`, BANNED.every((re) => !re.test(all)), BANNED.filter((re) => re.test(all)).map(String));
}

// ── 6 · Discipline scans ────────────────────────────────────────────────────
console.log("Discipline scans:");
{
  const stripCm = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const src = readFileSync(join(__dirname, "../src/lib/metricCards.ts"), "utf8");
  const code = stripCm(src);
  check("clock-free", !/Date\.now\s*\(/.test(code) && !/new Date\(\s*\)/.test(code) && !/Math\.random/.test(code));
  check("no thresholds re-declared (60/80/95 absent)", !/\b60\b|\b80\b|\b95\b/.test(code));
  check("no movement arithmetic of its own (no reduce/slice window sums)", !/reduce\(\s*\(.*netFlow/.test(code) && !/slice\(-\d/.test(code));
  check("never imports the legacy social engines", !/storyEngine|contentCards|contentCalendar|metricChange/.test(src));
  check("consumes only canonical authorities", /from "\.\/marketMovers"/.test(src) && /from "\.\/cycleDashboardIntel"/.test(src) && /from "\.\/metricWatch"/.test(src));
}

// ── 7 · MW2-B render layer (source scans) ───────────────────────────────────
console.log("Render-layer discipline (MW2-B):");
{
  const stripCm = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const tpl = readFileSync(join(__dirname, "../src/lib/metricCardTemplates.tsx"), "utf8");
  const tplCode = stripCm(tpl);
  check("templates consume the payload only — no engine, no intel, no legacy social imports", !/marketMovers|metricWatch|cycleDashboardIntel|storyEngine|contentCards|metricChange/.test(tpl.replace(/from "\.\/metricCards"/, "")));
  check("templates quote payload strings verbatim (hero, band, reason, maturing)", /card\.heroMovement/.test(tpl) && /card\.bandWord/.test(tpl) && /reasonForAttention\.meaning/.test(tpl) && /reasonForAttention\.evidence/.test(tpl) && /card\.maturingNote/.test(tpl));
  check("gold only via bandTone — significance, never direction, drives emphasis", /bandTone === "gold"/.test(tpl) && !/direction/.test(tplCode));
  check("social cards badge significance only at Unusual/Exceptional (founder render rule)", /card\.bandWord && gold &&/.test(tpl));
  check("standalone-first — no pagination dots in the chrome", !/index|total|pagination/i.test(tplCode));
  check("state-word comparison variant is render-layer only (payload untouched)", /showStateWord/.test(tpl));
  check("ETF card is the flow grammar with trading-day language and no band word", /EtfSocialCard/.test(tpl) && /heroNetLabel/.test(tpl) && !/bandWord/.test(tpl.slice(tpl.indexOf("function EtfSocialCard"))));
  check("card dimensions are the studio standard", /METRIC_CARD_W = 1080/.test(tpl) && /METRIC_CARD_H = 1350/.test(tpl));
  check("SSR-stable SVG — no random ids, no gradients in marks", !/Math\.random|useId|linearGradient|url\(#/.test(tplCode));

  const route = readFileSync(join(__dirname, "../src/app/cards/metric/[metricId]/route.tsx"), "utf8");
  check("image route builds from the gallery payload, never the engines", /metricCardsGallery\(/.test(route) && !/marketMovers\(|metricWatch\(/.test(route));
  check("route period parsing clamps like the dashboard", /p === "1" \? 1 : p === "30" \? 30 : 7/.test(route));
  check("unknown/unavailable metric → honest 404 with the engine's reason", /status: 404/.test(route) && /\?\.reason/.test(route));

  const gal = readFileSync(join(__dirname, "../src/app/admin/metric-cards/page.tsx"), "utf8");
  check("gallery is admin-gated and noindex", /isAdmin\(\)/.test(gal) && /adminConfigured\(\)/.test(gal) && /robots: \{ index: false/.test(gal));
  check("gallery header is the dashboard's verdict + the Watch's own claims, verbatim", /verdict\.activityLabel/.test(gal) && /verdict\.countsLine/.test(gal) && /watch\.quietLine/.test(gal));
  check("not-observable entries close the gallery with the engine's reason", /unavailable/.test(gal) && /u\.reason/.test(gal));
  check("gallery page stays a server component — client state lives only in the picker", !/useState|"use client"/.test(gal));
  check("gallery hands the picker display facts only (metricId + label per group)", /MetricCardPicker/.test(gal) && /metricId: c\.metricId, label: c\.label/.test(gal));
  check("significance hierarchy survives the picker handoff (worth-looking-at big)", /pickerGroup\("Worth looking at", true,/.test(gal) && /pickerGroup\("Routine", false,/.test(gal));
}

// ── 8 · MW2-C selection & export (source scans) ─────────────────────────────
console.log("Selection/export discipline (MW2-C):");
{
  const stripCm = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const pk = readFileSync(join(__dirname, "../src/components/MetricCardPicker.tsx"), "utf8");
  const pkCode = stripCm(pk);
  check("picker thumbnails ARE the card images (visual editorial desk, not a table)", /\/cards\/metric\//.test(pk) && /<img/.test(pk));
  check("click toggles selection; selection order is click order (append/remove only)", /s\.includes\(metricId\) \? s\.filter\(\(x\) => x !== metricId\) : \[\.\.\.s, metricId\]/.test(pk));
  check("picker, not a link directory — tap selects (button), full card is a secondary ↗ affordance", /onClick=\{\(\) => onToggle\(c\.metricId\)\}/.test(pk) && /Open \$\{c\.label\} card full size/.test(pk) && /target="_blank"/.test(pk));
  check("selected state is visible: numbered badge + aria-pressed + count line", /aria-pressed/.test(pk) && /pos \+ 1/.test(pk) && /ordered ZIP/.test(pk));
  check("routine thumbnails stay receded until selected", /opacity-60/.test(pk));
  check("export filenames carry position prefixes so upload order matches", /padStart\(2, "0"\)/.test(pk));
  check("one card → PNG, several → ordered ZIP via the shared makeZip", /from "@\/lib\/zip"/.test(pk) && /halvinglens-metric-pack-/.test(pk) && /out\.length === 1/.test(pk));
  check("Save to Photos only where image files are shareable (canShare probe)", /canShare\(\{ files:/.test(pk) && /navigator\.share\(\{ files/.test(pk));
  check("Save to Photos reuses the packs' proven mechanism — files pre-fetched, share() synchronous in the tap", /setFilesReady\(false\)/.test(pk) && /const files = filesRef\.current/.test(pk) && !/fetch/.test(stripCm(pk).split("async function saveToPhotos")[1]?.split("async function exportSelected")[0] ?? "fetch"));
  check("Save to Photos preserves selection order (files staged in selected order)", /selected\.map\(async \(id, i\)/.test(pk) && /nameFor\(id, i, selected\.length\)/.test(pk));
  check("honest platform handling: button gated on filesReady with the packs' iPhone guidance", /filesReady \? |!filesReady/.test(pk) && /photo library/.test(pk) && /Save to Photos/.test(pk));
  check("picker consumes the image routes only — no engine, intel or payload imports", !/marketMovers|metricWatch|cycleDashboardIntel|metricCards|storyEngine|contentCards/.test(pk));
  check("no editing, no overrides: no text inputs, colour or template controls", !/<input|<textarea|contentEditable|color|template|significance/i.test(pkCode));
  check("ETF licence notice appears when the ETF card is selected (founder governance item)", /etf_flows/.test(pk) && /SoSoValue licence confirmation/.test(pk));
}

console.log("");
if (failures) {
  console.error(`${failures} failure(s).`);
  process.exit(1);
}
console.log("All metric-cards tests passed.");
