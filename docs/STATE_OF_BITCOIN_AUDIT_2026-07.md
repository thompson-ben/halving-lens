# /state-of-bitcoin — "Documenting the Cycle" Weekly Operating System Audit (July 2026)

> Panel brief: on-chain analyst, macro economist, ETF specialist, institutional researcher,
> data scientist, product/UX/IA, dataviz expert, TV producer, documentary director,
> broadcast presenter, YouTube growth consultant, cognitive psychologist, beginner educator.
> Objective: make this the page you open every Wednesday, press Record, and deliver a 5–8 min
> episode with no notes. Audited from the deployed code (`state-of-bitcoin/page.tsx` + its full
> intelligence layer: `stateOfBitcoin.ts`, `episodeBrief.ts`, `snapshot.ts`, `metricChange.ts`,
> `storyEngine.ts`/`chartOfWeek.ts`, `pathExplorer.ts`, `WhereAreWe`, `PresenterMode`, plus the
> overlapping `/weekly` product).

---

## The central finding

**This is a daily page being asked to do a weekly job.** The eyebrow says "Daily Bitcoin market
analysis." The subtitle says "Understand *today's* market in two minutes." Section 01 is
"*Today's* verdict." The engine (`todaysVerdict()`, `snapshotContext()`, `metricChange`) is built
around *today vs yesterday* with 7-day deltas bolted on. Meanwhile the actual weekly narrative
brain — `weeklyBiggestStory()`, executive summary, week-over-week deltas vs the last archived
weekly, "week ahead" — lives on a *different* page (`/weekly`, `weekly.ts`) that has no presenter
mode. On camera every Wednesday you will say "this week" while the screen says "today," and your
strongest weekly storytelling assets never appear in frame. Until the page becomes **time-aware**
(a weekly lens, at minimum inside presenter mode), it cannot be the definitive weekly briefing.

**The second structural problem: a video page with one chart.** The only live chart on the page is
the Historical Path Explorer. "Chart of the week" — the section literally named for a chart — is a
text card ending in "View the live chart →" (`page.tsx:328-344`). A presenter cannot show the
week's most important chart without navigating away mid-recording. For YouTube, that is fatal.

**The third: the teleprompter is on camera.** The talking-points panel renders as a page section
between the hero and Section 01 (`page.tsx:201-241`). In presenter mode you record the screen —
so your notes are burned into the footage, or you must scroll past them awkwardly on camera.

Everything else below is refinement. These three are the spine.

---

## SECTION 1 — Does the page tell the story of the last 7 days?

**Partially, and by accident.** What it can answer: what the core readings did over 7 days
(`weekChangeSummary`: "2 improved · 1 weakened · 3 unchanged"), which bands were crossed
(`snapshotWhatChanged` with real materiality thresholds), the week's ETF net demand, and what
history did from this exact cycle day. That's a genuinely strong quantitative skeleton.

**What's missing for "what happened in Bitcoin this week?":**
- **Events.** The page contains zero qualitative happenings — no news, no regulation, no corporate
  treasury moves, no macro prints, no "the Fed said / an ETF filed / a country announced." A
  viewer asking "what happened this week" mostly means *events*; the page only answers *readings*.
- **Causality.** Nothing links moves to reasons. "ETF demand +$1.2B" — because of what?
  Market Health has a "led by" driver clause (`metricChange.ts:239-258`) — that's the seed of
  causality; nothing else has it.
- **Memory.** No "last Wednesday we said X — here's what actually happened." The archives to power
  this exist (50 briefs, 4 weeklies, `weekly.ts` already computes WoW deltas) but the page has no
  since-last-episode diff. A *documentary series* lives on continuity; this page has amnesia.
- **What's unnecessary:** nothing is filler, but two sections are mispositioned for the job:
  the six-card scoreboard as a flat grid (evidence without hierarchy) and Research corner when the
  latest finding is weeks old (it currently always shows the same 2026-06-30 finding — a weekly
  show re-presenting month-old research every episode reads as stale).

## SECTION 2 — Narrative flow

Current order: Hero → Where are we? → (talking points) → 01 "What does that mean?" → 02 "Why?"
(scoreboard) → 03 "What changed this week?" → 04 "How has history behaved?" → 05 Chart of the week
→ 06 Research → 07 Watching.

