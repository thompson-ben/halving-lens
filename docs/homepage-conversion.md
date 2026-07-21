# Homepage conversion (PR4 / P4)

Measurable improvements only. Per the brief, **no homepage sections were removed
or restructured** — that is gated on the instrumentation this PR completes.

## What changed

- **P4.1 — Primary hero CTA is now subscription.** The homepage hero's primary
  action changed from "Explore full cycle analysis" (`/price`) to **"Get the free
  daily brief"** (→ `/#subscribe`), with the supporting line *"One clear Bitcoin
  cycle update each morning. No hype. No predictions."* Exploration remains, but
  visually subordinated to a text link.
- **P4.3 — The product is shown early.** The `/free` live `DailyBriefPreview` is
  reused on the homepage as section 3 (right after the signature cycle view),
  framed *"The Bitcoin cycle, explained in one morning brief,"* with its own
  subscribe CTA. Real data, no chart library, no extra client JS.
- **P4.5 — Section instrumentation completed.** `TrackedSection` now also records
  **`section_dwell`** (seconds a section was actually on screen, flushed on
  leave/unmount) in addition to `section_view` and `section_click`. Previously
  only some sections were wrapped; the **hero**, **signature view** and
  **brief-preview** sections are now wrapped too, so every major block reports
  view + dwell + click. Combined with the page-level `engagement` event (time +
  scroll depth) and the `subscription_*` funnel, this is the data set for a
  future, evidence-based simplification.
- **P4.6 — Credibility reducer removed.** The `portfolio_tracking` option was
  removed from `FeatureVote` (portfolio tracking is on the explicit
  do-not-build list — offering to vote for it contradicts the product strategy).
  Honest product status elsewhere (e.g. coming-soon metric pages) is left intact.

## Deliberately deferred (evidence-gated — NOT in this PR)

- **P4.2 — Hero signup A/B (control vs inline one-field form).** Not built. The
  brief says don't commit to an inline hero form without evidence, and P4.5 says
  gather data first. Recommended setup when ready: add a `home_hero` experiment
  to `src/lib/experiments.ts` (`variants: ["cta","inline"]`); `cta` = current
  (scrolls to `#subscribe`), `inline` = a compact one-field form in the hero.
  The variant already rides along on `landing_view`/signup events, so a winner
  can be picked from the existing dashboard.
- **P4.5 — Homepage simplification.** Once section `view`/`dwell`/`click` +
  conversion-after-exposure data has accumulated, propose a separate PR to
  merge/relocate/trim low-value sections toward the target order (hero → signature
  view → brief preview → "what happened next" → flagship teasers → final signup +
  Replay). No sections removed until the data supports it.

## Files
- `src/components/HomeHero.tsx` — subscribe-first hero CTA
- `src/app/page.tsx` — brief-preview section + hero/signature/full-read wrapped in `TrackedSection`
- `src/components/TrackedSection.tsx` — added `section_dwell`
- `src/components/FeatureVote.tsx` — removed `portfolio_tracking`

## Analytics events affected
- **New:** `section_dwell` (`{ section, seconds }`).
- **Wider coverage:** `section_view` / `section_click` now also fire for `hero`,
  `signature-view`, `brief-preview`.
- No change to the subscription funnel events.
