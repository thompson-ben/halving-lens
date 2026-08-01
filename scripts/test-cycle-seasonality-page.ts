// Deterministic tests for the Cycle-Aligned Seasonality page layer (PR-V2B):
// payload/engine equality, the five distinct cell states (visual AND
// accessible), grid-only navigation, the shared highlight/dialog contracts,
// honest language, and every ecosystem integration point.
// Run: npm run test-cycle-seasonality-page

import { readFileSync } from "node:fs";
import { buildCycleSeasonalityPayload } from "../src/lib/cycleSeasonalityPayload";
import { agreementFacts, cycleCells, gridHorizon, monthBoundaries } from "../src/lib/cycleSeasonality";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";
import { JOURNEY_MAP } from "../src/lib/journeyMap";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

const explorerSrc = readFileSync("src/components/CycleSeasonalityExplorer.tsx", "utf8");
const pageSrc = readFileSync("src/app/price/seasonality/cycles/page.tsx", "utf8");

// ── Payload agrees with the engine (no drift, no client recomputation) ───────

if (PRICE_ARCHIVE.length > 1000) {
  const payload = buildCycleSeasonalityPayload();
  assert(Object.keys(payload.grids).length === 7, "seven grids: returns ×4, valuation ×3 (never market-vs-market)");
  assert(payload.grids["valuation:market" as never] === undefined, "no valuation:market grid exists");
  const engineCells = [...cycleCells("returns", "market").values()].flat().filter((c) => c.value != null);
  const payloadCells = payload.grids["returns:market"]!.cells;
  assert(payloadCells.length === engineCells.length, "payload carries exactly the engine's observed market cells");
  assert(
    payloadCells.every(([cid, m, v, p]) => engineCells.some((c) => c.cycleId === cid && c.month === m && c.value === v && (c.partial ? 1 : 0) === p)),
    "every payload cell matches the engine byte-for-byte (value AND partial flag)",
  );
  assert(payload.horizon === gridHorizon(), "the payload horizon is the engine's observed horizon");
  assert(JSON.stringify(payload.facts) === JSON.stringify(agreementFacts()), "agreement facts travel unchanged from the engine");
  assert(payload.agreement.agreed === payload.facts.length && payload.agreement.comparable >= payload.agreement.agreed, "the hero's disagreement share counts facts against comparable months");
  assert(payload.spans.length === 4 && payload.position != null && payload.position.projectedNextHalving === "2028-04-17", "spans and the labelled projected position travel with the payload");
  // Detail stays inside its month (the clarification-4 staleness limit).
  const someKey = Object.keys(payload.detail).find((k) => k.startsWith("4-2")) ?? Object.keys(payload.detail)[0];
  if (someKey) {
    const [cid, m] = someKey.split("-").map(Number);
    const span = payload.spans.find((s) => s.id === cid)!;
    const b = monthBoundaries(span.anchor, m);
    const d = payload.detail[someKey];
    assert(d.asOf >= b.from && d.asOf < b.to, "configuration detail's as-of date sits INSIDE its anchored month");
  }
  assert(payload.standingClose === "Historical context, not a prediction.", "the standing close travels with the payload");
} else {
  console.log("  note   archive empty in this checkout — payload assertions skipped");
}

// ── The five cell states: distinct visuals AND accessible labels ─────────────

assert(explorerSrc.includes('"complete" | "stub" | "mtd" | "unobserved" | "outside"'), "cell state is a typed five-way union");
assert(explorerSrc.includes("partial final month — the cycle ended"), "a completed cycle's stub announces itself and its end date");
assert(explorerSrc.includes("month to date. Open details."), "the current cycle's running month announces month-to-date");
assert(explorerSrc.includes("not observed in this series' window"), "unobserved reference months carry their own label");
assert(explorerSrc.includes("the cycle ended before this month") && explorerSrc.includes("not yet occurred"), "outside-span cells distinguish an ended cycle from the unarrived future");
assert(explorerSrc.includes('"border border-dashed border-white/30"') && explorerSrc.includes('"border-2 border-dashed border-accent/70"'), "stub and month-to-date differ by border WIDTH and colour — never colour alone");
assert(explorerSrc.includes("disabled={!clickable}"), "valueless cells leave the tab order");
assert(explorerSrc.includes("Solid cells are complete anchored months"), "the on-page legend names the states in plain language");

