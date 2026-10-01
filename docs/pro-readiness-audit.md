# HalvingLens Pro-readiness audit

**Status:** investigation & proposal — founder commission, 1 October 2026.
**Scope:** read-only audit. Nothing here changes production, sends email, or
alters the frozen £15/month proposed offer. Implementation follows a separate
founder decision informed by the 4 October demand review.
**Method:** repository inspection (code references below; `[IMPL]` = behaviour
that runs today, `[PLANNED]` = comments/copy only, `[UNUSED]` = code that
exists but nothing schedules), local analysis of the committed data series,
and a terms-review attempt recorded in §3.

---

## 1. Existing capabilities

### 1.1 Detecting meaningful indicator changes — substantial and reusable

- **Metric Watch** `[IMPL]` (`src/lib/metricWatch/index.ts`, `states.ts`) is
  the core asset: nine banded metric states (MVRV-Z, NUPL, SOPR, Reserve
  Risk, RHODL, Mayer, Puell, Fear & Greed, Accumulation —
  `states.ts:195-199`) with thresholds mapped from the single sources of
  truth, a run computer (`stateRunFrom`, `index.ts:197-232`) returning
  current state, since-date, age and the previous run, and **gated
  transitions**: a band change counts only if ≤7 days old *and* the prior
  state held ≥30 days (`index.ts:63-72,309-310` — the ungated version fired
  on 297 of 365 backtest days, per the code's own comment). Price-vs-
  reference crossings (200-day average, realised price, mining cost) use the
  same gates (`index.ts:346-382`). Every event already has a **stable
  identity** (`eventKey`, e.g. `band_transition:mvrv_z:a->b`,
  `index.ts:102-126`) which the code itself annotates as the "future Pro
  alert identity" `[PLANNED]`.
- **Brief significance engine** `[IMPL]` (`src/lib/briefSignificance.ts`)
  ranks state transitions, newly-qualifying top-5% moves, streaks/records
  (new-ATH detection at `:676-697`) and divergences for the daily email.
  Known limitation: "new today" is defined against data-date−1
  (`:574-598`), so **lagging series can never fire** — with on-chain data
  currently 7 days behind the anchor, only Fear & Greed transitions can
  currently appear in the Brief.
- **The only persisted transition log** `[IMPL]` is
  `state_changes` (`src/lib/warehouse.ts:187-239`,
  `supabase/warehouse.sql:88-98`) — but it covers four *other* dimensions
  (risk/heat, phase, sentiment band, ETF trend), not Metric Watch's nine
  states, and has **no unique constraint** (same-day re-runs duplicate rows).
- **Intelligence Events Engine** `[UNUSED by any schedule]`
  (`src/lib/intelligenceEvents.ts`, `intelligence_events.sql`) is a
  founder-only prototype with exactly the right shape: persisted events with
  a unique `dedupe_key` (`day:story:trigger`), a 3-day cooldown, priority
  capping, and status lifecycle. Its own comment (`:321-324`): "Pro would
  use the SAME set filtered by each subscriber's preferences" `[PLANNED]`.

### 1.2 Evaluation on data refresh — refresh exists; evaluation hook does not

- `sync.yml` `[IMPL]`: one full daily run (gated to 08:00 London) — sync →
  persist brief/edition/weekly → warehouse → commit → send-email →
  send-lifecycle. `refresh.yml` `[IMPL]`: four light refreshes/day (price,
  sentiment, chain only) that commit data and trigger a redeploy — **no
  evaluation, warehouse or email step**. `brief-failsafe.yml` re-sends and
  alerts the founder if `email_deliveries` has no row for today.
- **No step anywhere evaluates conditions after a refresh or notifies
  anyone.** All engines are recomputed from committed files at build/send
  time; prior state is re-derived, not stored (except §1.1's
  `state_changes`).

### 1.3 User preferences, email delivery, alert history

- **Preferences: none.** `brief_subscribers` has status/consent only;
  `pro_waitlist` is email+source+date (`supabase/pro_waitlist.sql:12-22`);
  `profiles.state` JSON has no alert fields; `tiers.ts` hard-codes `"free"`.
  The /pro page itself states "No billing, alert delivery, preferences or
  history are implemented" (`app/pro/page.tsx:6-12`) — accurate.
- **Email delivery: strong primitives, unevenly applied.** `sendEmail`
  (`src/lib/resend.ts:23-60`) supports idempotency keys and flags ambiguous
  outcomes (5xx/network). The **claim-then-send pattern**
  (`src/lib/lifecycleClaims.ts`) — insert claim → 409 skips → sent /
  released / ambiguous-retained, over a unique `lower(email)+step` index,
  with deterministic idempotency keys — is production-proven by the Pro
  announcement (353/353, 0 duplicates). But the **daily Brief sender does
  not use it**: its once-per-day guard row is written only after the whole
  loop (`emailSend.ts:129-137`), so a mid-loop crash plus the failsafe
  re-sends to everyone, with no per-recipient dedupe.
- **History/outcomes:** `email_sends` (per-recipient log, no event/type
  column), `email_events` (signed webhook, idempotent, hashed recipients) —
  analytics-only; nothing on any send path consults bounces/complaints
  (`emailEvents.ts:44-47` marks suppression as a follow-up `[PLANNED]`).
  **No per-user alert history store exists.** Unsubscribe is global and
  GET-only (no per-category preference, no RFC 8058 POST handler despite the
  header being sent).

### 1.4 Stale data, repeated crossings, duplicates, uncertain delivery

- **Freshness:** `archiveIsFresh` (3-day contract,
  `questions/evidence/index.ts:42-46`), `/api/health` 503 at >9h, production
  cost withheld at >7d hashrate, reference values carried ≤14 days. However
  **no send path has a freshness gate** — the Brief deliberately sends on
  the last good snapshot.
- **Repeat-crossing control:** Metric Watch's ≥30-day prior-run gate +
  ≤7-day window `[IMPL]` is time-based gating; there is **no value
  hysteresis band and no per-user "last notified state" store**. The
  Intelligence engine's 3-day cooldown is global, not per-user.
- **Duplicates:** the claim pattern + unique indexes + idempotency keys
  exist and work (§1.3) but only on the pro_intro/waitlist flows.
- **Uncertain outcomes:** `ambiguous` flagging + retained claims +
  reconciliation reporting exist on the same two flows; other senders count
  ambiguous as failed.

### 1.5 Reuse inventory vs gaps (summary)

**Directly reusable:** Metric Watch states/runs/eventKeys; pure predicate
patterns (`divergenceStatus(def, today, prev)`); the intelligence engine's
dedupe-key/cooldown/status design and table; the claim-then-send module with
ambiguous retention; idempotency-keyed `sendEmail`; HMAC unsubscribe; the
dark email shell; the signed delivery webhook; warehouse daily history; the
dispatch-workflow + failsafe + concurrency patterns; `entitlements.ts`.

**Gaps (nothing exists):** per-user alert preferences store; Pro member
identity/entitlement wired to anything; a transition ledger keyed to Metric
Watch eventKeys with a unique constraint; per-user alert history; an
evaluation engine joining conditions × members; an evaluation hook on
refresh; per-user debounce/last-notified state; a freshness gate before
alert evaluation; catch-up for lagging series; per-recipient at-most-once on
bulk sends; bounce/complaint suppression; per-category unsubscribe; campaign
tags on sends (webhook `campaign` is currently always null).

---

## 2. Candidate beta — three alert types

Historical frequencies below were computed on 1 Oct 2026 from the committed
series (price archive 2010-07-18→2026-09-29, 5,918 daily closes; Fear &
Greed 2018-02-01→2026-09-30, 3,160 points), applying the existing
Metric-Watch-style gate (prior state held ≥30 days). Limitations: daily
closes only; gate semantics approximate `stateRunFrom` (full-history scan
rather than its anchored walk); past frequency does not predict future
frequency. **No events are manufactured — in a quiet period these alerts
are silent, and the product must be honest about that.**

### A. Price crosses its 200-day average

- **Need (hypothesis):** "tell me when the long-term trend position changes
  so I don't watch charts daily." Unvalidated; the announcement's reply
  question and the 4 Oct review inform it.
- **Source & cadence:** committed CoinMetrics community price archive;
  new daily close lands once per day (sync 08:00 London; archive currently
  1 day behind calendar). **Rights: unresolved — §3.**
- **Trigger:** daily close crosses the 200-day simple average after the
  prior side held ≥30 days (the existing reference-crossing gate,
  `metricWatch/index.ts:346-382`). Repeat control: the 30-day gate plus a
  per-member per-eventKey ledger (to build) — one send per crossing event,
  ever, per member.
- **Member receives:** one email naming the crossing, the closing price,
  the average, and how long the prior side held; evidence links: `/price`
  and `/four-reference-prices`.
- **Historical frequency:** gated, 27 crossings in 15.7 years ≈
  **1.7/year** (last 36 months: 2023-10-16 ↑, 2024-07-04 ↓, 2025-03-09 ↓,
  2025-10-17 ↓, 2026-08-19 ↑).
- **Stale/unavailable:** evaluation is skipped when the archive fails the
  3-day freshness contract; the gap is logged; no alert is ever produced
  from stale data. (Member-visible "monitoring paused" messaging is a
  founder decision — see §6.)

### B. Sentiment band change (Fear & Greed)

- **Need (hypothesis):** "tell me when market mood actually shifts, not
  every wobble."
- **Source & cadence:** alternative.me index; refreshed up to 5×/day, the
  freshest series in the product (current through 2026-09-30). **Rights:
  unresolved — §3.**
- **Trigger:** canonical `bandFor` band changes (`src/lib/sentiment.ts:21-27`)
  with the ≥30-day prior-run gate. Repeat control as in A.
- **Member receives:** the band change, the value, how long the prior band
  held; evidence: `/sentiment`.
- **Historical frequency:** gated, 12 in 8.7 years ≈ **1.4/year**; last 24
  months: 4 (2026-03-17, 2026-04-18, 2026-07-07, 2026-08-19 — ≈2/year
  recently).
- **Stale/unavailable:** a failed F&G fetch leaves `sentiment: null`
  (`sync.ts:734-740`) — evaluation skips, logged, never alerts on absent
  data.
- **Precondition:** trust concern §4.1 (inconsistent sentiment wording
  across the site) must be corrected before selling sentiment alerts.

### C. New all-time high

- **Need (hypothesis):** "I don't want to learn about a new ATH from
  social media hours later."
- **Source & cadence:** price archive, as in A. **Rights: unresolved — §3.**
- **Trigger:** daily close exceeds the prior all-time-high close. Repeat
  control: cluster into episodes — after an ATH alert, further ATH closes
  within 30 days are suppressed (historically ATH days cluster: 250 ATH
  days form only 19 episodes).
- **Member receives:** new ATH level, prior ATH and its date; evidence:
  `/price`.
- **Historical frequency:** **1.2 episodes/year** over 16.2 years; 9
  episodes since 2020; current ATH $124,824 set 2025-10-06 (359 days ago —
  a live illustration of a quiet period).
- **Stale/unavailable:** as in A.

### Combined expectation and the quiet-period problem

The three candidates together fire roughly **4–6 times per year**. That is
the product's honest shape: the paid value is *monitoring* (knowing that
nothing changed without checking), punctuated by rare, well-evidenced
alerts. Any member-facing framing must not imply frequent activity.