**Problems:**
1. **Section 01 answers a question nobody asked yet.** "What does that mean?" precedes any *that*.
   The verdict is a conclusion delivered before the story — documentary structure inverted.
2. **"What changed this week" (the actual news) comes fourth.** In any newsroom the week's biggest
   change IS the open. The engine even knows the biggest story (`storyEngine().top`, with
   editorial-importance scoring and a dominance rule) — and the page buries its output at #05 as
   a text card.
3. **Chart of the week after the history section** breaks the evidence chain: story → evidence →
   history is natural; story → history → story-chart is not.
4. **No ending.** The page stops at "What we're watching" then dissolves into share widgets. No
   recap, no single-sentence takeaway, no sign-off, no "see you next Wednesday." Episodes will
   end weakly every single week.
5. Scrolling-as-recording *almost* works because SectionHead numbering (01–07) gives chapter
   structure — good instinct, wrong order.

**Ideal order (detail in Section 15):** Cold open (week's lead story + price/week move) → Where
are we (signature ring) → Since last Wednesday (diff board) → The lead story WITH its chart →
The evidence scoreboard (ranked) → Has this happened before (match + path explorer) → What didn't
change → (Research, only when new) → Watching next week (triggers) → Sign-off (one sentence + hook).

## SECTION 3 — Presentation flow (producer's cut)

Your proposed structure (What happened / Why / What changed / What didn't / History / Watch next)
is close. The producer's revision for a returning weekly audience:

1. **Cold open (0:00–0:30)** — hook, not context: the single most surprising number of the week.
2. **Title beat + orientation (0:30–1:15)** — the ring: "Day N, chapter X. Documenting cycle 5,
   week 60."
3. **Continuity (1:15–2:00)** — "Last week we were watching Y. Here's what it did." This is what
   makes it a *series* rather than 52 disconnected dashboards.
4. **The lead story + chart (2:00–3:30)** — one story, one chart, on screen.
5. **The scoreboard sweep (3:30–4:30)** — fast pass over the six readings, ranked, biggest mover
   first. What changed AND what didn't (stability is information).
6. **History's answer (4:30–6:00)** — closest match, path explorer, "N of 3 prior cycles were
   still climbing from here."
7. **Watch next (6:00–7:00)** — 2–3 triggers with explicit thresholds (the `trigger` field is
   already perfect for this).
8. **Sign-off (7:00–7:30)** — verdict AS the closer (move `todaysVerdict` here), one-liner,
   next-week hook, CTA.

"Why did it happen?" deserves its own beat only when the engine can support it honestly —
today it can't (see Section 12); until then fold causal notes into the lead story.

## SECTION 4 — Advanced vs beginner

- **Where are we? ring/journey:** beginner gold — the best beginner asset on the site. Advanced
  users lose nothing (it's 10 seconds). Keep, always first.
- **Verdict:** beginner-friendly plain English (the `article()` a/an tuning for spoken delivery is
  a lovely broadcast detail). Advanced users will want the numbers behind each clause — link each
  clause to its metric card (anchor links) instead of leaving it as prose.
- **Scoreboard cards:** `metricMeaning()` one-liners serve beginners well ("Historically stronger
  than 62% of tracked days"). Weaknesses: band labels ("Historically Attractive", percentiles) get
  no on-hover/tap explainer; beginners must leave the page to learn what the Accumulation Index
  is. Add a one-tap "What is this?" reveal per card (progressive disclosure — one content, two
  depths; no duplication).
- **Path explorer:** advanced users respect the honesty (n=3 caveats, dashed past-peak lines —
  genuinely best-in-class integrity). Beginners need one framing sentence *above* the chart:
  "Each grey line is what actually happened after this exact point in a past cycle."
- **What we're watching:** triggers with explicit band edges serve both audiences perfectly —
  the strongest dual-audience section on the page.
- **Missing for advanced users entirely:** derivatives, funding, volatility, on-chain flows,
  dominance, macro. A 10-year veteran gets nothing here they didn't get from the beginner layer.
  Solution: an "advanced strip" (collapsed by default, expanded in a `?depth=pro` view) rather
  than more sections.

## SECTION 5 — Visual hierarchy

Typography, spacing, and card language are excellent — presenter-mode CSS (13px axis ticks, calmer
grids, larger paddings) shows real broadcast thinking. But the page fails the five-second test:

- **Biggest weekly story?** Not identifiable. Six equal cards + equal-weight sections. The engine
  *ranks* stories; the layout doesn't. The lead story needs a visually dominant hero card.
- **Biggest positive / biggest risk?** Not identifiable — tones exist (teal/red) but no section
  labelled or sorted by it. A two-slot "Bull of the week / Bear of the week" pairing would fix it
  in one card.
- **Biggest change?** `weekChange.headline` is a small pill ("2 improved · 1 weakened…") — a
  count, not a story. Promote the top-weighted `snapshotWhatChanged` item to a headline.
- **Most important chart?** The section named "Chart of the week" contains no chart.
- **Numbering:** 01 "What does that mean?" referencing content *above* it (WhereAreWe intervenes
  between hero and 01) is an IA off-by-one; the numbered chapters should start where the story starts.
- **Copy bug, visible on the page:** the Accumulation context stat renders sub-label
  "more attractive than of weeks" — a broken template (should read "more attractive than N% of
  weeks", `page.tsx:303`). On your flagship page, on camera, every week.

## SECTION 6 — Storytelling (section-by-section verdict)

| Section | What story does it tell? | Verdict |
|---|---|---|
| Where are we? | "You are here in a known journey" | **Keep — the signature** |
| Talking points panel | (production tooling, not story) | **Keep but move off-canvas** (drawer/overlay/second screen) |
| 01 Verdict | "Here's what it all means" | **Keep, move to the END** — it's a closer, not an opener |
| 02 Scoreboard | "Here's the evidence" | **Keep, rank by materiality** — flat grid tells no story |
| 03 What changed | "Here's the news" | **Keep, promote to the open**, lead item as headline |
| 04 History | "You've been here before" | **Keep — core franchise value** |
| Historical range card | "The honest envelope" | **Keep** (great risk framing) |
| 05 Chart of week | "The week's one chart" | **Redesign: embed the chart.** As a text card it tells no story |
| 06 Research | "We do original work" | **Conditional: only when published ≤14 days ago**, else swap for an archive/evergreen beat |
| 07 Watching | "Here's next week's setup" | **Keep — also your next-episode hook** |
| FlagshipShare/Journey | (distribution) | Keep off presenter mode (already correct) |

Nothing deserves outright deletion; two things deserve demotion (research when stale, verdict as
opener) and one thing needs to become real (the chart).

## SECTION 7 — Weekly relevance

Against the five questions (changed? / why? / matter? / before? / next?): the scoreboard,
what-changed, history and watch sections all pass. **Fails:** "why did it change" has no home
anywhere (only Market Health's "led by" clause gestures at it); "does it matter" is answered
mechanically (materiality thresholds) but never editorially ("this is the third consecutive week
of…"); and the page cannot say **"has this happened before *within this cycle*"** — it compares
to prior cycles but not to its own archive ("the last time sentiment was here was 9 weeks ago,
and here's what followed" — computable from the 50 stored briefs today).

## SECTION 8 — Historical context

The franchise strength, and mostly delivered: percentile framing on every metric, the closest
match with per-factor closeness (≥80% threshold — honest), the path explorer with real forward
paths, diminishing-returns only asserted when strictly monotonic. Gaps: the ETF card has no
history by definition — say so on the card ("new this cycle — no precedent," which IS the
historical context, and `whatsDifferent` already generates this sentence elsewhere); the
what-changed list gives this week's moves no historical rank ("the biggest weekly Market Health
move since March" — computable from stored history); sentiment's short record (2018+) deserves
its caveat on-card, not only in research pages.

## SECTION 9 — Data visualisation

**Historical Path Explorer** — already better than most Glassnode charts on honesty. To reach
Bloomberg/FT grade:
- **Direct-label the lines** (Cycle 2 / Cycle 3 / Cycle 4 at line ends) instead of a legend —
  FT rule one; also essential on video where hovering isn't available to the viewer.
- **Annotate events on the paths**: each prior cycle's peak (date + multiple), the halving marker.
  Presenters narrate annotations; naked lines force the presenter to carry everything.
- **Assertive chart title** (FT style): not "Historical Path Explorer" but the sentence the chart
  proves — e.g. "Two of three prior cycles were still climbing from this point."
- **"This week" marker**: highlight the last 7 days of the arriving line so the weekly episode has
  a visual anchor for "here's the week we just lived."
- **Sparklines** (30-day, on cards): add a faint band/e.g. dotted 7-day-ago reference so a flat vs
  falling week is legible at a glance; right now they're decoration at 108×30px.
- **The ring**: consider a tiny "last week" ghost tick behind the current marker — instant
  "we moved this much" on your signature visual.
- **Chart of the week**: once embedded (see P0), it needs the same treatment — title-as-claim,
  annotated, current-week highlighted.

Would Bloomberg improve it? They'd add annotations and direct labels. Would FT? Assertive titles
and fewer decimals. Would Glassnode? More metrics but *less* honesty. Steal the first two, skip
the third.

## SECTION 10 — Presenter experience

What already exists is rare and good: chrome hiding, safe-area guides (title/action), keyboard
shortcuts, broadcast-size chart type, a 7-part running order with data-gated talking points, and
deterministic copy (the site will never contradict your voiceover — a genuinely unique guarantee).

**Where you'd stall mid-recording:**
1. **Transitions are unwritten.** Between 02→03 and 04→05 there is no bridging language on the
   page. Fix: give every SectionHead an optional presenter-only "bridge line" (one clause, e.g.
   "So that's the evidence — but what actually changed since last Wednesday?"). Prompts, not scripts.
2. **The talking points are at the top only.** By section 05 they're four screens away. Fix:
   presenter-mode floating mini-prompt (current section's one-line cue in the transport bar), or a
   QR in the transport bar that opens `episodeBriefText()` on your phone (second-screen autocue).
3. **No pacing.** 5–8 minutes is asserted nowhere. Fix: per-section target durations in the
   transport bar (the `reel.ts` storyboard already proves the per-scene-duration pattern in this
   codebase) and an elapsed timer.
4. **Dead ends**: Chart of the week says "View the live chart →" — on camera that's a stall.
5. **The stale-research stall**: presenting the same finding for the 4th consecutive week forces
   improvisation ("as covered before…"). Gate the section.
6. **No cold-open cue.** `episode.opening` is good radio ("Bitcoin is $X, down 2.1% on the week,
   at day N…") — but it's the *second* thing a YouTube video needs. Generate a hook line first
   (the storyEngine's top headline is exactly this: "Institutions Bought $1.2B This Week").

## SECTION 11 — Viewer engagement (5–8 min retention)

- **Increase engagement:** the ring ("you are here" is an instant-orientation dopamine hit), the
  path explorer (genuinely novel), the watch-triggers (sets up next episode = subscribe driver),
  band-crossing flags (◆ events feel like news).
- **Reduce engagement:** six near-identical metric cards read aloud in sequence (the #1 drop-off
  risk — rank them and sweep fast); the text-only chart-of-week card (visual anticlimax at the
  story's peak); research corner when stale.
- **Repetitive:** verdict + context paragraph + weekly summary all restate band labels; in a
  spoken episode you'll say "historically attractive" four times. Vary via the summary templates.
- **Unnecessary statistics:** percentile + band + score on one card is two too many for viewers
  (keep all three on hover/pro depth).
- **Animation candidates:** the ring's weekly tick advancing (before/after); the path-explorer
  envelope drawing on; a 7-day diff wipe on each card (number rolls from last-Wednesday value to
  today's). All are before/after comparisons — the native grammar of a weekly episode.

## SECTION 12 — Missing content (challenge every omission)

Justified omissions (keep out): options positioning, whale wallets, developer activity, most
altcoin/dominance detail — off-thesis or unverifiable at your data budget; adding them would cost
trust for marginal story value. **Unjustified omissions, in priority order:**

1. **A weekly events timeline** (macro prints, regulation, corporate/ETF news, network events).
   This is THE gap between "readings page" and "what happened this week." Even 3 hand-curated
   dated bullets/week (founder-entered, like `SNAPSHOT_PIN`) transforms the episode. The
   intelligence-events engine already detects data-driven events; add a manual editorial lane.
2. **Macro strip** (DXY, real yields, liquidity proxy) — one row, weekly deltas. Bitcoin's week
   is not explicable without it, and the macro economist on this panel refuses to sign off without it.
3. **Volatility** (realized 30d + percentile) — cheap to compute from data you hold; instantly
   contextualizes "quiet week" claims.
4. **Funding/basis** (one number each) — the fast/leveraged money counterweight to slow ETF money.
   Free from exchange APIs.
5. **Miner behaviour** — partially exists in `cycleSummary.watchSignals` (miner stress) but never
   surfaces on this page; one card in the pro strip.
6. **Exchange balances / stablecoin supply** — valuable but requires paid data; defer until the
   Glassnode key decision (flagged in the growth audit) resolves.
7. **Search trends** (Google Trends "bitcoin") — free, weekly-native, beginner-legible sentiment
   confirmation.

## SECTION 13 — Weekly insights (one sentence / three bullets / five charts)

- **One sentence:** yes — `todaysVerdict()` does this today (though it's a *today* sentence; make
  it a *week* sentence on Wednesdays).
- **Three bullets:** yes — `weeklyContent().executiveSummary` generates five; the best three
  belong on this page. Currently they render only on `/weekly`.
- **Five charts:** **no — the page has one.** The five that should exist inline: path explorer,
  chart-of-the-week (embedded), ETF 30-day flow bars, sentiment vs price 90d, and the ring.
  Until then the page cannot support a visual summary of the week, which is the entire premise
  of a YouTube episode.

## SECTION 14 — Production quality: "Bloomberg Terminal for weekly Bitcoin videos"?

Not yet, for exactly four reasons: (1) daily framing on a weekly show; (2) one chart; (3) no
episode memory/continuity; (4) no production metadata out the other side — a Bloomberg-grade
workflow ends with the episode's *artifacts*: chapter timestamps for the YouTube description,
title/thumbnail candidates, description text, pinned-comment copy. `episodeBriefText()` and
`reel.ts` prove the codebase can generate all of this deterministically; nothing generates it for
the 5–8 min episode. What IS already Bloomberg-grade: determinism (screen never contradicts
narration), data honesty (past-peak dashing, materiality gates), presenter chrome, and the
safe-area guides — no competitor page has any of this.

## SECTION 15 — The perfect weekly flow (the spec)

On Wednesdays (or `?presenter=true&lens=weekly`), the page composes as:

1. **COLD OPEN — "The Week's Story"** hero card: storyEngine's top headline as an H1 claim
   ("Institutions Bought $1.2B This Week"), price + week move beneath, tone-colored. Presenter
   cue: read the claim, tease the evidence.
2. **ORIENTATION — Where are we?** ring + journey, with last-week ghost tick. Cue: "Day N,
   chapter X — episode NN of Documenting the Cycle."
3. **CONTINUITY — "Since last Wednesday"** diff board: each core reading's value *then vs now*
   (from archived briefs), plus "Last episode we were watching: [item] → [what happened]."
   The signature section no competitor can fake without an archive.
4. **THE LEAD STORY — embedded chart** (the storyEngine top's chartCard rendered inline),
   assertive title, annotated, current week highlighted; why-bullets and takeaway beneath.
5. **THE SWEEP — evidence scoreboard**, ranked by materiality, biggest mover first, each card
   showing the then→now roll; a final "unchanged" cluster collapsed into one line
   ("Three readings held steady — stability is itself information").
6. **HISTORY'S ANSWER** — closest match + why-this-match chips + path explorer + historical
   range card (current section 04, kept nearly as-is — it's the franchise).
7. **EVENTS & MACRO STRIP** — 3 dated editorial bullets + DXY/yields/vol one-liners.
8. **RESEARCH CORNER** — only if a finding is ≤14 days old; otherwise an "from the archive:
   this week in cycle 4" beat (auto-generated from stored data — cheap and evergreen).
9. **WATCHING NEXT WEEK** — 3 ranked triggers with explicit thresholds; presenter cue frames
   these as "what we'll check in next Wednesday's episode" (the retention hook).
10. **SIGN-OFF** — the verdict, recomposed for the week; one-sentence takeaway in display type;
    "Next Wednesday: …" and the subscribe beat. Below it (non-presenter only): share kit, journey,
    feedback.

Transitions: every SectionHead gains a presenter-only bridge line. Transport bar gains: section
cue, per-section target duration, elapsed timer, and a "copy episode pack" button (script +
chapters + description + title candidates).

## SECTION 16 — Future ideas (challenged)

- **Automatic weekly timeline** — auto-place the week's data events (band crossings, streaks,
  flow records) on a dated strip; founder adds editorial events. *Challenge: pure auto-timelines
  feel robotic — the hybrid (auto + curated) is the defensible version.* Worth it.
- **"This week in previous cycles"** — same 7 calendar days of cycles 2–4 at this cycle day:
  what price/sentiment did. *Challenge: n=3 and mostly noise — gate on "only when something
  notable happened," else skip silently.* Worth it, gated.
- **"What surprised us" / "What invalidated last week's concerns"** — computable: compare last
  week's watch-triggers against outcomes ("we said watch 75 on F&G; it crossed").
  *Challenge: none — this is the highest-value idea in the list because it's accountability
  television: publicly checking your own prior statements is the trust moat on video.* Build first.
- **Bull case / bear case ledger** — two columns, items entering/leaving each week with dates.
  *Challenge: risks predictive framing; survives if items are strictly historical-percentile
  statements.* Worth it, carefully worded.
- **Episode archive page** (`/documenting-the-cycle`): every episode's date, one-sentence verdict,
  the video embed, and what changed since — becomes the series' public spine and its SEO surface.
- **Auto chapter/timestamp + description generator** — extend `episodeBriefText()` with target
  durations → YouTube chapters ("0:00 Cold open · 0:45 Where are we…"). Trivial, high leverage.
- **Key-moment flags for editing** — presenter hits a key on a strong beat; timestamps export for
  the edit/shorts cut. *Challenge: only valuable if shorts are actually produced — pairs with
  `reel.ts`, which already exists.* Worth it once cadence is real.
- **Rejected:** live streaming overlays, AI-generated voiceover scripts (would break the
  deterministic-honesty brand), viewer polls on-page (community belongs off-page for now).

## SECTION 17 — Scores

| Dimension | /10 | Note |
|---|---|---|
| Weekly usefulness | 5 | Daily engine, weekly ambition; the weekly brain lives on another page |
| Narrative | 6 | Chapters exist; order inverted; no ending |
| Visual design | 8 | Premium, calm, broadcast-conscious |
| Presenter experience | 6.5 | Presenter mode is rare and real; no pacing, notes on camera, dead ends |
| Historical context | 8 | Percentiles, matches, honest paths — the franchise |
| Beginner friendliness | 7 | Ring + plain-English meanings; jargon lacks in-place explainers |
| Advanced usefulness | 5 | Nothing beyond the beginner layer; no vol/funding/macro/on-chain |
| Storytelling | 5.5 | Data speaks; nobody narrates; no memory between episodes |
| Educational value | 7 | metricMeaning + honest caveats teach constantly |
| YouTube readiness | 4.5 | One chart, notes in frame, no chapters/pacing/hook |
| Industry uniqueness | 7 | Deterministic page-as-teleprompter is genuinely novel; not yet exploited |

## FINAL — What I would build (first principles)

**"The Wednesday Machine":** one page with two faces. The *reader* face is the daily State of
Bitcoin (largely today's page, reordered). The *studio* face (`?presenter=true&lens=weekly`) is a
weekly episode instrument: cold-open story card, since-last-Wednesday diff, embedded lead chart,
ranked sweep, history's answer, events strip, watch-triggers-as-next-episode-hook, sign-off — with
off-canvas prompts, per-section pacing, and a one-click episode pack (script, chapters, title
candidates, description, thumbnail PNG via the existing OG pipeline). Every sentence deterministic
from the same snapshot the page renders — the property no competitor has: **the screen can never
contradict the presenter.** The series then compounds: each episode's verdict archived, each
week's triggers publicly checked against outcomes the following week ("what surprised us"),
building the only thing that matters long-term — a dated, auditable track record on video.

---

## Priorities

**P0 — before next episode** (all ≤1 day each except the chart embed):

| Rec | Viewer impact | Presenter benefit | Complexity | Why it matters |
|---|---|---|---|---|
| Weekly lens: presenter mode swaps "today" copy → "this week" (verdict, hero, section notes) | High — episode finally sounds coherent | High — no live translation in your head | Low (template variants exist in the engines) | The show is weekly; the page must speak weekly |
| Embed the chart-of-week chart inline (render `chartCard` on-page) | Very high — the visual peak of every episode | High — no mid-recording navigation | Medium | A video page must show its chart |
| Move talking points off-canvas (drawer + transport-bar cue, or phone QR) | High — notes no longer in frame | High — prompts follow you down the page | Low–Med | The teleprompter is currently on camera |
| Fix "more attractive than of weeks" copy bug (`page.tsx:303`) | Medium — visible flaw on flagship | — | Trivial | Broken copy on camera weekly |
| Add sign-off block (verdict moved to end + one-liner + "next Wednesday" hook) | High — episodes stop ending limply | High — a scripted landing | Low | Retention and subscribe conversion live in the last 30s |
| Gate Research corner on findings ≤14 days old | Medium — no stale beat | Medium — removes an improvisation trap | Trivial | Freshness is the premise of a weekly |

**P1 — high impact (next 2–4 weeks):**

| Rec | Viewer impact | Presenter benefit | Complexity | Why it matters |
|---|---|---|---|---|
| "Since last Wednesday" diff board (from archived briefs/weeklies) | Very high — series continuity | Very high — episode 2's opening writes itself | Medium | Memory turns a dashboard into a documentary |
| Lead-story hero card (storyEngine top headline as cold open) | High — a hook in the first 5 seconds | High — the open is chosen for you | Low | YouTube retention is decided before 0:30 |
| Reorder sections to the Section 15 flow; bridge lines on SectionHead | High | Very high — transitions stop stalling | Medium | Narrative order is the product |
| Rank the scoreboard by materiality; collapse "unchanged" into one line | Medium | High — fast sweep, no six-card monotone | Low | Six equal cards is the retention dip |
| Episode pack generator (chapters/timestamps, description, title candidates) | Medium (better metadata → CTR) | Very high — post-production vanishes | Low–Med (extend `episodeBriefText`, copy `reel.ts` timing pattern) | Chapters + strong titles are free YouTube growth |
| Pacing: per-section target durations + elapsed timer in transport bar | Indirect | High — hits 5–8 min reliably | Low | Consistent length is a channel discipline |
| Events strip: 3 founder-curated dated bullets + auto data-events | Very high — answers "what happened" literally | High — the news beat exists | Medium | The single biggest content gap |

**P2 — nice enhancements:**

| Rec | Viewer impact | Presenter benefit | Complexity | Why it matters |
|---|---|---|---|---|
| Direct-label path-explorer lines + peak/halving annotations + assertive titles | Medium-high | Medium — chart narrates itself | Medium | FT/Bloomberg-grade legibility on video |
| "What surprised us / trigger check" (auto-compare last week's watch items vs outcomes) | High — accountability TV | High — a beloved recurring segment | Medium | Publicly auditing yourself is the trust moat |
| Macro + volatility strip (DXY, yields, realized vol percentile) | Medium | Medium | Medium (new data pulls) | The week is not explicable Bitcoin-only |
| Card-level "What is this?" progressive disclosure | Medium (beginner retention) | Low | Low | Serves both audiences without duplication |
| "This week" highlight on arriving line + last-week ghost tick on ring | Medium | Medium | Low | Weekly visual grammar |
| Sparkline reference lines (7d-ago marker) | Low-med | Low | Low | Makes 108px sparks legible |
| Funding/basis + miner card in a collapsed pro strip | Medium (advanced retention) | Low | Medium | Gives veterans a reason to stay |

**P3 — future vision:**

| Rec | Viewer impact | Presenter benefit | Complexity | Why it matters |
|---|---|---|---|---|
| `/documenting-the-cycle` episode archive (verdict + embed + diff per episode) | High long-term | Medium | Medium | The series' public spine, SEO surface, and track record |
| Bull/bear ledger with dated entries/exits | Medium-high | Medium | Medium | Structured honesty, screenshot-friendly |
| "This week in previous cycles," gated on notability | Medium | Medium | Medium | Franchise deepener; skip silently when dull |
| Key-moment flagging → edit/shorts timestamps (pairs with `reel.ts`) | Medium | High at scale | Medium | Turns each episode into 3–5 shorts cheaply |
| Exchange balances / stablecoins (post-Glassnode-key) | Medium | Low | High | Only after the data-integrity decision |
| Animated weekly transitions (ring tick, envelope draw-on, number rolls) | Medium | Low | Med-high | Polish after the structure is right |

*Prepared 2026-07-23 against `main` @ 2026-07-21. Everything cited is verifiable in the referenced
files; estimates are directional. Historical context, not prediction — including about YouTube.*
