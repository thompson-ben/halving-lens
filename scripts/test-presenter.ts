// Deterministic tests for Presenter Mode 2.0 (SoB 2.0, PR-SB5): the episode
// script as a pure projection of the weekly briefing model, the running order
// as static presentation-free metadata, the model-owned spoken bridges, and
// the HUD as a props-only consumer.
// Run: npm run test-presenter

import { readFileSync, existsSync } from "node:fs";
import { presenterEpisode, presenterSections } from "../src/lib/presenterEpisode";
import { PRESENTER_RUNNING_ORDER } from "../src/lib/presenterScript";
import { weeklyBriefing } from "../src/lib/weeklyBriefing";
import { PRICE_ARCHIVE } from "../src/lib/data/priceArchiveData";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };

const pageSrc = readFileSync("src/app/state-of-bitcoin/page.tsx", "utf8");
const scriptSrc = readFileSync("src/lib/presenterScript.ts", "utf8");
const episodeSrc = readFileSync("src/lib/presenterEpisode.ts", "utf8");
const hudSrc = readFileSync("src/components/sob/PresenterHud.tsx", "utf8");

// ── The running order ───────────────────────────────────────────────────────

assert(PRESENTER_RUNNING_ORDER.length === 6, "six parts: the front page and the five acts");
assert(PRESENTER_RUNNING_ORDER[0].id === "today", "the episode opens on the front page");
assert(PRESENTER_RUNNING_ORDER.every((s) => pageSrc.includes(`data-sob-section="${s.id}"`)), "every part points at a section that exists on the page");
{
  const total = PRESENTER_RUNNING_ORDER.reduce((n, s) => n + s.targetSeconds, 0);
  assert(total >= 300 && total <= 480, `the targets sum to a 5–8 minute episode (got ${Math.round(total / 6) / 10} min)`);
}
assert(!/bridge/.test(JSON.stringify(PRESENTER_RUNNING_ORDER)), "the running order carries no transition lines of its own — the model's bridges are the only phrasing");
assert(!/weeklyBriefing|marketMovers|PRICE_ARCHIVE|snapshot/.test(scriptSrc), "the running order stays free of data imports so the client HUD can consume it");

// ── Sections view: the model's bridges, joined ──────────────────────────────

const sections = presenterSections();
const brief = weeklyBriefing();

assert(sections.length === PRESENTER_RUNNING_ORDER.length, "the sections view covers the whole running order");
for (let i = 0; i < sections.length - 1; i++) {
  assert(sections[i].bridge === brief.bridges[i], `part ${i + 1}'s spoken bridge IS the model's bridge ${i} — the same line the page prints`);
}
assert(sections[sections.length - 1].bridge === null, "the last act has no bridge — the episode closes on the verdict instead");

// ── The episode script ──────────────────────────────────────────────────────

const script = presenterEpisode();

assert(script === presenterEpisode(), "the script is deterministic");
assert(script.split(brief.verdict).length - 1 === 2, "the script opens on the verdict and closes on the SAME verdict — exactly twice, never a paraphrase");
assert(brief.glance.every((g) => script.includes(g.answer)), "every front-page answer appears verbatim — the script quotes the model, it does not restate it");
assert(brief.points.points.every((p) => script.includes(p.headline)), "all five points appear by their canonical headlines");
assert(brief.watchItems.every((w) => script.includes(w.title)), "every watch item appears with its objective trigger");
assert([0, 1, 2, 3, 4].every((n) => script.includes(brief.bridges[n])), "every spoken bridge in the script is the model's own line");
for (const s of PRESENTER_RUNNING_ORDER) {
  assert(script.includes(s.title.toUpperCase()), `the script carries part "${s.title}"`);
}
assert(script.includes(`as of ${brief.asOf}`), "the script is dated by the briefing, not by a fetch time");
assert(script.trimEnd().endsWith("Historical context. Not prediction. Not financial advice."), "the script ends on the standing close");

// Language safeguards over the full script (cues included). The episode's
// own timing header ("Target 5–8 minutes…") is the one sanctioned use of
// "target" — a duration, not a price; strip it before the vocabulary scan.
{
  const BANNED = [/\bwill\b/i, /\bexpect/i, /forecast/i, /\bshould\b/i, /because of/i, /\bcaused?\b/i, /\bdrove\b/i, /surging|plunging|soar|crash/i];
  assert(!BANNED.some((re) => re.test(script)), "no predictive, causal or hype language anywhere in the script");
  const scanned = script.replace(/Target \d+–\d+ minutes \(\d+:\d+ across \d+ parts\)\./, "");
  const HOUSE = [/\bsupport\b/i, /\bfloor\b/i, /\bfair value\b/i, /\bbreak-?even\b/i, /\btarget\b/i];
  assert(!HOUSE.some((re) => re.test(scanned)), "no banned house vocabulary in the script");
}

// ── One generator, retired cleanly ──────────────────────────────────────────

assert(!existsSync("src/lib/episodeBrief.ts"), "the legacy episode generator is retired, not merely unplugged");
assert(!/episodeBrief/.test(pageSrc), "the page no longer consumes the legacy generator");
assert(/presenterEpisode\(\)/.test(pageSrc) && /presenterSections\(\)/.test(pageSrc), "the page hands the HUD the model's script and sections, computed server-side");

// ── The HUD is a props-only consumer ────────────────────────────────────────

assert(!/from "@\/lib\/(weeklyBriefing|marketMovers|presenterEpisode)"/.test(hudSrc.replace(/import type[^;]+;/g, "")), "the HUD imports no data module — everything it says arrives as props");
assert(/READING_LINE/.test(hudSrc) && /requestAnimationFrame/.test(hudSrc) && /\{ passive: true \}/.test(hudSrc), "act tracking uses the deterministic reading-line rule, frame-throttled and passive");
assert(!/IntersectionObserver/.test(hudSrc), "no intersection bands for a tall act to fall between");
assert(/actElapsed/.test(hudSrc) && /targetSeconds/.test(hudSrc), "the HUD paces the CURRENT act against its own target, not just the whole episode");
assert(/cur\.bridge/.test(hudSrc), "the spoken bridge is on the cue card, not only in the drawer");
assert(/createPortal/.test(hudSrc), "the HUD stays overlay chrome — portaled out of the recorded page");
assert(/INPUT|TEXTAREA/.test(hudSrc), "keyboard shortcuts ignore form fields");

// ── Real-data smoke ─────────────────────────────────────────────────────────

if (PRICE_ARCHIVE.length > 1000) {
  assert(script.length > 800, "the live script is a full episode, not a stub");
  assert(script.split("\n").every((l) => l.length < 400), "no unreadable run-on lines");
}

console.log(failures === 0 ? "\nAll presenter tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
