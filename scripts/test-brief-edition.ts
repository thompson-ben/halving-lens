// Daily Brief v2 (PR1) — the editorial-significance engine, edition payload
// and renderer contracts, pinned.
//
// Covers the authoritative product definition (founder/PM, 23 Aug 2026):
//   · four significance ranks; material movement ≠ editorial significance
//   · six-entry v1 divergence registry, D6 explicitly deferred
//   · formation / leg-change / persistence semantics (deterministic fixtures)
//   · cohort-safe rarity + the deterministic priority fallback (families,
//     composite quarantine label, reserved positions)
//   · three day types with their treatments (quiet / active / major)
//   · hero + 0–3 supporting (≤2 on major), no padding
//   · monitored population remains exactly 15
//   · first-party attribution labels (primary-cta / hero-card /
//     supporting-{signal} / state-table), no UTMs in email
//   · single dominant CTA; no competing secondary links
//   · honest BTC price + true snapshot-to-snapshot 24h movement
//   · compliance: no forecast/urgency/banned vocabulary, windows named
//   · Brief ↔ Dashboard agreement (payload quotes canonical authorities)

import {
  BRIEF_SIGNIFICANCE_VERSION,
  DIVERGENCE_REGISTRY,
  DEFERRED_DIVERGENCES,
  METRIC_COHORT,
  PRIORITY_FALLBACK,
  EXTREME_RARITY_PERCENTILE,
  D4_INVERSE_NUPL_STATES,
  fallbackOrder,
  divergenceStatus,
  orderDevelopments,
  classifyDayType,
  selectDevelopments,
  discoverDevelopments,
  activeDivergences,
  type Development,
  type LegFacts,
} from "../src/lib/briefSignificance";
import { EXCEPTIONAL_SIGNIFICANCE, MOVER_METRICS } from "../src/lib/marketMovers";
import { marketBoard } from "../src/lib/cycleDashboardIntel";
import { briefEdition, synthesizeVerdict, subjectCandidatesFor, pickSubject, ctaFor, priceLineAt } from "../src/lib/briefEdition";
import { briefEditionEmailHtmlFor, briefEditionTextFor, briefEditionEmailHtml, briefEditionText } from "../src/lib/briefEditionEmail";
import { emailTracking } from "../src/lib/emailTracking";
import { readFileSync } from "node:fs";

