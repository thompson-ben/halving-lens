// Deterministic tests for the editorial design system (SB6a): the type
// scale as the only text sizing in the State of Bitcoin tree, the editorial
// colour as a token with exactly one definition per layer, one eyebrow
// style, colour roles (editorial = structure, teal = interaction, signal =
// data), and the single reading measure.
// Run: npm run test-editorial-system

import { readFileSync, globSync } from "node:fs";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

// The page, its own components, and the shared components whose ONLY
// consumer is the State of Bitcoin page (verified by search in SB6d) —
// migrating those redesigns nothing else.
const SOB_TREE = [
  "src/app/state-of-bitcoin/page.tsx",
  ...globSync("src/components/sob/*.tsx"),
  "src/components/journal/JournalMasthead.tsx",
  "src/components/journal/ChapterNav.tsx",
  "src/components/WhereAreWe.tsx",
];
const read = (p: string) => readFileSync(p, "utf8");
const tw = read("tailwind.config.ts");
const css = read("src/app/globals.css");

// ── The type scale ──────────────────────────────────────────────────────────

for (const step of ["micro", "caption", "body", "subhead", "headline", "stat", "display"]) {
  assert(tw.includes(`${step}:`), `the "${step}" step exists in the Tailwind scale`);
}

for (const f of SOB_TREE) {
  const src = read(f);
  const arbitrary = src.match(/text-\[\d+(\.\d+)?px\]/g) ?? [];
  assert(arbitrary.length === 0, `${f.split("/").pop()} uses only the named scale${arbitrary.length ? ` (found ${arbitrary.join(", ")})` : ""}`);
}

// ── One eyebrow style ───────────────────────────────────────────────────────

assert(/\.eyebrow \{/.test(css), "the one eyebrow style is defined once, in CSS");
for (const f of SOB_TREE) {
  const src = read(f);
  const adhoc = src.match(/uppercase[^"`]*tracking-\[|tracking-\[[^"`]*uppercase/g) ?? [];
  assert(adhoc.length === 0, `${f.split("/").pop()} has no ad-hoc eyebrow (uppercase + arbitrary tracking)`);
}

// ── The editorial colour: one definition per layer, structure only ──────────

assert(/editorial: "#d9b96a"/.test(tw), "the editorial token is defined in the Tailwind palette");
assert(/--editorial: #d9b96a/.test(css), "CSS references the colour through one variable");
{
  const cssHexes = (css.match(/#d9b96a|rgba?\(\s*217\s*,\s*185\s*,\s*106/gi) ?? []).length;
  assert(cssHexes === 1, `globals.css contains the raw hex exactly once — the variable definition (found ${cssHexes})`);
}
for (const f of SOB_TREE) {
  const src = read(f);
  assert(!/#d9b96a|217\s*,\s*185\s*,\s*106/i.test(src), `${f.split("/").pop()} reaches the editorial colour only through the token`);
}

// ── Colour roles ────────────────────────────────────────────────────────────

const page = read("src/app/state-of-bitcoin/page.tsx");
assert(/border-editorial\/40 bg-editorial\/\[0\.08\] text-editorial">Priority/.test(page), "the Priority pill is editorial structure, not a teal pseudo-link");
assert(/text-ink-100 tabular-nums">\{w\.current\}/.test(page), "watch-item current values are data (ink, tabular) — not teal");
for (const f of SOB_TREE) {
  const src = read(f);
  // Editorial never dresses an interactive affordance: no editorial-coloured
  // hover state anywhere in the tree.
  assert(!/hover:text-editorial|hover:bg-editorial|hover:border-editorial/.test(src), `${f.split("/").pop()} never uses editorial as a hover affordance`);
}

// ── The reading measure ─────────────────────────────────────────────────────

assert(/measure: "68ch"/.test(tw), "one reading measure is defined (68ch)");
{
  const proseWide = SOB_TREE.flatMap((f) =>
    (read(f).match(/className="[^"]*"/g) ?? [])
      .filter((c) => /max-w-(2xl|3xl)/.test(c) && /text-(body|caption|subhead)/.test(c) && /leading-relaxed/.test(c)),
  );
  assert(proseWide.length === 0, `running prose uses the measure, not ad-hoc widths (found ${proseWide.length})`);
}

console.log(failures === 0 ? "\nAll editorial-system tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