### Explicitly excluded from the smallest beta

- **On-chain alerts** (MVRV-Z, NUPL, …): BGeometrics free tier (~15
  req/day), observations currently 7 days behind the anchor, rights
  unreviewed — a lagging paid alert is a trust risk.
- **ETF-flow alerts:** SoSoValue rights pending (the admin UI already
  carries a licence-confirmation note); the endpoint path is "guessed" per
  the sync code.
- **Custom thresholds, multiple channels (push/SMS), intraday evaluation,
  per-member digests** — all out of the smallest beta.

---

## 3. Data rights and costs

### 3.1 Rights

**Review attempt: 1 October 2026.** Current official terms could **not** be
verified from this audit environment — its network egress policy blocks the
provider domains (fetches of coinmetrics.io and alternative.me were refused
by the proxy). Under this repository's own governance rule ("unverified
means REQUIRES REVIEW", `docs/data-licensing.md`), every status below
remains **UNRESOLVED**, carried from the August 2026 record, which remains
the best internal evidence:

| Source (needed by candidates) | Terms link (from `docs/data-licensing.md`) | Status |
| --- | --- | --- |
| CoinMetrics community (price archive → candidates A & C) | https://coinmetrics.io/community-network-data/ | **REQUIRES REVIEW — the gating item.** The August record notes community data is commonly non-commercial-attribution licensed, and HalvingLens is commercial; a *paid alerting product* is a further step beyond display. Not confirmable from here. |
| alternative.me F&G (candidate B) | https://alternative.me/crypto/fear-and-greed-index/ | REQUIRES REVIEW — re-display with attribution is common practice, formal commercial terms unreviewed; paid-product use unconfirmed. |
| Not needed by candidates but in the product: BGeometrics, SoSoValue, mempool.space, CryptoCompare/CoinGecko fallbacks | see `docs/data-licensing.md` §§2,4,5,6 | REQUIRES REVIEW (unchanged). |

