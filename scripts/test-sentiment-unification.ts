// Sentiment unification pins (founder trust correction, Oct 2026).
//
// THE RULE: sentiment ADJECTIVES come only from the canonical mapping in
// src/lib/sentiment.ts (bandFor). Numeric Fear & Greed comparisons may still
// decide WHEN a feature activates or leads (deliberate prominence gates),
// but never WHAT the reading is called. These pins hold every site that
// previously declared its own thresholds-and-words to the rule, and pin the
// canonical boundaries themselves so the mapping cannot drift silently.

import { readFileSync } from "node:fs";
import { bandFor } from "../src/lib/sentiment";

let failures = 0;
function check(name: string, ok: boolean, detail?: string): void {
  console.log(`  ${ok ? "✓" : "✗"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

// ── The canonical mapping itself (the one documented source) ────────────────
check("canonical bands: 24 extreme-fear · 25 fear · 44 fear · 45 neutral",
  bandFor(24).band === "extreme-fear" && bandFor(25).band === "fear" && bandFor(44).band === "fear" && bandFor(45).band === "neutral");
check("canonical bands: 54 neutral · 55 greed · 74 greed · 75 extreme-greed",
  bandFor(54).band === "neutral" && bandFor(55).band === "greed" && bandFor(74).band === "greed" && bandFor(75).band === "extreme-greed");

const read = (p: string) => readFileSync(p, "utf8");

// ── cycleSummary: all three former divergence sites ─────────────────────────
const cs = read("src/lib/cycleSummary.ts");
check("cycleSummary derives every sentiment sentence from one bandFor helper",
  cs.includes("function sentimentWhy(") && cs.split("sentimentWhy(").length >= 3);
check("scorecard Sentiment status IS the canonical band label (no local Greed/Fear/Calm mapping)",
  cs.includes("status: bandFor(v).label") && !cs.includes('v >= 75 ? "Greed"'));
check("whatChanged no longer declares its own sentiment thresholds/wording",
  !cs.includes("Sentiment is in neutral territory") && !cs.includes("approaching greedy territory"));
check("WhatToWatch status words come from bandFor (gates remain prominence-only)",
  cs.includes("bandFor(v).label} — Fear & Greed at") && !cs.includes("Greed building —") && !cs.includes("Measured —"));

// ── The other formerly-divergent sites ──────────────────────────────────────
check("dailyChange context uses canonical bands; the false 'approaching greedy' at 75+ is gone",
  (() => { const s = read("src/lib/dailyChange.ts"); return s.includes('bandFor(sentiment.value).band === "extreme-greed"') && !s.includes("Approaching greedy territory"); })());
check("storyEngine mood is the canonical band label (no 25/75 re-banding)",
  (() => { const s = read("src/lib/storyEngine.ts"); return s.includes("const mood = sr.band.label;") && !s.includes('fg <= 25 ? "Extreme Fear"'); })());
check("emailBrief extreme flags are canonical band checks (25 is Fear, not Extreme fear)",
  (() => { const s = read("src/lib/emailBrief.ts"); return s.includes('sr.band.band === "extreme-fear"') && s.includes('sr.band.band === "extreme-greed"') && !s.includes("sr.value <= 25"); })());
check("cycleZones hero says 'extreme fear' (canonical adjective); its stricter 20/80 gates remain prominence-only",
  (() => { const s = read("src/lib/cycleZones.ts"); return s.includes("Sentiment is in extreme fear") && !s.includes("deep fear"); })());
check("reel adjectives come from the band label (no hardcoded 'deep fear'/'Greed is back' insight wording)",
  (() => { const s = read("src/lib/reel.ts"); return !s.includes("— deep fear.") && !s.includes("Greed is back (Fear & Greed"); })());

// ── Methodology correction (scorecard complementary pair) ───────────────────
const meth = read("src/app/methodology/page.tsx");
check("methodology states the pair contributes a FIXED MIDPOINT (cancellation), not 'anchoring'",
  meth.includes("contribute a fixed midpoint") && meth.includes("does not move the composite") && !meth.includes("anchor the composite toward"));
check("methodology names price structure as the hotter-higher exception and labels this a limitation",
  meth.includes("higher reads hotter") && meth.includes("limitation of the current calculation"));
check("methodology marks any rescoring as a separate decision that would change published scores",
  meth.includes("change published scores") && meth.includes("separate decision"));
check("market-health page carries the same stated limitation",
  (() => { const s = read("src/app/market-health/page.tsx"); return s.includes("sum to 100") && s.includes("fixed midpoint") && !s.includes("(higher =\n          calmer). Factors"); })());
check("scorecard math is UNCHANGED in this correction (scores preserved)",
  cs.includes("score: s.heatPercentile") && cs.includes("score: Math.round(100 - s.heatPercentile)") && cs.includes('SCORECARD_VERSION = "cycle-scorecard-v1"'));

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll sentiment-unification checks passed");