let failures = 0;
const check = (name: string, ok: boolean, detail?: string) => {
  if (ok) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

// ── Fixture builders ───────────────────────────────────────────────────────

const dev = (over: Partial<Development>): Development => ({
  rank: 2,
  kind: "historical_extreme",
  metricId: "price",
  metricIds: ["price"],
  label: "Market Price",
  headline: "Market Price just made a top-5% 7-day move for its own record",
  evidence: ["+9.9% — Larger than 96% of 7-day moves · 5,000 observations since 2010."],
  windowLabel: "7 days",
  cohort: "price-structure",
  rarityPercentile: 96,
  href: "/cycle-dashboard#dashboard-market-board",
  asOf: "2026-08-27",
  ...over,
});

const legFacts = (over: Partial<LegFacts>): LegFacts => ({
  sentimentKey: "neutral",
  accumulationKey: "neutral",
  nuplIdxFromOptimism: null,
  nuplStateLabel: null,
  priceMaterialUp7: false,
  priceMaterialDown7: false,
  soprValue: null,
  soprAbove1SustainedDays: null,
  soprMaterialUp7: false,
  etfStreak: { direction: "flat", length: 0 },
  activeToday: {},
  ...over,
});

// ═══ 1 · Registry & population pins ════════════════════════════════════════
console.log("1 · Registry, cohorts, fallback and population pins");
{
  check(
    "active v1 divergence registry is exactly D1,D2,D3,D4,D5,D7",
    JSON.stringify(DIVERGENCE_REGISTRY.map((d) => d.id)) === JSON.stringify(["D1", "D2", "D3", "D4", "D5", "D7"]),
  );
  check("D6 is explicitly deferred, never silently reused", DEFERRED_DIVERGENCES.includes("D6") && !DIVERGENCE_REGISTRY.some((d) => (d.id as string) === "D6"));
  check("no divergence leg references an unmonitored signal (lthSupply/addresses)", DIVERGENCE_REGISTRY.every((d) => d.legs.every((l) => MOVER_METRICS.some((m) => m.id === l))));
  check("ETF pairs (D3, D7) carry the short-record wording restriction", DIVERGENCE_REGISTRY.filter((d) => d.id === "D3" || d.id === "D7").every((d) => d.shortRecord));
  check("non-ETF pairs carry no short-record restriction", DIVERGENCE_REGISTRY.filter((d) => d.id !== "D3" && d.id !== "D7").every((d) => !d.shortRecord));
  check("ETF joint history discloses Jun 2025", DIVERGENCE_REGISTRY.filter((d) => d.shortRecord).every((d) => d.jointHistoryFrom === "2025-06"));

  const considered = marketBoard(7).rows.map((m) => m.metricId);
  check("production monitored-mover population remains exactly 15", considered.length === 15, String(considered.length));
  check("market_health stays quarantined out of the population", !considered.includes("market_health"));
  check("every considered mover has exactly one approved cohort", considered.every((id) => METRIC_COHORT[id] != null));
  check(
    "cohort names are exactly the five approved cohorts",
    JSON.stringify([...new Set(Object.values(METRIC_COHORT))].sort()) === JSON.stringify(["etf-flows", "mining-cost", "onchain", "price-structure", "sentiment"]),
  );

  check("fallback has the approved 14 positions", PRIORITY_FALLBACK.length === 14 && PRIORITY_FALLBACK.every((f, i) => f.position === i + 1));
  check("position 1 is the quarantined composite (label carries the never-a-candidate note)", PRIORITY_FALLBACK[0].metricIds.length === 0 && /never a board candidate/i.test(PRIORITY_FALLBACK[0].concept));
  check("position 7 is the price-structure family", JSON.stringify(PRIORITY_FALLBACK[6].metricIds) === JSON.stringify(["price", "ma200", "mayer", "drawdown"]));
  check("position 14 is mining economics with mining_cost before puell", JSON.stringify(PRIORITY_FALLBACK[13].metricIds) === JSON.stringify(["mining_cost", "puell"]));
  check("positions 12/13 are reserved and unreachable", PRIORITY_FALLBACK[11].metricIds.length === 0 && PRIORITY_FALLBACK[12].metricIds.length === 0 && /reserved/i.test(PRIORITY_FALLBACK[11].concept));
  check("every considered mover resolves to a fallback family", considered.every((id) => fallbackOrder(id)[0] <= 14));
  check("tier-2 threshold REFERENCES the engine's exceptional constant (no second authority)", EXTREME_RARITY_PERCENTILE === EXCEPTIONAL_SIGNIFICANCE && EXCEPTIONAL_SIGNIFICANCE === 95);
}

// ═══ 2 · Divergence formation / persistence semantics (fixtures) ═══════════
console.log("2 · Divergence formation / leg-change / persistence");
{
  const d1 = DIVERGENCE_REGISTRY.find((d) => d.id === "D1")!;
  const greedAttr = legFacts({ sentimentKey: "greed", accumulationKey: "attractive", activeToday: { fear_greed: true } });

  const formed = divergenceStatus(d1, greedAttr, legFacts({ sentimentKey: "neutral", accumulationKey: "attractive" }));
  check("D1 forms when sentiment newly reads Greed over an open accumulation window", formed != null && formed.formedToday && formed.reportable && formed.orientation === "primary");

  const persisting = divergenceStatus(d1, greedAttr, greedAttr);
  check("a merely persisting divergence is NOT reportable (verdict-only)", persisting != null && !persisting.reportable && !persisting.formedToday);

  const legChanged = divergenceStatus(d1, legFacts({ sentimentKey: "extreme-greed", accumulationKey: "attractive", activeToday: { fear_greed: true } }), greedAttr);
  check("a qualifying leg changing state re-qualifies the divergence", legChanged != null && legChanged.legChangedToday && legChanged.reportable);

  const noActiveLeg = divergenceStatus(d1, legFacts({ sentimentKey: "greed", accumulationKey: "attractive", activeToday: {} }), legFacts({}));
  check("formation without an active leg today is NOT reportable (rule B)", noActiveLeg != null && noActiveLeg.formedToday && !noActiveLeg.reportable);

  check("D1 inverse: fear without value conditions", divergenceStatus(d1, legFacts({ sentimentKey: "fear", accumulationKey: "elevated", activeToday: { fear_greed: true } }), null)?.orientation === "inverse");
  check("D1 deep_value counts as the open accumulation window", divergenceStatus(d1, legFacts({ sentimentKey: "greed", accumulationKey: "deep_value", activeToday: { fear_greed: true } }), null) != null);

  const d3 = DIVERGENCE_REGISTRY.find((d) => d.id === "D3")!;
  const d3on = divergenceStatus(d3, legFacts({ etfStreak: { direction: "inflow", length: 4 }, priceMaterialUp7: false, activeToday: { etf_flows: true } }), null);
  check("D3 primary: inflow streak absorbed without price response", d3on != null && d3on.orientation === "primary" && d3on.reportable);
  check("D3 does not fire when price is materially rising", divergenceStatus(d3, legFacts({ etfStreak: { direction: "inflow", length: 4 }, priceMaterialUp7: true }), null) == null);
  check("D3 streak below the card's own 2-day gate never qualifies", divergenceStatus(d3, legFacts({ etfStreak: { direction: "inflow", length: 1 } }), null) == null);

  const d4 = DIVERGENCE_REGISTRY.find((d) => d.id === "D4")!;
  check("D4 primary: NUPL at/above Optimism while accumulation open", divergenceStatus(d4, legFacts({ nuplIdxFromOptimism: 0, accumulationKey: "attractive", activeToday: { nupl: true } }), null)?.orientation === "primary");
  // Founder amendment (28 Aug): the inverse's bearish leg is the NARROWEST
  // canonical state — Capitulation ONLY. Intermediate states never qualify.
  check("D4 inverse allowed states pinned to exactly ['Capitulation']", JSON.stringify(D4_INVERSE_NUPL_STATES) === JSON.stringify(["Capitulation"]));
  check("D4 inverse: Capitulation without value conditions", divergenceStatus(d4, legFacts({ nuplIdxFromOptimism: -2, nuplStateLabel: "Capitulation", accumulationKey: "neutral", activeToday: { nupl: true } }), null)?.orientation === "inverse");
  check("D4 inverse does NOT fire on the intermediate 'Hope / fear' zone", divergenceStatus(d4, legFacts({ nuplIdxFromOptimism: -1, nuplStateLabel: "Hope / fear", accumulationKey: "neutral", activeToday: { nupl: true } }), null) == null);
  check("D4 inverse also holds when accumulation reads elevated (still not attractive)", divergenceStatus(d4, legFacts({ nuplIdxFromOptimism: -2, nuplStateLabel: "Capitulation", accumulationKey: "elevated", activeToday: { nupl: true } }), null)?.orientation === "inverse");

  const d5 = DIVERGENCE_REGISTRY.find((d) => d.id === "D5")!;
  check(
    "D5 primary: sustained profit realisation into rising price",
    divergenceStatus(d5, legFacts({ soprValue: 1.04, soprAbove1SustainedDays: 12, priceMaterialUp7: true, activeToday: { sopr: true } }), null)?.orientation === "primary",
  );
  check("D5 inverse: loss realisation absorbed", divergenceStatus(d5, legFacts({ soprValue: 0.97, priceMaterialUp7: false, activeToday: { sopr: true } }), null)?.orientation === "inverse");
  // Founder amendment (28 Aug): the primary REQUIRES SOPR above 1 — a
  // material 7-day rise while still below 1 can never read as profit
  // realisation (it is the inverse when price holds/rises).
  const subOne = divergenceStatus(d5, legFacts({ soprValue: 0.98, soprMaterialUp7: true, priceMaterialUp7: true, activeToday: { sopr: true } }), null);
  check("D5: material SOPR rise BELOW 1 never qualifies as primary", subOne == null || subOne.orientation !== "primary", subOne?.orientation);
  check("D5 primary also reachable via the material 7-day rise path (SOPR > 1, not yet sustained)", divergenceStatus(d5, legFacts({ soprValue: 1.02, soprMaterialUp7: true, soprAbove1SustainedDays: 0, priceMaterialUp7: true, activeToday: { sopr: true } }), null)?.orientation === "primary");
  const engineSrc = readFileSync("src/lib/briefSignificance.ts", "utf8");
  check("D5 primary predicate pins soprValue > 1 in source", /soprValue > 1 && \(f\.soprMaterialUp7 \|\| \(f\.soprAbove1SustainedDays \?\? 0\) >= 7\)/.test(engineSrc));
}

// ═══ 3 · Ranking, tie-breaks and day types (fixtures) ══════════════════════
console.log("3 · Ranks, cohort-safe rarity, fallback ordering, day types");
{
  const t = dev({ rank: 1, kind: "state_transition", metricId: "nupl", cohort: "onchain", rarityPercentile: null, label: "NUPL" });
  const x = dev({ rank: 2, metricId: "fear_greed", cohort: "sentiment", rarityPercentile: 99, label: "Fear & Greed" });
  const s = dev({ rank: 3, kind: "streak_record", metricId: "etf_flows", cohort: "etf-flows", rarityPercentile: null, label: "ETF Net Flows" });
  const g = dev({ rank: 4, kind: "divergence", metricId: "fear_greed", metricIds: ["fear_greed", "accumulation"], cohort: null, rarityPercentile: null, label: "Sentiment ↔ Accumulation" });

  check("rank order: transition > extreme > streak > divergence", orderDevelopments([g, s, x, t]).map((d) => d.rank).join(",") === "1,2,3,4");

  // Same rank + SAME cohort → rarity breaks the tie.
  const a = dev({ metricId: "mvrv_z", cohort: "onchain", rarityPercentile: 96, label: "MVRV Z-Score" });
  const b = dev({ metricId: "rhodl", cohort: "onchain", rarityPercentile: 99, label: "RHODL" });
  check("within one cohort, higher rarity wins the tie", orderDevelopments([a, b])[0].metricId === "rhodl");

  // Same rank, DIFFERENT cohorts → rarity must NOT decide; fallback does.
  const c = dev({ metricId: "fear_greed", cohort: "sentiment", rarityPercentile: 99, label: "Fear & Greed" });
  const d2 = dev({ metricId: "nupl", cohort: "onchain", rarityPercentile: 95, label: "NUPL" });
  check("across cohorts, raw rarity never ranks — the fallback ordering does (NUPL pos 3 < sentiment pos 6)", orderDevelopments([c, d2])[0].metricId === "nupl");

  // Intra-family precedence: mining_cost before puell at equal rarity state.
  const mc = dev({ metricId: "mining_cost", cohort: "mining-cost", rarityPercentile: null, label: "Est. Mining Cost" });
  const pu = dev({ metricId: "puell", cohort: "mining-cost", rarityPercentile: null, label: "Puell Multiple" });
  check("intra-family: mining_cost precedes puell", orderDevelopments([pu, mc])[0].metricId === "mining_cost");

  check("day type: any rank-1 development → major_transition", classifyDayType([x, t]) === "major_transition");
  check("day type: qualifying developments without rank 1 → active", classifyDayType([x, s]) === "active");
  check("day type: nothing qualifying → quiet", classifyDayType([]) === "quiet");

  const many = [x, s, g, dev({ metricId: "mayer", cohort: "price-structure", rarityPercentile: 97, label: "Mayer" }), dev({ metricId: "sopr", cohort: "onchain", rarityPercentile: 96, label: "SOPR" })];
  const active = selectDevelopments(many);
  check("active day: hero + at most THREE supporting", active.hero != null && active.supporting.length === 3);
  const majorSel = selectDevelopments([t, ...many]);
  check("major transition: supporting capped at TWO and the transition is hero", majorSel.hero?.rank === 1 && majorSel.supporting.length === 2);
  const lone = selectDevelopments([x]);
  check("no padding: one qualifying development → zero supporting", lone.supporting.length === 0);
  check("quiet: no hero, no supporting", selectDevelopments([]).hero == null && selectDevelopments([]).supporting.length === 0);
}

// ═══ 4 · Verdict, subject and CTA families (fixtures) ══════════════════════
console.log("4 · Verdict synthesis, subject families, single CTA");
{
  const t = dev({ rank: 1, kind: "state_transition", metricId: "nupl", label: "NUPL", headline: "NUPL entered Optimism", cohort: "onchain", rarityPercentile: null });
  const tension = {
    id: "D4" as const,
    label: "NUPL ↔ Accumulation",
    legs: ["nupl", "accumulation"] as [string, string],
    orientation: "primary" as const,
    interpretation: "Holder paper profits are building while value conditions persist.",
    reportable: false,
    formedToday: false,
    legChangedToday: false,
    activeLegToday: true,
    jointHistoryFrom: "2022-07",
    shortRecord: false,
  };
  const vMajor = synthesizeVerdict({ dayType: "major_transition", hero: t, divergences: [tension], analysed: 15, countsLine: "x" });
  check("major verdict frames the transition in cross-signal context", /NUPL entered Optimism/.test(vMajor) && /value conditions persist/.test(vMajor));
  const vQuiet = synthesizeVerdict({ dayType: "quiet", hero: null, divergences: [], analysed: 15, countsLine: "x" });
  check("quiet verdict says plainly that little changed and why that matters", /Little changed/.test(vQuiet) && /Stability/.test(vQuiet));

  const subs = subjectCandidatesFor({ dayType: "major_transition", hero: t, divergences: [tension], analysed: 15 });
  check("a genuine tension is implied in a subject candidate (approved family)", subs.some((s2) => /while/.test(s2)));
  check("no 'A state changed:' mechanical stem", subs.every((s2) => !/^A state changed:/.test(s2)));
  const picked = pickSubject(["A short subject", "This candidate is deliberately far, far over the sixty character preference limit"], [], 1);
  check("≤60-char candidates are preferred when any exist", picked === "A short subject");
  const quietSubs = subjectCandidatesFor({ dayType: "quiet", hero: null, divergences: [], analysed: 15 });
  check("quiet subject family present with the analysed count", quietSubs.some((s2) => /quiet day across all 15 signals/.test(s2)));

  check("quiet CTA: all-N-signals family to the board anchor", JSON.stringify(ctaFor("quiet", null, 15)) === JSON.stringify({ label: "See all 15 signals holding steady", href: "/cycle-dashboard#dashboard-market-board" }));
  check("major CTA: full-historical-context family to the state strip", ctaFor("major_transition", t, 15).label === "See NUPL in full historical context" && /#dashboard-state-strip$/.test(ctaFor("major_transition", t, 15).href));
  const dgHero = dev({ rank: 4, kind: "divergence", metricId: "fear_greed", metricIds: ["fear_greed", "accumulation"], cohort: null, label: "Sentiment ↔ Accumulation" });
  check("divergence-hero CTA names the tension", /tension in full context/.test(ctaFor("active", dgHero, 15).label));
  for (const [dt, hero] of [["quiet", null], ["active", t], ["major_transition", t]] as const) {
    const cta = ctaFor(dt, hero, 15);
    check(`${dt} CTA destination is an existing dashboard anchor`, /^\/cycle-dashboard#dashboard-(market-board|state-strip|etf-intel)$/.test(cta.href), cta.href);
    check(`${dt} CTA is a statement, not a question`, !/\?/.test(cta.label));
  }
}

// ═══ 5 · Renderer contract (day-type fixtures rendered for real) ═══════════
console.log("5 · Renderer: hierarchy, whole-card links, attribution labels");
{
  const base = briefEdition(); // live payload — today's real edition
  const t = dev({ rank: 1, kind: "state_transition", metricId: "nupl", label: "NUPL", headline: "NUPL entered Optimism", cohort: "onchain", rarityPercentile: null, href: "/cycle-dashboard#dashboard-state-strip" });
  const x = dev({ metricId: "mvrv_z", cohort: "onchain", label: "MVRV Z-Score" });
  const fixtures = {
    quiet: { ...base, dayType: "quiet" as const, hero: null, supporting: [], quiet: { line: "Nothing crossed a line.", whyItMatters: "Stability is information." }, cta: ctaFor("quiet", null, base.analysed) },
    active: { ...base, dayType: "active" as const, hero: x, supporting: [t], quiet: null, cta: ctaFor("active", x, base.analysed) },
    major_transition: { ...base, dayType: "major_transition" as const, hero: t, supporting: [x], quiet: null, cta: ctaFor("major_transition", t, base.analysed) },
  };
  const tracked = emailTracking("reader@example.com", "daily-2026-08-27-active");

  for (const [name, payload] of Object.entries(fixtures)) {
    const html = briefEditionEmailHtmlFor(payload, "https://halvinglens.com/unsub", tracked);
    check(`${name}: exactly ONE primary-cta link`, (html.match(/cta=primary-cta/g) ?? []).length === 1);
    check(`${name}: whole state table is one state-table link`, (html.match(/cta=state-table/g) ?? []).length === 1);
    check(`${name}: no UTM parameters anywhere in the email`, !/utm_/.test(html));
    check(`${name}: every link rides the signed first-party tracker (or unsubscribe)`, (html.match(/href="https?:\/\/[^"]*"/g) ?? []).every((h) => /\/api\/email\/click\?/.test(h) || /unsub/.test(h)));
    check(`${name}: no competing secondary 'Explore' links`, !/Explore /.test(html));
    const labels = [...html.matchAll(/cta=([a-z0-9-]+(?:%[0-9A-Fa-f]{2}|[a-z0-9_-])*)/g)].map((m) => decodeURIComponent(m[1]));
    check(`${name}: attribution labels stay within the approved vocabulary`, labels.every((l) => l === "primary-cta" || l === "hero-card" || l === "state-table" || /^supporting-[a-z0-9_]+$/.test(l)), labels.join(","));
  }

  const activeHtml = briefEditionEmailHtmlFor(fixtures.active, "https://halvinglens.com/unsub", tracked);
  check("active: hero renders as a whole clickable card", /cta=hero-card/.test(activeHtml));
  check("active: supporting card labelled by its signal", /cta=supporting-nupl/.test(activeHtml));
  const quietHtml = briefEditionEmailHtmlFor(fixtures.quiet, "https://halvinglens.com/unsub", tracked);
  check("quiet: no hero card, markedly shorter edition", !/cta=hero-card/.test(quietHtml) && quietHtml.length < activeHtml.length);
  check("quiet: BTC price line remains", base.price == null || /BTC \$/.test(quietHtml));
  check("quiet: state of the cycle remains", /State of the cycle/i.test(quietHtml));

  const majorHtml = briefEditionEmailHtmlFor(fixtures.major_transition, "https://halvinglens.com/unsub", tracked);
  check("major: the transition leads the hero treatment", /NUPL entered Optimism/.test(majorHtml));

  const text = briefEditionTextFor(fixtures.active);
  check("plain-text mirrors the hierarchy (verdict → hero → states → CTA)", /THE VERDICT/.test(text) && /STATE OF THE CYCLE/.test(text) && text.indexOf("THE VERDICT") < text.indexOf("STATE OF THE CYCLE"));
}

// ═══ 6 · Live payload, price honesty, agreement, compliance ════════════════
console.log("6 · Live edition: price, agreement invariants, compliance");
{
  const b = briefEdition();
  check("payload analysed count is the canonical 15", b.analysed === 15, String(b.analysed));
  check("campaign identity keeps the canonical activity class", ["quiet", "mostly_quiet", "active"].includes(b.activity));
  check("day type is one of the three approved types", ["quiet", "active", "major_transition"].includes(b.dayType));
  check("supporting bounded: ≤3, and ≤2 on a major transition", b.supporting.length <= (b.dayType === "major_transition" ? 2 : 3));
  check("no development duplicates a metric across hero+supporting (ranks 1–3)", (() => {
    const solo = [b.hero, ...b.supporting].filter((d): d is Development => d != null && d.kind !== "divergence").map((d) => d.metricId);
    return new Set(solo).size === solo.length;
  })());
  check("every rendered development names its window", [b.hero, ...b.supporting].every((d) => d == null || d.windowLabel.length > 0));
  check("persisting divergences never occupy hero/supporting", b.divergences.filter((d) => !d.reportable).every((d) => ![b.hero, ...b.supporting].some((x) => x?.kind === "divergence" && x.divergenceId === d.id)));

  if (b.price) {
    check("BTC absolute price is shown, never withheld", Number.isFinite(b.price.value) && b.price.value > 0);
    check("24h movement is snapshot-to-snapshot with the window named", b.price.changePct == null || (b.price.windowLabel != null && /snapshot/.test(b.price.windowLabel)));
  } else {
    check("price line honestly absent (no fabricated number)", true);
  }
  const p = priceLineAt(b.asOf, true);
  check("price movement derives from the PERSISTED prior sync (stored brief archive)", p == null || p.prevSnapshotDate == null || p.prevSnapshotDate < b.asOf);

  // Agreement: the payload quotes the canonical authorities.
  const code = readFileSync("src/lib/briefSignificance.ts", "utf8") + readFileSync("src/lib/briefEdition.ts", "utf8");
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const src = strip(code);
  check("no second material-movement threshold is minted (references MATERIAL_SIGNIFICANCE)", /MATERIAL_SIGNIFICANCE/.test(src) && !/movement\s*[><]=?\s*\d/.test(src));
  check("tier-2 references EXCEPTIONAL_SIGNIFICANCE, never a literal 95 threshold", /EXTREME_RARITY_PERCENTILE = EXCEPTIONAL_SIGNIFICANCE/.test(code));
  check("the dashboard's activity classifier is quoted, never recomputed", !/weekActivity\s*\(/.test(src));
  check("no email UTM taxonomy in the engine/payload", !/utm_/.test(src));
  check("lthSupply is not registered/monitored by PR1", !/lthSupply/.test(src));

  // Compliance scan over everything a subscriber could read, all day types.
  const tracked = emailTracking("reader@example.com", "daily-test");
  const allText = [
    briefEditionEmailHtml("https://halvinglens.com/unsub", tracked),
    briefEditionText(),
    b.verdictLine,
    ...b.subjectCandidates,
    b.subject,
    b.preheader,
  ].join("\n");
  // "no price targets" in the compliance footer is the disclaimer itself,
  // not a violation — the ban is on ASSERTING one.
  const BANNED = [/\bwill\b/i, /\bforecast/i, /\bpredict(?!ion\b)/i, /(?<!no )price targets?/i, /\bbuy now\b/i, /\bsell\b/i, /guarantee/i, /hurry|don'?t miss|last chance|act now/i, /🚀|🔥|📈|⚠️|[\u{1F300}-\u{1FAFF}]/u];
  check("no forecast/urgency/emoji vocabulary anywhere a subscriber reads", BANNED.every((re) => !re.test(allText)), BANNED.filter((re) => re.test(allText)).map(String).join(" "));
  check("subject has no emoji and exists", b.subject.length > 0 && !/[\u{1F300}-\u{1FAFF}]/u.test(b.subject));
  check("preheader is the verdict sentence (verbatim or trimmed)", b.preheader === b.verdictLine || b.verdictLine.startsWith(b.preheader.replace(/…$/, "")));

  // Determinism: the same anchor yields the same edition.
  const again = briefEdition();
  check("edition is deterministic for one anchor", JSON.stringify(again.selection) === JSON.stringify(b.selection) && again.subject === b.subject);

  // Live divergences carry the joint-window disclosure where reportable.
  const reportable = b.divergences.filter((d) => d.reportable);
  check("reportable divergences exist only via formation/leg-change + active leg", reportable.every((d) => (d.formedToday || d.legChangedToday) && d.activeLegToday));
  check("live discovery agrees with the selection diagnostics", discoverDevelopments(b.asOf).length === b.selection.considered.length);
  check("activeDivergences is registry-only", activeDivergences(b.asOf).every((d) => ["D1", "D2", "D3", "D4", "D5", "D7"].includes(d.id)));
  check("engine version stamped", BRIEF_SIGNIFICANCE_VERSION === "brief-significance-v1");
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll brief-edition checks passed.");