**Unresolved and account-specific:** the SoSoValue key's plan/terms; whether
CoinMetrics community terms permit commercial derived alerts; whether a paid
CoinMetrics tier would be required and its price. **No plans were purchased
and no providers were contacted** (per instruction). Public availability of
an endpoint has not been treated as permission anywhere in this audit.

Additional findings the licensing record should absorb (also flagged by
this audit's source inventory): a browser-side CryptoCompare `histohour`
call on `/price` (`src/components/BtcPriceChart.tsx:31-39`) and the
`npm run sync` that runs on **every Vercel deploy** (`vercel.json`) are not
in `docs/data-licensing.md`; observed refresh commits (~8/day) exceed the
configured 4/day cadence, so real call volume is roughly double the
scheduled estimate. Attribution today is thin: plain-text source badges on
/sentiment, /etf, /onchain only; **no provider is named in any email, card
or the footer**, and CoinMetrics is essentially unattributed.

### 3.2 Incremental operating costs (beyond the ~£50/month baseline)

Assumptions: candidates A–C only; ~4–6 alerts/year/member; one welcome/
baseline email per member; existing Resend plan already carries ~70k
Brief emails/month, so alert volume (≤100 members × ~1 email/month
equivalent) is noise within it; evaluation runs inside the existing daily
GitHub Actions job; Supabase row counts are trivial at this scale.

| Members | Infra/data increment | Payment fees (Stripe, ~1.5–2.9% + 20p on £15) | Total increment |
| --- | --- | --- | --- |
| 10 | ~£0 | ~£4–6/mo | **~£5/mo** |
| 50 | ~£0 | ~£21–32/mo | **~£25–30/mo** |
| 100 | ~£0 | ~£43–63/mo | **~£50–60/mo** |

The genuine cost risk is not volume — it is a **data-licence step cost**: if
the CoinMetrics community terms do not cover a paid product, a commercial
tier (price unknown, founder to verify) becomes a precondition, not an
increment. VAT/tax handling on £15/month is a founder-side item and is not
estimated here.

---

## 4. Earlier trust concerns — current status with evidence

### 4.1 Conflicting sentiment descriptions — **UNRESOLVED**

The canonical bands live in `src/lib/sentiment.ts:21-27`
(<25 extreme-fear / <45 fear / <55 neutral / <75 greed / else
extreme-greed), and the newer surfaces are CI-pinned to it. But at least
nine older call sites declare their **own thresholds and wording**, e.g.:

- `src/lib/cycleSummary.ts:452-457`: `<45` "remains fearful", `>=70`
  "approaching greedy", else "**Sentiment is in neutral territory**";
- `src/lib/cycleSummary.ts:586-593` (scorecard): `>=75` "Greed", `<=25`
  "Fear", else "**Calm**" / "below euphoric levels";
- also `dailyChange.ts:172-176`, `emailBrief.ts:78-123`,
  `storyEngine.ts:439`, `reel.ts:256-257`, `cycleZones.ts:120-126`,
  `contentCards.ts:2489`, `weekly.ts:168-179`.

Concrete contradiction at the current reading (F&G 71, 30 Sep): the home
page's evidence card says **"Greed"** while the scorecard on the same page
says **"Calm"**; the brief that day says "Greed building". At 55–69 the
canonical label is "Greed" while `whatChanged` says "neutral territory".

**Smallest correction:** route every sentiment description through
`bandFor` (delete the local thresholds at the nine sites), and add one CI
pin banning numeric F&G comparisons outside `sentiment.ts`. No design
change; wording-only diffs on older surfaces.

### 4.2 Cycle-phase vs historical-window explanations — **no record found of the original concern; the conflation is present**

No doc, commit or test records this being raised or resolved. In current
code: phase labels come **only from calendar progress**
(`cycleSummary.ts:248-255` — `pct < 70 ? "mid-cycle expansion"`; a comment
claims heat modulation that is not implemented), while the hero
simultaneously shows historical-window copy ("inside the historical
bear-market low window… context from three cycles, not a forecast",
`cycleZones.ts:112-113`) — today both render at once (day 892). Two peak
definitions coexist: `cycleTiming.ts:13` caps the peak search at day 1100,
while `cycleIntel.ts:411,435` uses the uncapped peak day (1402), and they
disagree with the questions-content claims. Only the bottom-window headline
carries the "not a forecast" line.

**Smallest correction:** one shared peak-definition constant used by both
modules, and the "context, not a forecast" sentence on all three window
headlines. The phase-label/heat comment should either be implemented or the
comment corrected (comment fix is smaller).

### 4.3 Equally weighted complementary factors cancelling — **UNRESOLVED; the disclosure describes the opposite of the behaviour**

Verified directly in code: the scorecard pushes Price structure with
`score: s.heatPercentile` (`cycleSummary.ts:554`) and Historical risk with
`score: 100 − heatPercentile` (`:621`), and `overall` is the plain mean
(`:625-627`). The pair always sums to ~100, contributing a fixed ~50 to the
average — **the heat reading cancels out of the composite**. The
methodology page (`app/methodology/page.tsx:72-84`) claims each factor is
"0–100 where higher reads historically calmer" (false for Price structure:
higher percentile = hotter) and that the pair "together … anchor the
composite toward that reading" (false: they remove it). The paragraph
arrived with PR #184 (Aug 2026), which changed no math; no test covers the
cancellation.

**Smallest correction:** fix the methodology paragraph to state the true
effect (the complementary pair contributes a fixed midpoint and the heat
reading does not move the composite; Price structure's scale reads hotter-
higher). That is copy-only and changes no published number. The founder may
instead prefer the *scoring* fix (score Price structure as
100 − percentile so both read calmer-higher and heat genuinely informs the
composite) — that is a behaviour change to a published score and therefore
a founder decision, not undertaken here.

---

## 5. First-subscription free trial — launch requirement

**Recorded as a launch requirement. Recommendation: 14 days.**

Rationale from §2's measured frequencies: the candidate portfolio fires
~4–6×/year, so the probability a trial contains *any* fired alert is ≈8%
over 7 days and ≈15% over 14 days. Even the longer trial is usually quiet,
and 14 days at least doubles the chance of a live alert while keeping the
commitment short. What a member can actually experience during a quiet
market — and therefore what the trial must deliver on day 0 — is the
**baseline**: which conditions they are watching, each condition's current
state and how long it has held (Metric Watch's `stateRunFrom` provides
exactly this today), with evidence links; plus the explicit framing that
silence is the service working. A "what would have alerted over the past
12 months" retrospective (real historical events, clearly dated — never
fabricated activity) is feasible from the same series and worth a founder
decision.

