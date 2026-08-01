// Deterministic tests for the Seasonality page layer (PR-C): the explorer
// payload (compact grids, tooltip detail in the framework's language, filter
// context round-trip), the client-safety of the core split, mode-specific
// user language, and every ecosystem integration point.
// Run: npm run test-seasonality-page

import { readFileSync } from "node:fs";
import { deserializeCtx, serializeCtx, shareLabel, statsFromCells, currentContextFrom, type MonthCell } from "../src/lib/seasonalityCore";
import { seasonalityData } from "../src/lib/seasonality";
import { buildSeasonalityPayload } from "../src/lib/seasonalityPayload";
import { JOURNEY_MAP } from "../src/lib/journeyMap";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

// ── Mode-specific user language (founder clarification) ──────────────────────

assert(shareLabel("returns", "market") === "Positive months", "Market Price returns phrase: Positive months");
assert(shareLabel("returns", "trend") === "Months higher" && shareLabel("returns", "miners") === "Months higher", "reference-series returns phrase: Months higher");
assert(shareLabel("valuation", "holders") === "Months above reference", "valuation phrase: Months above reference");
const explorerSrc = readFileSync("src/components/SeasonalityExplorer.tsx", "utf8");
assert(explorerSrc.includes("shareLabel("), "the explorer derives the phrase from the shared map, never hand-writes it");
assert(!explorerSrc.includes('"positivePct"') && !explorerSrc.includes(">positivePct<"), "the raw engine field name is never shown to users");

// ── Client-safety of the core split ──────────────────────────────────────────

const coreSrc = readFileSync("src/lib/seasonalityCore.ts", "utf8");
assert(!/from "\.\/data\/(priceArchiveData|snapshot)"/.test(coreSrc), "the core module imports no data modules (client-safe)");
assert(!/fourReferencePrices/.test(coreSrc), "the core does not drag the framework engine into the bundle (standing close is injected)");
assert(/from "@\/lib\/seasonalityCore"/.test(explorerSrc) && !/from "@\/lib\/seasonality"/.test(explorerSrc.replace(/seasonalityCore|seasonalityPayload/g, "X")), "the client component imports the core, never the server engine");
const engineSrc = readFileSync("src/lib/seasonality.ts", "utf8");
assert(engineSrc.includes('export * from "./seasonalityCore"'), "the server engine re-exports the core, so PR-B callers are unchanged");

// ── Filter-context round trip ────────────────────────────────────────────────

if (PRICE_ARCHIVE.length > 0) {
  const payload = buildSeasonalityPayload();
  const ctx = deserializeCtx(payload.ctx);
  assert(JSON.stringify(serializeCtx(ctx)) === JSON.stringify(payload.ctx), "serialize/deserialize round-trips the filter context exactly");
  assert(ctx.electionYears.has(2024) && ctx.currentCycleFrom === "2024-04-19", "the context carries real election years and the current halving");
  assert(ctx.midtermYears.has(2010) && ctx.midtermYears.has(2026) && !ctx.midtermYears.has(2024), "the context carries the real US midterm years (2010 + 4k, through 2026)");

  // ── Payload grids agree with the engine ────────────────────────────────────
  assert(Object.keys(payload.grids).length === 7, "seven grids: returns ×4 series, valuation ×3 references (never market-vs-market)");
  assert(payload.grids["valuation:market" as never] === undefined, "no valuation:market grid exists");
  assert(payload.grids["returns:market"]!.windowFrom === "2010-07-18", "market returns start at the archive floor");
  assert(payload.grids["returns:holders"]!.windowFrom === "2022-07-26", "holder returns start at the observed realised-price floor");
  assert(payload.grids["returns:miners"]!.windowFrom === "2016-01-04", "miner returns start at the model window");
  assert((payload.grids["returns:trend"]!.windowFrom ?? "") >= "2011-01-01", "trend returns start only after the 200-day warm-up");

  // Client-side recomputation from payload cells must equal the server engine.
  const g = payload.grids["returns:market"]!;
  const byKey = new Map(g.cells.map(([y, m, v, p]) => [`${y}-${m}`, [v, p] as const]));
  const cells: MonthCell[] = [];
  for (let y = g.firstYear!; y <= payload.curYear; y++) {
    for (let m = 1; m <= 12; m++) {
      const hit = byKey.get(`${y}-${m}`);
      const future = y === payload.curYear && m > payload.curMonth;
      cells.push({ year: y, month: m, value: hit && !future ? hit[0] : null, partial: hit ? hit[1] === 1 : false, nature: hit && !future ? "observed" : null });
    }
  }
  const server = seasonalityData({ mode: "returns", series: "market", filter: "election" }, payload.todayIso);
  const client = statsFromCells(cells, "election", ctx);
  assert(JSON.stringify(client) === JSON.stringify(server.stats), "client-side stats from payload cells EQUAL the server engine's (no duplicated maths drift)");
  const clientCur = currentContextFrom(cells, payload.curYear, payload.curMonth, payload.standingClose);
  assert(JSON.stringify(clientCur) === JSON.stringify(server.current), "client-side current-month context equals the server engine's");

  // ── Tooltip detail speaks the framework's language ─────────────────────────
  const detail = payload.detail["2020-07"];
  assert(detail?.config != null && /trend|reference/i.test(detail.config), "detail carries the real configuration phrase");
  assert(detail?.vsHoldersPct === null, "detail never invents holder gaps before the 2022-07-26 floor");
  assert(payload.detail["2023-03"]?.vsHoldersPct != null, "detail carries holder gaps once observed");
  assert(detail?.cycle?.n === 4, "cycle numbering matches the platform's cycle ids");
  assert(payload.standingClose === "Historical context, not a prediction.", "the standing close travels with the payload (injected, single source)");
} else {
  console.log("  note   archive empty in this checkout — payload assertions skipped");
}

