// Cycle Dashboard tests (Cycle Dashboard V2, CD2). Offline, deterministic.
//
// Two halves: the Lens client PAYLOAD is proven to be a faithful, compact
// projection of the CD1 engine (every value traceable, unavailable states
// preserved, nothing recomputed downstream), and the PAGE/renderer contracts
// are pinned by targeted source scans — the client consumes the payload
// only, the accessible control is real, the routing/retirement landed, and
// the Pro seam reuses the existing subscription machinery honestly.
//
// Run: npm run test-cycle-dashboard

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { lensClientPayload, parseLensDay } from "../src/lib/lensPayload";
import {
  lensObservation,
  lensAtDay,
  lensSeries,
  CURRENT_FUTURE_REASON,
  LENS_OBSERVATION_VERSION,
} from "../src/lib/cycleLens";
import { cycleAnchor } from "../src/lib/cycleDay";

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name}${detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ""}`);
  }
}
const read = (p: string) => readFileSync(join(__dirname, p), "utf8");

// ── 1 · Payload is a faithful projection of the engine ──────────────────────
console.log("Lens payload assembly:");
const payload = lensClientPayload();
check("four cycles, house order", payload.cycles.map((c) => c.cycleId).join(",") === "2,3,4,5");
check("payload is cached (same object)", lensClientPayload() === payload);
check("asOfDate is the CD0 anchor", payload.asOfDate === cycleAnchor().asOfDate);
check("currentCycleDay is the anchor's day", payload.currentCycleDay === cycleAnchor().cycleDay);
check("maxDay is the largest cycle record (C4, 1438)", payload.maxDay === 1438);
for (const c of payload.cycles) {
  const n = c.lastDay + 1;
  check(
    `C${c.cycleId} parallel arrays cover days 0..${c.lastDay}`,
    c.multiple.length === n && c.drawdown.length === n && c.mayer.length === n,
  );
  check(`C${c.cycleId} multiple[0] is exactly 1`, c.multiple[0] === 1);
}
check("forward arrays exist ONLY for completed cycles", payload.cycles.every((c) => (c.cycleId === 5 ? !c.fwd : !!c.fwd && c.fwd[30].length === c.lastDay + 1)));
check("the current cycle's future is never in the payload", !("fwd" in payload.cycles.find((c) => c.cycleId === 5)!) || payload.cycles.find((c) => c.cycleId === 5)!.fwd === undefined);
check("currentFutureReason quotes the engine verbatim", payload.currentFutureReason === CURRENT_FUTURE_REASON);
check("observation methodology version travels", payload.observationVersion === LENS_OBSERVATION_VERSION);

console.log("Payload values trace to the engine (spot fixtures):");
const c2 = payload.cycles.find((c) => c.cycleId === 2)!;
const c3 = payload.cycles.find((c) => c.cycleId === 3)!;
const c5 = payload.cycles.find((c) => c.cycleId === 5)!;
const eng839 = lensAtDay(839).cycles.find((c) => c.cycleId === 3);
check("C3 fwd30[839] = engine's −38.4%", eng839?.reached === true && c3.fwd![30][839] === Math.round((eng839.forward[30] as { changePct: number }).changePct * 10) / 10);
check("C2 fwd90[1250] preserves the engine's unavailable (null)", c2.fwd![90][1250] === null);
check("C2 fwd30[1250] is observable", typeof c2.fwd![30][1250] === "number");
check("C5 mayer[0] = 1.35 (full 200-day history at the 2024 halving)", c5.mayer[0] === 1.35);
check("C2 drawdown day 371 (the peak) is 0", c2.drawdown[371] === 0);
check("peakDay carried from the engine's daily-derived peak", c5.peakDay === lensSeries(5).peakDay);

console.log("Per-day observations, sentences deduped:");
check("one entry per current-cycle day", payload.observations.length === payload.currentCycleDay + 1);
check("day 0 is the engine's null (0)", payload.observations[0] === 0);
const o839 = payload.observations[839];
const e839 = lensObservation(839)!;
check(
  "day 839 quotes the engine sentence, lifecycle and run start",
  o839 !== 0 && payload.sentences[o839.s] === e839.sentence && o839.lifecycle === e839.lifecycle && o839.sinceDay === e839.stateSinceDay,
);
check("sentence table is small and fully referenced", payload.sentences.length <= 8 && payload.observations.every((o) => o === 0 || (o.s >= 0 && o.s < payload.sentences.length)));

console.log("parseLensDay — validated and clamped:");
check("missing → current day", parseLensDay(undefined, payload) === payload.currentCycleDay);
check("garbage → current day", parseLensDay("abc", payload) === payload.currentCycleDay);
check("negative clamps to 0", parseLensDay("-5", payload) === 0);
check("huge clamps to maxDay", parseLensDay("99999", payload) === payload.maxDay);
check("in-range passes through", parseLensDay("400", payload) === 400);
check("array takes the first value", parseLensDay(["250", "300"], payload) === 250);

// ── 2 · Renderer contracts (source scans) ───────────────────────────────────
console.log("CycleLensExplorer renderer contracts:");
const explorer = read("../src/components/lens/CycleLensExplorer.tsx");
check("consumes the payload only — never imports the engine", !/from "@\/lib\/cycleLens"/.test(explorer));
check("no threshold mechanics in the component", !/LENS_THRESHOLDS/.test(explorer));
check("quotes the engine's sentences verbatim", /payload\.sentences\[/.test(explorer));
check("quotes the engine's current-future reason", /currentFutureReason/.test(explorer));
check("range input is the canonical control", /type="range"/.test(explorer) && /aria-label="Cycle day"/.test(explorer));
check("aria-valuetext narrates day + date", /aria-valuetext=/.test(explorer));
check("live region updates at an interaction boundary", /aria-live="polite"/.test(explorer) && /setTimeout/.test(explorer));
check("history updates via replaceState, never a navigation", /replaceState/.test(explorer) && !/router\.push|useRouter/.test(explorer));
check("pointer scrubbing is an enhancement, not the only way in", /onPointerDown/.test(explorer) && /type="range"/.test(explorer));
check("chart paths memoised — no per-scrub recompute", /useMemo\(/.test(explorer));
check("unavailable forward windows render as a state, not an omission", /not observable/.test(explorer));
check("beyond-current state is explicit and unprojected", /has not reached day/.test(explorer) && /never projected/.test(explorer));
check("lifecycle shapes the treatment (standing quiet, fresh accented)", /standing/.test(explorer) && /LIFECYCLE_EYEBROW/.test(explorer));
check("cycles are named, never colour-only", /"Now"/.test(explorer) && /c\.year/.test(explorer));

console.log("Page contracts:");
const page = read("../src/app/cycle-dashboard/page.tsx");
check("server-readable ?day= initial state", /searchParams/.test(page) && /parseLensDay\(/.test(page));
check("canonical route metadata", /canonical: "\/cycle-dashboard"/.test(page));
check("orientation before interaction (price, day, phase, health)", /BTC price/.test(page) && /Cycle day/.test(page) && /Phase/.test(page) && /Market health/.test(page));
check("day discloses its asOf via the CD0 pattern", /cycleDayAsOf\(\)/.test(page) && /LastUpdated/.test(page));
check("market health colours come from the canonical band", /scoreBand\(/.test(page) && !/score\s*>=\s*\d/.test(page));
check("the standing close is present", /Historical context, not a prediction\./.test(page));

console.log("Pro early-access seam:");
const pro = read("../src/components/lens/ProEarlyAccess.tsx");
check("reuses the existing durable capture endpoint", /\/api\/subscribe/.test(pro));
check("distinct measurable source cohort", /pro-early-access/.test(pro));
check("reuses the subscription decision contract", /decideFromResponse/.test(pro));
check("only the existing analytics events fire", /subscription_submit_attempt/.test(pro) && /d\.analyticsEvent/.test(pro) && (pro.match(/track\(/g) ?? []).length === 3);
check("honest about being a future feature", /doesn(?:'|&apos;)t exist yet/.test(pro));
check("honest that joining starts the Daily Brief", /Daily Brief/.test(pro) && /unsubscribe anytime/i.test(pro));
check(
  "no payment claim, no gating in the member-facing copy",
  !/price|checkout|stripe|payment|unlock/i.test((pro.match(/"[^"\n]*"|`[^`\n]*`|'[^'\n]*'/g) ?? []).join(" ")),
);