**Decisions needed before any implementation (none taken here, nothing
promised publicly):**

1. **Card collection:** card-upfront with no charge until expiry
   (recommended for intent-quality and churn-at-expiry simplicity) vs
   no-card trial with an explicit conversion step.
2. **Expiry behaviour:** auto-convert to £15/month (requires a pre-charge
   notice) vs lapse-to-free unless confirmed.
3. **Cancellation:** self-serve from day 0, effective immediately vs
   end-of-trial.
4. **Notifications:** trial-start confirmation; a reminder ~3 days before
   expiry (required if auto-converting); payment receipts.
5. **Repeat-trial eligibility:** recommend **one trial per address, ever**,
   enforced with the existing claim pattern (mirrors the one-Pro-intro
   discipline).
6. Billing provider (Stripe assumed in §3 estimates), VAT treatment, and
   refund policy.

---

## 6. Delivery plan — the smallest reliable beta

### Recommended smallest beta

Email alerts for **A (200-day average crossing)**, **B (sentiment band
change)** and **C (new ATH)** — fixed definitions, no custom thresholds —
for Pro members at the proposed £15/month after a 14-day trial, evaluated
once daily after the full sync, with a day-0 baseline email and a member
page showing followed conditions, current states and alert history.
**Exclusions restated:** no on-chain or ETF alerts, no custom thresholds,
no push/SMS, no intraday evaluation, no new dashboards.

