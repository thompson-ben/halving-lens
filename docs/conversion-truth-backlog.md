# Conversion truth & continuity — backlog

Findings from the Conversion, Customer Fit & Feeling audit and Programme 1 that
the founder deliberately placed **out of scope** for Programme 1. Recorded here
so they live in the repository rather than only in a review thread.

Programme 1 itself is complete: the acquisition and onboarding surfaces now
describe the product HalvingLens actually ships. Nothing below blocks that.

---

## R1 · `/derivatives` — truth-language cleanup candidate

**Status:** backlog. Do not fix inside Programme 1.

`/derivatives` is the other `PlannedView` placeholder (noindex, absent from the
sitemap, unlinked from the app). Two problems of the same class Programme 1
removed from the retired `/alerts` page:

- *"when this fades, the cycle leverage unwind has started"* — a predictive
  causal claim, on a page describing a feature that does not exist;
- *"the perpetual-futures lens that turns slow on-chain shifts into tactical
  reads"* — "tactical reads" contradicts the no-trading-signals positioning
  every other surface holds.

**Options when picked up:** rewrite to the honest posture Programme 1 applied
(what runs / what does not exist / one early-access list), or retire the route
with a permanent redirect exactly as `/alerts` was retired. Do not invent a
second waitlist.

---

## R2 · Live Meta creative inconsistencies

**Status:** belongs to the later acquisition / proposition experiment. **Do not
touch** — these are live ad assets.

- `/ads/a` cites *"13+ years of history"*; `/ads/c` cites *"8+ years"* for the
  same claim.
- `/ads/c` (the myth-vs-reality angle) has no matching key in
  `src/lib/freeHeadlines.ts`, so its promise is dropped on arrival and the
  visitor meets the default headline instead — the exact message-match failure
  the allowlist mechanism exists to prevent.
- On-site read-length claims were corrected from 60 to 30 seconds in Programme
  1 to match what the Brief and welcome email already claim; `/ads/a` still says
  *"60-second daily read"* and was deliberately left alone.

Any fix requires a founder decision on creative, and should be sequenced with
the message territories the audit proposed.

---

## R3 · Context Score on member surfaces

**Status:** not a Programme 1 item. Assess separately if member-surface
consolidation is ever commissioned.

Programme 1 removed the retired Context Score from every **acquisition** surface
(`/`, `/free`, `/start`). It remains in two places, deliberately:

- `/dashboard` ("Your HalvingLens") — a member utility page, not acquisition
  proof. It still renders the retired edition engine's snapshot.
- The research and weekly **archives** — these are frozen historical editions.
  A past edition's recorded Context Score is a fact about that edition and must
  not be rewritten. This appearance is legitimate and permanent.

---

## R4 · Founding Member premium commitment — a constraint on Pro

**Status:** standing commitment. Record kept deliberately.

`FOUNDING_MEMBER_BENEFITS` promises, among other things, *"Early access to
Premium features"* and *"Priority access to new indicators and betas"*. These
have been made to the founding cohort (265 active subscribers at the time of
the audit; the limit is `FOUNDING_MEMBER_LIMIT`, default 500).

**This constrains what a future Pro tier can charge for, and must be resolved
before Pro is defined — not after.** The audit's position stands: an honest
unresolved paid proposition beats a fabricated one, and the only promise the
built engine could honestly make today is *"tell me the day something
changes"* — for which detection exists and delivery does not.

---

## R5 · Homepage structure and signup depth

**Status:** left for proposition / conversion experimentation, after evidence.

The homepage places its signup block roughly thirteen sections below the hero
and sells the Cycle Dashboard in a single card *below* that signup block. This
is structural rather than factual, so it was out of Programme 1's remit.

---

## Gate on the next proposition decision

The audit recommends a master proposition
(*"Bitcoin, checked every morning against its own history"*). Programme 1
deliberately did **not** roll it out; the remaining positional framing (e.g.
*"where are we in the Bitcoin cycle?"* in the welcome email) is intentionally
preserved.

The gating evidence is the **quiet-week test**, which is already instrumented
and needs no new tooling: every sent edition records its own verdict class in
`briefV2Editions.activity`. Join that class to the edition's open rate and CTA
click-through and read the difference.

**Do not start until the archive holds quiet, mostly-quiet *and* active
editions**, and agree the decision rule (what tolerance counts as "quiet
editions held engagement") *before* seeing the numbers.