console.log("Routing and retirement:");
const nav = read("../src/components/navItems.ts");
check("nav points at /cycle-dashboard", /href: "\/cycle-dashboard"/.test(nav));
check("no nav entry for /replay remains", !/"\/replay"/.test(nav));
const config = read("../next.config.js");
check("/replay 308-redirects into the dashboard", /source: "\/replay",\s*destination: "\/cycle-dashboard", permanent: true/.test(config.replace(/\n\s*/g, " ")));
check("the replay page is gone", !existsSync(join(__dirname, "../src/app/replay")));
check("the CycleReplay component is gone", !existsSync(join(__dirname, "../src/components/CycleReplay.tsx")));
check("sitemap lists the dashboard, not /replay", /"\/cycle-dashboard"/.test(read("../src/app/sitemap.ts")) && !/"\/replay"/.test(read("../src/app/sitemap.ts")));
check("homepage signature card points at the dashboard", /href="\/cycle-dashboard"/.test(read("../src/app/page.tsx")));

// ── 3 · Language ────────────────────────────────────────────────────────────
console.log("Language scan (new surfaces):");
const BANNED = [
  /\blikely\b/i, /\bsuggests?\b/i, /\bbullish\b/i, /\bbearish\b/i, /\bbuy\b/i, /\bsell\b/i,
  /\bsupport\b/i, /\bfloor\b/i, /fair value/i, /break-even/i, /price target/i, /\brally\b/i,
];
for (const [name, src] of [["page", page], ["explorer", explorer], ["pro seam", pro]] as const) {
  const strings = (src.match(/"[^"\n]*"|`[^`\n]*`|'[^'\n]*'/g) ?? []).join(" ");
  check(`${name} passes the banned-vocabulary scan`, BANNED.every((re) => !re.test(strings)), BANNED.filter((re) => re.test(strings)).map(String));
}

// ── Result ──────────────────────────────────────────────────────────────────
if (failures > 0) {
  console.error(`\n${failures} failure(s).`);
  process.exit(1);
}
console.log("\nAll cycle-dashboard tests passed.");