### Existing vs required work

| Area | Exists (reuse) | Required |
| --- | --- | --- |
| Change detection | Metric Watch states, gates, eventKeys; ATH detection | Thin evaluation step joining detected events × members (small — the hard parts exist) |
| Scheduling | sync.yml daily job, failsafe pattern | One evaluation+send step after warehouse, freshness-gated |
| Dedup/reliability | claim-then-send module, idempotency keys, unique indexes, ambiguous retention | Per-member-per-eventKey ledger table (unique index); apply the claim pattern to alert sends |
| Email | `sendEmail`, dark shell, unsubscribe tokens, webhook telemetry | Alert template; campaign tags on sends (currently null in webhook data); bounce suppression decision |
| Membership | pro_waitlist audience, profiles, entitlements | Pro member store + preferences (which of the 3 alerts), trial state, billing linkage |
| Billing | nothing | Stripe products/webhooks, trial mechanics (§5 decisions first) |
| History | email_sends/email_events | Member-visible alert history (could ship read-only from the ledger) |

**Effort estimate (qualitative, given the reuse):** alerting core
(ledger, evaluation step, template, gates, tests) — small-to-medium, the
best-understood work in this plan; member/preferences/trial state — medium;
billing + trial — medium, dominated by decisions and testing, not code;
trust-concern corrections (§4, smallest versions) — small. The dominant
uncertainties are **data rights** and **billing decisions**, not
engineering.