// ── Navigation: grid-only scrolling + quiet jump controls ────────────────────

assert(explorerSrc.includes("el.scrollLeft = Math.max(0,") && !explorerSrc.includes("window.scroll"), "initial positioning scrolls ONLY the grid container — never the document");
assert(explorerSrc.includes("Start at month 0") && explorerSrc.includes("Jump to current month"), "both quiet jump controls exist");
assert((explorerSrc.match(/scrollIntoView/g) ?? []).length === 2 && explorerSrc.includes("const jumpToCurrent") && explorerSrc.includes("const jumpToStart"), "scrollIntoView happens only inside the user-invoked jump handlers");

// ── Shared interaction contracts (highlight, dialog, Escape) ─────────────────

assert(explorerSrc.includes('from "./seasonalityHighlight"'), "the highlight primitives are the SHARED module — one implementation for both grids");
assert(explorerSrc.includes('setHighlight({ kind: "cell"'), "picking a cell sets the crosshair");
assert(explorerSrc.includes("if (picked) closePicked();") && explorerSrc.includes("else setHighlight(null)"), "Escape peels layers: detail sheet first, then highlight");
assert(explorerSrc.includes('role="dialog"') && explorerSrc.includes("month ${picked.month} details"), "the detail sheet is a labelled dialog");
assert(explorerSrc.includes("closeBtn.current?.focus()") && explorerSrc.includes("pinOrigin.current?.focus()"), "focus moves to the close control on open and returns to the cell on close");
assert(!/statsFromCells|insightsFrom|inFilter|WindowFilter/.test(explorerSrc), "no filters and no client recomputation — everything ships precomputed");

// ── Honest language on the page ──────────────────────────────────────────────

// Scan RENDERED copy only: comments stripped, negated disclaimers ("not a
// forecast", the register's own guardrails) exempt — the standing rule.
const rendered = (src: string) =>
  src
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/not a forecast|never a forecast|not a prediction/gi, "");
const BANNED = [/typical/i, /usually/i, /tends to/i, /\bexpect/i, /forecast/i, /predict/i, /percentile/i, /\bfair value\b/i, /\btarget\b/i, /\bsupport\b/i];
for (const [name, src] of [["page", rendered(pageSrc)], ["explorer", rendered(explorerSrc)]] as const) {
  assert(!BANNED.some((re) => re.test(src)), `${name}: no expectation or banned vocabulary in any rendered copy (negated disclaimers exempt)`);
}
assert(pageSrc.includes("agreement.agreed") && pageSrc.includes("agreement.comparable"), "the hero's disagreement line is engine-fed, never hand-written numbers");
assert(pageSrc.includes("all 3 completed cycles"), "agreement section speaks over ALL 3 COMPLETED CYCLES");
assert(pageSrc.includes("begins at month 37"), "the CORRECTED 2012-cycle mining-cost coverage is stated (month 37, not 'none')");
assert(pageSrc.includes("(projected)") && pageSrc.includes("never a cell in the grid"), "the projected halving is labelled and explicitly generates no cells");
assert(pageSrc.includes("STANDING_CLOSE") && pageSrc.includes("JourneyNext") && pageSrc.includes("TrackedSection"), "standing close, journey and existing-events instrumentation");

// ── Ecosystem integration ────────────────────────────────────────────────────

const entry = JOURNEY_MAP["/price/seasonality/cycles" as keyof typeof JOURNEY_MAP] as
  | { primary: { href: string }; secondary: readonly { href: string }[] }
  | undefined;
assert(!!entry && entry.primary.href === "/cycles" && entry.secondary.length <= 2, "journey map: hands off to Cycle comparison with ≤2 secondaries");
const nav = readFileSync("src/components/navItems.ts", "utf8");
assert(nav.includes('"/price/seasonality/cycles"'), "the page is in the Explore nav group (and thus in search)");
const sitemapSrc = readFileSync("src/app/sitemap.ts", "utf8");
assert(sitemapSrc.includes('"/price/seasonality/cycles"'), "the page is in the sitemap");
const analytics = readFileSync("src/lib/journeyAnalytics.ts", "utf8");
assert(analytics.includes('"/price/seasonality/cycles": "Cycle Seasonality"'), "founder dashboards label the page");
assert(pageSrc.includes('href="/price/seasonality"'), "the page cross-links the calendar view");

console.log(failures === 0 ? "\nAll cycle-seasonality-page tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