// ── Ecosystem integration ────────────────────────────────────────────────────

const entry = JOURNEY_MAP["/price/seasonality" as keyof typeof JOURNEY_MAP] as
  | { primary: { href: string }; secondary: readonly { href: string }[] }
  | undefined;
assert(!!entry, "journey map has a /price/seasonality entry (implemented in the Growth engine on day one)");
assert(entry?.primary.href === "/similar-moments" && (entry?.secondary.length ?? 0) <= 2, "primary hand-off is Similar Moments with at most two secondaries");
const nav = readFileSync("src/components/navItems.ts", "utf8");
assert(nav.includes('"/price/seasonality"'), "Seasonality is in the Explore nav group (and thus in search)");
const sitemap = readFileSync("src/app/sitemap.ts", "utf8");
assert(sitemap.includes('"/price/seasonality"'), "the page is in the sitemap");
const analytics = readFileSync("src/lib/journeyAnalytics.ts", "utf8");
assert(analytics.includes('"/price/seasonality": "Seasonality"'), "founder dashboards label the page");
const pricePage = readFileSync("src/app/price/page.tsx", "utf8");
assert(pricePage.includes("/price/seasonality"), "/price links to the seasonality page");
const pageSrc = readFileSync("src/app/price/seasonality/page.tsx", "utf8");
assert(pageSrc.includes("STANDING_CLOSE") && pageSrc.includes("JourneyNext"), "the page carries the standing close and the journey");
assert(pageSrc.includes("TrackedSection"), "sections are instrumented with existing events only");

// ── Accessibility wiring (functional, founder-required before merge) ─────────

assert(explorerSrc.includes('e.key === "Escape"') && explorerSrc.includes("closePicked"), "Escape closes the pinned detail view");
assert(explorerSrc.includes("pinOrigin.current?.focus()"), "closing returns focus to the activating cell");
assert(explorerSrc.includes("closeBtn.current?.focus()"), "the detail sheet's close control takes focus on open");
assert(explorerSrc.includes('role="dialog"') && explorerSrc.includes("details`}"), "the detail sheet is a labelled dialog");
assert(explorerSrc.includes("not yet occurred") && explorerSrc.includes("no observation in this series") && explorerSrc.includes("month to date"), "missing, future and month-to-date cells carry DISTINCT accessible labels");
assert(explorerSrc.includes("cellAriaLabel"), "one shared label helper covers desktop and mobile cells");
assert((explorerSrc.match(/disabled=\{!hasValue\}/g) ?? []).length === 2, "empty cells leave the tab order on both layouts; valued cells stay focusable buttons");
const globals = readFileSync("src/app/globals.css", "utf8");
assert(/button:focus-visible/.test(globals), "visible keyboard-focus treatment applies to grid cells via the global focus ring");

// ── Filter visibility contract (UX PR — founder-approved audit fix) ──────────

assert((explorerSrc.match(/opacity: isMember\(/g) ?? []).length === 2, "non-member cells dim via membership on BOTH layouts (the originally designed dimming)");
assert(explorerSrc.includes('filter !== "all"') && explorerSrc.includes("? 1 : 0.25"), "dimming applies only when a filter is active, at ~25% opacity — values never change");
assert(explorerSrc.includes("member months of") && explorerSrc.includes("non-member months are dimmed"), "the live scope line explains what is filtered and what never is");
assert(explorerSrc.includes("No insights at this filter") && explorerSrc.includes("MIN_INSIGHT_N} observations"), "insights never vanish silently — the floor state is explained in place");
assert(explorerSrc.includes("full record — unfiltered"), "the This-Month card declares itself unfiltered");
assert((explorerSrc.match(/· \{filterLabel\}/g) ?? []).length >= 2, "the active filter is named in the filtered sections' own headings");
assert(explorerSrc.includes('"US midterm years"'), "the filter menu offers US midterm years (inherits the full PR164 visibility contract)");
assert(pageSrc.includes("unaffected by filters"), "the reference-price section declares itself full-record");

console.log(failures === 0 ? "\nAll seasonality-page tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