### Blockers and unresolved assumptions

1. **Data rights (hard blocker):** candidates A and C stand on CoinMetrics
   community data; B on alternative.me. All REQUIRES REVIEW; terms
   unverifiable from this environment (egress-blocked). Founder-side review
   — or a session environment allowed to reach the terms pages — is
   required before any paid use.
2. **Trust concerns §4.1 and §4.3** should be corrected before charging for
   indicator-based alerts; §4.3's scoring-vs-copy choice is a founder
   decision.
3. **Billing decisions** (§5) precede any trial implementation.
4. **Adjacent reliability finding:** the daily Brief's re-send exposure
   (guard row written after the loop) doesn't block the beta (alerts will
   use the claim pattern) but is the kind of defect a paid tier makes more
   expensive — worth scheduling.
5. **Assumption to validate on 4 Oct:** that monitoring-plus-rare-alerts is
   what waitlist members actually want (announcement replies + demand
   numbers).

### Acceptance criteria for a reliable pilot

1. Every alert traceable end-to-end: eventKey, observation date, claim row,
   provider message id, delivery outcome.
2. At-most-once per member per event, proven by unique index + idempotency
   key (CI-tested, as the pro_intro flow is today).
3. No alert ever produced from data failing its freshness contract; skipped
   evaluations logged.
4. Ambiguous provider outcomes retained for reconciliation, never
   blind-retried (existing discipline).
5. Quiet periods are a designed experience (baseline + chosen quiet-period
   touchpoint), not silence by accident.
6. Cancellation, unsubscribe and trial expiry all function before the first
   paying member.
7. All alert data sources carry resolved rights with required attribution
   in place.

### Recommended next step (conditional on the 4 October demand review)

- If the review reads **"interest worth conversations"** (or replies show
  clear monitoring demand): founder starts the CoinMetrics +
  alternative.me terms review (the long-pole blocker) and takes the §5
  billing decisions; engineering scope then starts with the trust
  corrections (§4) and the alert ledger — in that order.
- If the review reads **"too little exposure"** (the 30 Sep early band):
  improve distribution first; this audit holds — none of it expires — and
  the terms review can still proceed in parallel at zero build cost.
- In both cases: no implementation, billing, or public trial promise until
  the founder's explicit go decision.
