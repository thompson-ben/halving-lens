# The State of Bitcoin 2.0 — Programme Record

**HalvingLens · halvinglens.com/state-of-bitcoin**
Programme window: PR-SB1 → SB6d (ten pull requests). This document is the permanent record of what changed and why.

---

## What the programme set out to do

The State of Bitcoin was an excellent analytics page: accurate, honest, deterministic. It was not yet a publication. Eight sections each summarised the same week independently; the lead story was chosen by raw movement rather than significance; the presenter needed a separate script; and the surface — 25 font sizes, 54 uppercase labels, 25 bordered cards — read as a dashboard.

The programme's product vision, set by the founder: **"This doesn't look like a crypto website."** A page that is a publication first and an analytics platform second — and simultaneously the working script for the weekly *Documenting the Cycle* episode.

---

## The architecture that made it possible

**One model, named slots.** `weeklyBriefing()` computes the week once: the canonical verdict, five front-page answers, five spoken bridges, the ranked movers, the five talking points, the watch thresholds. The page, the presenter HUD, and the copyable episode script are **three renderers of that one object**. None of them computes or phrases anything of its own — CI fails if the model imports React, if the page consumes a second summary generator, or if the HUD imports a data module.

**Significance over size.** The Market Movers engine ranks all 16 readings by how unusual each move is *within that reading's own history* (equivalent-period distributions, observation floors, honest windows — modelled backfill never grounds a rarity claim). The week RHODL moved at the 97th percentile of its own record, the old page led with ETF flows — sitting at the 41st percentile of theirs. Ranking by significance surfaced what raw movement hid.

**Five generators retired.** `weekOpening`, `weekHeadline`, `snapshotSummary`, `weeklyConclusion`, `episodeBrief` — each an independent summariser that could (and on live data did) contradict the headline. The close that once credited a different leader than the verdict above it is structurally impossible now: the close renders only the verdict it is handed.

---

## Measured impact

| | Before (2 Aug 2026) | After SB6 |
|---|---|---|
| Sections summarising the week independently | 8 | **5 acts, one model** |
| Summary generators that could disagree | 6 | **1** |
| Readings analysed and ranked | 7, by raw movement | **16, by own-history significance** |
| Five questions answered on the first screen | no | **yes (919 px at 1440×1000)** |
| Bordered cards on the page | 26 | **18** |
| Rendered font sizes | 25 | **17** (7 in the SoB tree; rest in multi-page shared components) |
| Eyebrow (label) styles | 6 ad-hoc | **1** |
| Widest prose line | 1,076 px (~150 chars) | **≤601 px (~65–75 chars)** |
| Editorial colour | hard-coded hex ×6 | **one token, one CSS variable** |
| Mobile horizontal overflow | 12 px, four PRs running | **0 px at 360/390** |
| Numbering systems | 3 | **1** (acts 1–5, points 4.1–4.5) |
| Presenter script | separate 7-section generator, out of sync with the page | **a projection of the model; page = running order** |
| CI test suites guarding all of it | 17 | **22** (+ market-movers, talking-points, weekly-briefing, presenter, editorial-system) |

Page height moved from 9.7 to 9.7 screens — deliberately. The objective was never fewer pixels; it was that a reader knows the whole week before scrolling, and that each act opens with air.

---

## The five acts

1. **What changed** — every reading, ranked by significance within its own record; three tiers of weight.
2. **Why this matters** — where the week leaves the market against its Four Reference Prices. Relevance, never cause.
3. **How unusual is it?** — two beats: where we are (and whether the cycle read moved), then how prior cycles behaved from here.
4. **What to remember** — five points (4.1–4.5) chosen by tier and diversity rules, expanded as open prose, tracked by a rail (desktop) or pinned chips (mobile).
5. **What we're watching next** — objective thresholds, last week's outcome held to account, closing on the same verdict the page opened with.

Between the acts: the model's own bridge lines — the same sentences the presenter speaks.

## The presenter workflow

The page **is** the running order. The front page is the episode summary; the HUD shows the current act, its cue, the spoken bridge, and a per-act pace clock against a 5–8 minute target; T/N/P drive the recording from the keyboard; the copyable script quotes the model verbatim and opens and closes on the canonical verdict. On camera, prose steps up ~15% for broadcast legibility. No written script exists anywhere — there is nothing to keep in sync.

## The editorial system (the HalvingLens design language)

Seven named type steps (micro → display, nothing under 10.5 px) · the `editorial` gold token — structure only, never a link, never a value · teal for interaction only · signal colours for data direction only · one eyebrow style · one 68ch reading measure for all running prose · hierarchy from typography, spacing and alignment, never borders or backgrounds. All enforced by `test-editorial-system` in CI, so the discipline outlives the programme.

## Honestly reported, not yet done

- ~10 stray font sizes remain in genuinely multi-page shared components (path explorer, data badge, signup, journey footer) — migrating them belongs to those pages' own editorial passes.
- /price has a pre-existing 32 px overflow at 390 px (chart tab bar + tooltip), logged.
- Broadcast Mode is designed-for but unbuilt: it will be another renderer of `weeklyBriefing()`, not a parallel implementation — the SB5 HUD proved the pattern.

---

*Every claim above is asserted in CI or measured in browser verification; the three-way desktop / mobile / recording-mode comparisons accompany this record. Historical context. Not prediction.*
