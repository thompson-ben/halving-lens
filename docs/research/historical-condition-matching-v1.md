# Historical Condition Matching — Methodology Lock v1

**Methodology version:** `historical-condition-matching-v1`
**Status:** NOT READY FOR SIGN-OFF — three data-population blockers (see §25)
**Document type:** Pre-registration lock. Consolidation only; not a discussion paper.
**Supersedes:** all prior GO / LIMITED / NULL / NO-GO formulations (see §24)

---

## 0. Document control

| Field | Value |
|---|---|
| Methodology version | `historical-condition-matching-v1` |
| Lock date | `TO BE POPULATED AT COMMIT` |
| Git tag | `TO BE POPULATED AT COMMIT` (immutable, created before B1 begins) |
| Price file | `TO BE POPULATED AT COMMIT` |
| Price file SHA-256 | `TO BE POPULATED AT COMMIT` |
| Reference date | `TO BE POPULATED AT COMMIT` (proposed: 2026-08-09) |
| Signed by | Founder |

**Amendment rule.** Any change to this document after B1 begins requires a new
methodology version and a new research programme. It may not be patched into v1.
This applies whether or not outcomes have been inspected.

**Interpretation rule.** Where this document and any earlier discussion artefact
conflict, this document governs. Earlier documents are superseded in full, not in part.

---

## 1. Scope and purpose

This lock governs a **single-reference-date research exercise** answering:

> When Bitcoin has previously shown conditions comparable to those observed on the
> frozen reference date, what did the observed record show over the following 90 days?

It does **not** define a live, daily-recomputing condition matcher. Generalising this
work into a dynamic product requires `historical-condition-matching-v2` with its own lock.

### 1.1 Known structural ceiling

The frozen days-since-halving band (±120 days) spans 241 days per epoch. With entry dates
required to be ≥91 calendar days apart (§9.1), this permits **at most 3 candidate episodes
per epoch** (earliest possible entries at band days 0, 91, 182).

Two ceilings must be distinguished, and the second uses the same *statistically usable*
definition (§2) that the gates in §16 later apply.

**Candidate-episode ceiling** — entries anywhere in the eligible window.

**Statistically usable ceiling** — entries additionally satisfying §10, i.e.

```
latest usable entry = min( band upper bound , last observable date − 90 days )
```

For completed epochs the two ceilings coincide. For the live epoch they do not: at an
illustrative reference day of 842, the epoch-5 band opens at day 722 but usable entries
must fall on or before day 752, leaving a 31-day usable window — which admits **one**
usable episode, not two.

| Epoch | Candidate ceiling | Statistically usable ceiling |
|---|---|---|
| 2 | 3 | 3 |
| 3 | 3 | 3 |
| 4 | 3 | 3 |
| 5 | ~2 (truncated at reference date) | **~1** (truncated at reference date − 90) |
| **Total** | **~11** | **~10** |

Illustrative only. Both ceilings must be **recomputed algebraically** once `REFERENCE_DATE`,
the day-zero convention, and the absolute bands are frozen (§5, §6.2). This is arithmetic
on frozen constants — it does not involve constructing, counting, or inspecting any actual
matched episode.

Two consequences are therefore **pre-declared, not discovered**:

1. `EPISODES_PLUS_SUMMARY` (requires ≥12 statistically usable episodes) is **unreachable**
   in v1 under either ceiling.
2. `STRUCTURAL_SENSITIVITY` is **NOT_EVALUABLE** in v1, because epoch 5 cannot contain 6
   usable 91-day-separated episodes within its usable window under any band configuration.

These constraints are accepted deliberately. No rule in this document may be relaxed for
the purpose of making a higher tier reachable.

---

## 2. Canonical definitions

One term per concept. These names are binding in methodology, schema, and code.

| Term | Definition |
|---|---|
| **Candidate episode** | Any episode produced by the construction rules in §8, before exclusions. |
| **Statistically usable episode** | A candidate episode where `forward_window_complete = Y` **and** `overlaps_claimed_window_of` is null **and** `statistically_usable = Y`. |
| **Live episode** | A candidate episode whose entry date is on or before the reference date and whose forward window has not completed. Visible; never counts toward any gate. |
| **Conditional sample** | The set of statistically usable episodes. |
| **Base rate** | The unconditional daily comparator defined in §13. |
| `conditional_episode_iqr` | IQR of 90-day endpoint returns across the conditional sample. |
| `base_rate_iqr` | IQR of 90-day endpoint returns across the base rate. |

All methodology gates count **statistically usable episodes only**. The words
*candidate*, *eligible*, *independent*, and *matched* must not be used to express a
gate count anywhere in the lock, the schema, or the product.

---

## 3. Price-series authority

**One price series governs the entire experiment**: drawdown, Mayer, condition matching,
all three outcomes, the base rate, and the walk-forward exercise. No mixing of sources
for any purpose.

The lock must record all sixteen fields before sign-off:

1. Provider
2. Exact dataset / series identifier
3. Frequency (daily)
4. Currency
5. Whether any FX conversion is applied
6. Exact daily-close convention (00:00 UTC snapshot / 24h VWAP / venue close)
7. Timezone
8. Single venue vs index
9. Index composition methodology, if applicable
10. Known methodology or index-composition changes through history, with dates
11. Earliest raw observation
12. Handling of missing days (see §9 of the pre-lock inspection, §15 below)
13. Revision policy, stated as a **testable claim** (e.g. "values for dates older than
    30 days have never been revised") — not "historical data is stable"
14. Commercial-use / redistribution licence status
15. Frozen snapshot filename, committed to the repo
16. Immutable file hash

**B1 and B2 must run against identical bytes.** No live API reads inside any research run.

---

## 4. Halving epochs

One era taxonomy only. Epoch 1 is excluded (pre-November-2012 price data is thin,
single-venue, and of insufficient quality).

| Epoch | Start block | Start date (UTC) | End |
|---|---|---|---|
| 2 | 210,000 | `VERIFY` — c. 2012-11-28 | block 420,000 |
| 3 | 420,000 | `VERIFY` — c. 2016-07-09 | block 630,000 |
| 4 | 630,000 | `VERIFY` — c. 2020-05-11 | block 840,000 |
| 5 | 840,000 | `VERIFY` — c. 2024-04-20 | present |

Both block height and canonical UTC date must be recorded for each. Generic prose
("the 2020 halving") may not substitute for the frozen authority. `days_since_halving`
derives only from these values.

**Day-zero convention.** `TO BE LOCKED AT COMMIT.` State explicitly whether the halving
date itself is day 0 or day 1, and confirm the choice matches the convention already used
by the live Cycle Dashboard. A one-day discrepancy shifts marginal episodes across band
boundaries and would make the module inconsistent with the rest of the site.

**Epoch 5 annotation.** Epoch 5 is the era of US spot ETFs, larger corporate and treasury
participation, and mature derivatives infrastructure. This is recorded as a property of
epoch 5, not as a competing taxonomy.

---

## 5. Reference date and reference values

`historical-condition-matching-v1` is anchored to one frozen date.

```
REFERENCE_DATE          TO BE POPULATED AT COMMIT (proposed 2026-08-09)
reference_drawdown      TO BE POPULATED — regenerate from frozen price file
reference_mayer         TO BE POPULATED — regenerate from frozen price file
reference_days_since_halving   TO BE POPULATED — derive from §4 authorities
```

**Reference values must be regenerated from the frozen price series, not transcribed
from the live dashboard.** Displayed dashboard values may derive from a different close
convention or a running-high definition that differs from §6.1. Any discrepancy between
the two must be recorded in the lock, not silently resolved.

Bands do not move with live Bitcoin after the lock date. B1 and B2 answer a question
about one historical moment.

---

## 6. Conditions and bands

### 6.1 Condition definitions

**Drawdown from ATH** — the current daily close relative to the highest daily close
observed on or before that date. Point-in-time only. Never a future ATH. Never an
epoch-local high.

**Mayer Multiple** — daily close divided by the trailing 200-day simple moving average
of daily closes, on the same frozen series. Requires 200 prior observations.

**Days since halving** — whole days elapsed from the epoch's canonical halving date to
the observation date, per §4. Deterministic, point-in-time, never revised.

Percentage-through-epoch is **excluded from the matcher** (it depends on an estimate of
the next halving date and therefore drifts daily). It may remain a display field elsewhere.

### 6.2 Primary bands

Stated both absolutely and as offsets from the frozen reference values.

| Condition | Offset | Band |
|---|---|---|
| Drawdown from ATH | ±5 pp | `TO BE POPULATED` (illustrative: −53% to −43%) |
| Mayer Multiple | ±0.10 | `TO BE POPULATED` (illustrative: 0.82 to 1.02) |
| Days since halving | ±120 d | `TO BE POPULATED` (illustrative: 722 to 962) |

Bands are justified on **interpretive comparability** — would an informed reader agree
these describe the same situation? They may not be tuned against episode count, before
or after B1.

### 6.3 Widening rule

If the primary bands fail the §16 gates, **one** widening step is permitted. It applies
to all three conditions simultaneously:

| Condition | Widened offset |
|---|---|
| Drawdown from ATH | ±8 pp |
| Mayer Multiple | ±0.15 |
| Days since halving | ±180 d |

No per-condition widening. No second step. No widening after any outcome has been
inspected. If the widened specification still fails the gates, `EVIDENCE_TIER = NO_MODULE`.

The widening step exists only to test whether an episode record is possible. It is not a
route to a higher evidence tier — `EPISODES_PLUS_SUMMARY` remains foreclosed by §1.1
regardless of bands.

**Disclosure.** If widened bands were used, the product and the public methodology page
must say so. Widened matches may never be presented as though they met the primary bands.

---

## 7. Membership

Membership is **binary and band-based**. A day is in band when all three conditions lie
within their frozen bands on that date.

No similarity score gates inclusion. No similarity percentage is displayed. The displayed
condition values are the entire justification for a match.

---

## 8. Episode construction

### 8.1 Entry

An episode begins on the first in-band day following a period out of band (or the first
in-band day of the series).

### 8.2 Bridge eligibility

A bridge is not automatic. When conditions leave band on day **D**, count the consecutive
**in-band** days immediately preceding D.

- **≥ 5 consecutive in-band days** → a bridge is available for this excursion.
- **< 5** → no bridge. The episode ends at **D−1**.

Bridge days are **not** in-band days. They do not contribute to the count, and they reset
it: after a bridged excursion, the counter restarts from the resumption day.

This mirrors the exit rule symmetrically — five consecutive out-of-band days end an
episode; five consecutive in-band days are required to earn the right to survive one.

### 8.3 Bridge and exit

- Conditions leave band on day **D**.
- If a bridge is available (§8.2) **and** all conditions return in band on or before
  **D+4**, the episode **continues**. Days D … D+3 are bridge days and count within
  `duration_days`.
- If a bridge is available but conditions remain out of band through **D+4** (five
  consecutive out-of-band days), the episode **ended at D−1**, the last in-band day. The
  excursion days are not part of the episode.
- If no bridge is available, the episode **ended at D−1** regardless of when conditions
  return.
- A later re-entry may begin a new episode, subject to §9.

### 8.4 Worked examples

Binding. Any implementation must reproduce these exactly.

| Pattern | Resolution |
|---|---|
| 20 in, 3 out, 40 in | **One episode.** 20 ≥ 5 → bridge available; return within 4 days. Bridge days counted in `duration_days`, not `in_band_days`. |
| 20 in, 5 out, 40 in | **Two episodes.** Bridge available but not used within 4 days; first ends at the last in-band day before the excursion. |
| 20 in, 4 out, 1 in, 4 out, 40 in | **Two episodes.** First excursion bridges (20 ≥ 5). The single in-band day resets the counter to 1; 1 < 5, so the second excursion gets no bridge. Episode one ends on that single day. Episode two begins after. |
| 20 in, 4 out, 5 in, 4 out, 40 in | **One episode.** The 5-day in-band run re-qualifies, so the second excursion bridges. |
| 3 in, 2 out, 40 in | **Two episodes.** 3 < 5 → no bridge. A three-day touch is not a regime. |
| 1 in, 90 out | **One episode of one day.** Valid, and subject to §9 and §10 like any other. |

The third and fourth rows are the cases that matter: a 4-out/1-in pattern cannot chain
indefinitely into one artificial long episode, but a genuine resumption can.

### 8.5 Date semantics

`entry_date` and `exit_date` are always in-band days. Because bridge days are counted,
`duration_days` may exceed the number of in-band days. Both `duration_days` and
`in_band_days` are recorded so bridging is auditable.

### 8.6 Episode representation

Each episode is represented by its **entry day** for all condition and outcome purposes.
Days-in-state is carried as a displayed contextual field, not as a matching condition.

*Recorded simplification:* an episode entered long ago and an episode entered yesterday
are treated identically. This is a known limitation of v1 and a candidate refinement for v2.

---

## 9. Overlapping forward windows

Distinct market episodes are **not collapsed**. Each is recorded as what it was.

### 9.1 Window definition

An episode with entry date **E** claims the closed calendar interval **[E, E + 90 days]**.

Two claimed windows overlap when they share at least one calendar day. Therefore a later
episode with entry **E₂** overlaps an earlier claimed window **E₁** when:

```
E₂ ≤ E₁ + 90 calendar days
```

Equivalently: entry dates must be **at least 91 calendar days apart** for both episodes to
be statistically usable. The boundary case `E₂ = E₁ + 90` is an **overlap** and is excluded.

### 9.2 Claim rule

**Rule.** Process candidate episodes chronologically by entry date. The first episode
claims its window. Any later episode satisfying §9.1 against an already-claimed window is
excluded from statistics and records `overlaps_claimed_window_of = {episode_id}`.

**All candidate episodes claim windows**, including right-censored episodes and the live
episode. Claiming reflects the independence of the underlying market episode, not the
availability of outcome data. If claiming depended on completeness, the claim set would
change as the series extends — drift by another route.

Where a later episode overlaps more than one claimed window, record the **earliest**
claiming `episode_id`.

Chronological first-claim is deterministic and outcome-blind. No later episode may
replace an earlier one on grounds of similarity, representativeness, magnitude, outcome,
or visual appeal.

Excluded episodes remain visible in the B1 table and in the public methodology.

---

## 10. Right-censoring

If `entry_date + 90 calendar days` is not fully observable in the frozen dataset:

- the episode remains **visible**;
- `forward_window_complete = N`;
- no endpoint, worst-close, or best-close outcome is computed;
- no partial or shortened window is substituted;
- the episode does not count toward any gate.

No survivorship-based deletion. This mirrors the existing Lens convention of showing the
current cycle with no forward data.

### 10.1 The live episode

If the reference date falls in band, that episode appears in the table with
`forward_window_complete = N`. It is the episode the user is standing in and must be shown.
It never counts toward gates and never contributes to any statistic.

---

## 11. Censoring precedence

**First:** is the full `entry_date + 90 calendar day` horizon observable in the frozen
dataset? If no → `forward_window_complete = N`. Stop.

**Second:** only if the window is fully observable, resolve any missing observation
*inside* the historical window using the §15 missing-date rule.

The last-available-close fallback may **never** convert a right-censored episode into a
complete one.

---

## 12. Outcomes (B2 only)

Exactly three frozen outcomes. No 30-day statistic. No 180-day statistic. No
time-to-event outcome. No new-cycle-high probability. No outcome added after results
are seen.

**1. 90-day endpoint return** — simple percentage change from the entry-day daily close
to the daily close at `entry_date + 90 calendar days`. No annualisation. No log return.
No intraday price.

**2. Worst close relative to entry** — the minimum percentage change from the entry close
across all observed daily closes within the 90-day window. If no close falls below entry,
the value is **0%**.

**3. Best close relative to entry** — the maximum percentage change from the entry close
across all observed daily closes within the same window. If no close rises above entry,
the value is **0%**.

### 12.1 Naming

The term "maximum drawdown" is **prohibited** for outcome 2 in methodology, schema, code,
and product. It conventionally denotes a peak-to-trough measure, which this is not. Use
*worst close relative to entry* throughout. Likewise *best close relative to entry*.

### 12.2 Asymmetry

The zero-baseline convention means worst-close ≤ 0% and best-close ≥ 0%. These are
deliberately asymmetric path statistics. Visual design must not imply they form a
symmetric pair around zero.

---

## 13. Base rate

The unconditional comparator is:

- **all** daily observations from the effective start date (§14) to
  `REFERENCE_DATE − 90 calendar days`;
- one observation per day;
- the same frozen price series;
- the same three outcomes.

**Not episode-clustered.** This is a background reference distribution, not a competing
sample. Clustering it would introduce a second set of methodology choices for no gain.

Under `EPISODES_ONLY` the base rate is rendered in the same visual grammar as the
conditional episodes — a low-opacity point cloud on the same axis, same units — with **no
median line, no IQR band, and no numeric headline**. Its density is the message.

`base_rate_iqr` may be computed internally for the §17 classification even where no
base-rate statistic is displayed.

---

## 14. Effective start date

```
effective_start = max( epoch_2_start , price_series_start + 200 days )
```

Record both the raw series start and the effective start, and state **which constraint is
binding**. Epoch 1 is excluded regardless.

---

## 15. Missing-date rule

Determined by the pre-lock data integrity inspection (§19.1).

- If the frozen series contains **no missing daily observations** after the effective
  start date, the lock states: *"Daily series is complete; no missing-date substitution
  is required."*
- If gaps exist, freeze one explicit rule before B1. Prefer the canonical archive's own
  convention. **No interpolation.** No outcome-aware choice.

---

## 16. Gates

Counted on **statistically usable episodes** only.

| Gate | Threshold |
|---|---|
| Usable episode floor | ≥ 6 |
| Summary episode floor | ≥ 12 |
| Halving epochs represented | ≥ 2 (hard) |
| Largest single-epoch share | ≤ 60% (hard) |
| Epochs represented — preferred | 3 (not binding) |

### 16.1 The shared floor of 6

The value **6** is a single methodological constant with one definition. It determines
both (a) whether `EPISODES_ONLY` is reachable and (b) whether the §17 outcome comparison
may run. There must not be two independently declared thresholds of 6 in code or
methodology. Define one constant and reference it from both consumers.

*Note:* with a ceiling of ~3 usable episodes per epoch, the 60% share gate can only bind
at low counts (e.g. 3 of 4). This is expected behaviour, not a defect.

---

## 17. State model

Three orthogonal fields, each answering exactly one question, plus one derived
publication field.

### 17.1 `EVIDENCE_TIER` — what may be rendered

| Value | Condition |
|---|---|
| `NO_MODULE` | < 6 usable episodes, **or** a hard diversity gate fails |
| `EPISODES_ONLY` | ≥ 6 usable episodes **and** diversity gates pass |
| `EPISODES_PLUS_SUMMARY` | ≥ 12 usable episodes **and** diversity gates pass **and** `STRUCTURAL_SENSITIVITY = PASSED` |

**v1 ceiling: `EPISODES_ONLY`.**

### 17.2 `RESEARCH_FINDING` — what the comparison found

| Value | Condition |
|---|---|
| `NOT_RUN` | Comparison not run, including all B1 output, or < 6 usable episodes |
| `NOT_EVALUABLE` | Attempted with the floor met, but not computable under the frozen rules |
| `NULL` | Conditional median 90-day endpoint return lies **inside** `base_rate_iqr` |
| `DISTINCT` | Conditional median 90-day endpoint return lies **outside** `base_rate_iqr` |

Binding on the 90-day endpoint return only. Worst-close and best-close are descriptive
and do not determine this field.

The conditional median may be computed **internally** for this classification even where
`EVIDENCE_TIER` forbids displaying it. The lock records this explicitly: a computed
median used for a methodology decision is not thereby a member-facing statistic.

### 17.3 `STRUCTURAL_SENSITIVITY` — could the modern-era test run

| Value | Condition |
|---|---|
| `NOT_EVALUABLE` | Fewer than 6 usable epoch-5 episodes |
| `PASSED` | Test evaluable and no material disagreement |
| `FAILED` | Test evaluable and material disagreement found |

**Modern-era subset = halving epoch 5 only.** Epochs 4+5 may not be combined to
manufacture a larger "modern" sample.

**Material disagreement** on the 90-day endpoint return occurs when either:

- the epoch-5 median and the full-sample median have **opposite signs**; or
- the epoch-5 median lies **outside `conditional_episode_iqr`** (the IQR of the full
  conditional sample — **not** `base_rate_iqr`).

**v1 value: `NOT_EVALUABLE`**, pre-declared per §1.1. This must never be recorded as
`PASSED`. No proxy test may be substituted to populate the field.

### 17.4 `MODULE_SHIPS` — derived

```
MODULE_SHIPS = Y   iff   EVIDENCE_TIER != NO_MODULE
```

`RESEARCH_FINDING` does not independently determine shipping. A `NULL` finding with
adequate evidence ships. A `DISTINCT` finding with inadequate evidence does not.

---

## 18. Rendering permissions

**`EVIDENCE_TIER` alone controls statistical rendering.** `RESEARCH_FINDING` may alter
explanatory text; it may never unlock a richer visualisation.

| Tier | Permitted |
|---|---|
| `NO_MODULE` | No Similar Conditions module |
| `EPISODES_ONLY` | Episode paths/dots, chronological, plus background base-rate cloud |
| `EPISODES_PLUS_SUMMARY` | The above, plus conditional median and IQR; plus positive/negative **counts** at ≥20 usable episodes |

**Binding consequence:** `DISTINCT` at `EPISODES_ONLY` still renders **no median**. A
strong-looking finding does not override weak evidence. This is intentional.

### 18.1 Prohibited at every tier below `EPISODES_PLUS_SUMMARY`

Conditional median · conditional IQR · mean · percentage-positive · probability language ·
density curves · violin plots · smoothed distributions · any base-rate summary statistic.

### 18.2 Prohibited at every tier without exception

Means · percentage-positive framing · density or violin plots · probability language ·
similarity percentages.

### 18.3 Episode presentation rules

- **Chronological order always.** Sorting by outcome makes the middle row read as a median.
- Each episode rendered primarily as a **90-day path sparkline** with the endpoint marked.
  Endpoint, worst close, and best close available on tap. Aligned outcome columns are
  prohibited: they make mental aggregation trivial and reintroduce the banned summary.
- User-facing count reads **"8 historical episodes"**. The word *independent* is a
  methodology term and does not appear in the product.
- The evidence tier is displayed as a persistent, named line, e.g.
  *"Evidence: 8 historical episodes · summary statistics not shown"*. This prevents a
  silent presentation upgrade if counts change.
- Matched condition bands are displayed with the reference value alongside each band. Never
  hidden behind a methodology link.
- Overlap exclusions are disclosed, e.g. *"3 further episodes overlapped an earlier
  episode's outcome window and are excluded from statistics."*

### 18.4 Banned language

*typical outcome · average result · most often · usually · historical tendency · tended to ·
in most cases · "historically, X" used to imply an outcome tendency · "when this happened
before, X" · any phrasing that converts the episode record into an implied distribution.*

### 18.5 Structural-change statement

Any module using pre-2024 episodes must state, visibly and without interaction:

> Bitcoin's market structure has changed materially over time. Older episodes are shown as
> historical context, not equivalent forecasts.

This must also appear on any shareable artefact, so it cannot be cropped away with the
surrounding page.

### 18.6 No silent upgrade

Two separate rules, one per axis.

**Evidence tier.** An `EPISODES_ONLY` tier never upgrades itself into summary presentation
because the episode count later increases. The tier is fixed by the methodology version
under which it was determined.

**Research finding.** A `NULL` or `DISTINCT` finding never overrides the rendering
permissions granted by `EVIDENCE_TIER`. It may change explanatory text only.

Any move to richer statistical presentation requires a new methodology version whose
`EVIDENCE_TIER` permits it.

---

## 19. Phase separation

### 19.1 Pre-lock data integrity inspection

One tightly scoped inspection of the proposed price file, **before** the lock is committed.

*Permitted:* series start and end dates · date coverage · count of missing calendar dates ·
locations of any gaps · file metadata establishing provenance · file hash.

*Not permitted:* inspecting price levels for research conclusions · calculating returns ·
calculating forward outcomes · constructing episodes · inspecting condition-match counts ·
testing whether any proposed band produces a desirable sample · computing base rates.

*Purpose:* determine whether a missing-date rule is required at all (§15). Recorded in the
lock as **PRE-LOCK DATA INTEGRITY INSPECTION** with its scope documented.

### 19.2 B1 — data feasibility, outcome-blind

B1 may compute only: condition membership · episode construction · entry and exit dates ·
bridge behaviour · overlap lineage · forward-window completeness · epoch composition ·
gate counts.

B1 may **not** compute: endpoint returns · worst-close or best-close outcomes · base-rate
distributions · conditional medians · any outcome summary · any `RESEARCH_FINDING`
classification.

If B1 fails the gates under both primary and widened bands, the programme stops at
`EVIDENCE_TIER = NO_MODULE`.

### 19.3 B2 — outcomes

Runs only if B1 clears the gates and the founder approves the B1 deliverable. Computes the
three frozen outcomes, the base rate, the §17.2 classification, the §17.3 field, and the
§20 walk-forward.

### 19.4 Product rendering

Governed entirely by §18. No renderer may recompute, reclassify, or reinterpret any field
in §17.

---

## 20. Walk-forward honesty check (B2)

Dates frozen before B2. For completed epochs 2, 3 and 4:

- day 842 of the epoch;
- the epoch's cycle high;
- the epoch's cycle low.

**Cycle high** = highest daily close between canonical epoch start and epoch end.
**Cycle low** = lowest daily close over the same span. Completed epochs only, frozen series,
no intraday extremes.

At each date, run the module using only information available at that date and record what
it would have displayed. Compare with what followed.

This is an **honesty and stability check** — for look-ahead leakage, unstable conclusions,
and misleading small-sample summaries. It is not an accuracy score and must never be
presented as one.

*See Open Question OQ-2 regarding which band anchor the replay uses.*

---

## 21. B1 output schema

One row per candidate episode. No outcome values. No base-rate values.

```
episode_id
entry_date
exit_date
duration_days
in_band_days
entry_close
drawdown_at_entry
mayer_at_entry
days_since_halving_at_entry
halving_epoch
forward_window_complete            Y/N
overlaps_claimed_window_of         nullable episode_id
statistically_usable               Y/N
statistical_exclusion_reason       nullable enum
methodology_version
bands_version                      primary | widened
```

`entry_close` is required: without it, B1's own condition values and B2's outcomes cannot
be independently reproduced from the frozen file.

An episode may be both incomplete and overlapping. The row records both; neither field
overwrites the other.

### 21.1 Summary block

Total candidate episodes · statistically usable episodes · episodes by epoch · largest
epoch share · complete forward-window count · raw series start · effective start · binding
start constraint · bands used (primary or widened) · PASS/FAIL for every gate, stated
individually.

### 21.2 Mandatory negative assertion

The B1 deliverable must carry this signed statement:

> No 90-day forward return, worst close relative to entry, best close relative to entry,
> conditional median, or unconditional base-rate outcome was computed, inspected, or used
> at any point during B1.

This is a required acceptance criterion, not a formality.

### 21.3 Provenance assertion

The B1 deliverable must state the methodology version, the git tag, and the price-file
hash it executed against.

---

## 22. Public methodology requirements

The methodology page is part of the product, not documentation written after the fact. It
need not ship before B1, but its required contents are locked here. A visitor must be able
to understand:

- what conditions are matched, and the frozen reference date;
- the condition bands, and whether widened bands were required;
- how an episode is defined, including the five-day bridge;
- why overlapping 90-day windows are excluded from statistics;
- the number of statistically usable episodes and the halving-era composition;
- right-censoring treatment, including the live episode;
- price-series provenance and licence;
- the evidence tier, research finding, and structural-sensitivity state;
- **why summary statistics may deliberately not be shown**;
- the structural-change caveat for post-2024 Bitcoin.

Under `EPISODES_ONLY`, the methodological refusal is the most differentiated part of the
feature. It must not be buried.

---

## 23. Constants

```
METHODOLOGY_VERSION             historical-condition-matching-v1
CONDITION_COUNT                 3
BRIDGE_MAX_DAYS                 4
BRIDGE_QUALIFY_IN_BAND_DAYS     5         consecutive, immediately prior
BREAK_DAYS                      5
FORWARD_WINDOW_DAYS             90        calendar, closed interval [E, E+90]
MIN_ENTRY_SEPARATION_DAYS       91        calendar; E2 <= E1+90 is an overlap
MAYER_WINDOW_DAYS               200
USABLE_EPISODE_FLOOR            6         shared: tier + finding
SUMMARY_EPISODE_FLOOR           12
COUNTS_FLOOR                    20        positive/negative counts
MIN_EPOCHS_REPRESENTED          2         hard
MAX_SINGLE_EPOCH_SHARE          0.60      hard
PREFERRED_EPOCHS                3         non-binding
MODERN_ERA_EPOCH                5         only
MODERN_ERA_FLOOR                6
EXCLUDED_EPOCHS                 1
WIDENING_STEPS_PERMITTED        1
DRAWDOWN_OFFSET_PRIMARY         ±5 pp
MAYER_OFFSET_PRIMARY            ±0.10
DAYS_OFFSET_PRIMARY             ±120
DRAWDOWN_OFFSET_WIDENED         ±8 pp
MAYER_OFFSET_WIDENED            ±0.15
DAYS_OFFSET_WIDENED             ±180
TIMEZONE                        UTC everywhere
BINDING_OUTCOME                 90-day endpoint return
V1_STRUCTURAL_SENSITIVITY       NOT_EVALUABLE (pre-declared)
V1_MAX_EVIDENCE_TIER            EPISODES_ONLY (pre-declared)
```

**UTC applies to:** price dates · halving dates · episode entry and exit · days since
halving · bridge arithmetic · forward windows · walk-forward dates · base-rate dates. No
local-time interpretation anywhere.

### 23.1 Decision table

| Usable episodes | Diversity gates | Structural sensitivity | `EVIDENCE_TIER` | `MODULE_SHIPS` |
|---|---|---|---|---|
| < 6 | any | any | `NO_MODULE` | N |
| ≥ 6 | fail | any | `NO_MODULE` | N |
| 6–11 | pass | any | `EPISODES_ONLY` | Y |
| ≥ 12 | pass | `NOT_EVALUABLE` or `FAILED` | `EPISODES_ONLY` | Y |
| ≥ 12 | pass | `PASSED` | `EPISODES_PLUS_SUMMARY` | Y |

| Usable episodes | Conditional median vs `base_rate_iqr` | `RESEARCH_FINDING` |
|---|---|---|
| < 6 | not computed | `NOT_RUN` |
| ≥ 6 | not computable | `NOT_EVALUABLE` |
| ≥ 6 | inside | `NULL` |
| ≥ 6 | outside | `DISTINCT` |

---

## 24. Superseded decisions

Recorded so they are not revisited, and so the reasoning survives personnel and time.

| Rejected | Reason |
|---|---|
| **Overlapping daily observations counted as n** | A 40-day regime is one episode, not 40 observations. Presenting it as 40 would be statistical theatre and damages credibility more than an honest small n. |
| **GO / LIMITED / NULL / NO-GO single state** | Conflated evidence strength with research finding, producing contradictions such as "LIMITED but NULL". Replaced by three orthogonal fields (§17). Not retained as aliases — an alias layer is itself a tuning surface. |
| **Live-moving v1 reference bands** | Bands anchored to a floating live reading would recompute episode counts and evidence tiers daily without a methodology change — silent drift at the data layer. v1 is a single-reference-date exercise. |
| **On-chain inputs in the v1 matcher** | Entity-clustering heuristics are revised and applied retroactively, so historical values are restated. Matching against restated history is look-ahead contamination no matcher can fix. Price is never revised. |
| **Sentiment and ETF inputs** | Fear & Greed begins 2018, costing an entire halving epoch. ETF flows have no pre-2024 history, making any matcher containing them n ≤ 1 epoch by construction. |
| **Positive-return percentages** | "67% of episodes were positive" is read as a 67% probability. Counts resist that reading; percentages do not. Counts permitted only at ≥20 usable episodes. |
| **Density curves, violins, smoothed distributions** | Twelve dots look like twelve dots. A smooth curve looks like knowledge that does not exist at this sample size. |
| **Outcome-driven band widening** | One pre-declared symmetric step only. Widening chosen after seeing results is data dredging. |
| **Cycle-position percentage as a condition** | Depends on an estimate of the next halving date, which moves with hashrate; the live point drifts against a fixed band. Replaced by days since halving. |
| **"Maximum drawdown" terminology** | Conventionally means peak-to-trough. The measure here is worst close relative to entry. Using the term would mislead an informed reader. |
| **Time-to-event outcomes** | Right-censored by construction; excluding unresolved cases is survivorship bias. |
| **30-day and 180-day horizons** | 30d is noise; 180d overlaps far more and roughly halves the episode count. |
| **Episode collapsing** | Two regime entries are two episodes. One is set aside for a statistical reason, not a market one. The record should say what happened. |
| **"Bridge allowance resets on each excursion"** | Stated in an earlier draft alongside an example requiring the opposite. A per-excursion reset permits a 4-out/1-in pattern to chain indefinitely into one artificial episode. Replaced by the re-qualification rule in §8.2, chosen to make the original worked example true — not chosen against any episode count. |
| **Weakening rules to reach a higher tier** | Explicitly rejected. The constraint is the finding. |

---

## 25. Open questions

Genuinely unresolved. Settled decisions are not reopened here.

**OQ-1 — What does the shipped module display as "today"?** *(Product-blocking)*
v1 is anchored to a frozen reference date, but the dashboard header shows live price. A
module reading *"Today: −48%"* beside a header showing a materially different live
drawdown is a visible contradiction on one page. Options: (a) label the module *"as at
{reference date}"* and accept it ages; (b) set a declared refresh cadence, which is
`v2` work; (c) hold the module until v2. **Requires a founder decision before the module
ships — not before B1 runs.**

**OQ-2 — Which band anchor does the walk-forward replay use?**
Replaying day 842 of epoch 3 could use the frozen 2026 reference bands, or bands anchored
to that date's own condition values. These give different answers. *Recommended resolution:*
anchor to each replay date's own values, since that is what the module would have done at
the time — which is the point of the exercise. This is possible because the band rule is
expressed as symmetric offsets. **Confirm before B2; does not affect B1.**

**OQ-3 — Day-zero convention.** §4 requires it to be locked, and it must match the live
dashboard's existing convention. Resolvable at commit; listed so it is not overlooked.

**OQ-4 — Reference-value discrepancy.** If regenerated reference values differ from the
dashboard's displayed values (§5), the difference must be recorded and its cause
identified before sign-off. A material difference may indicate the dashboard and the
matcher use different close or running-high conventions, which would need reconciling
independently of this programme.

---

## 26. Readiness statement

**NOT READY FOR FOUNDER SIGN-OFF.**

The methodology is complete and internally consistent. No unresolved methodological
question remains. The three outstanding blockers are **data acts, not decisions** — none
requires further discussion, and all can be completed without inspecting any outcome.

**Blocker 1 — Price-series authority not selected.** All sixteen §3 fields are
unpopulated, including the frozen snapshot filename and hash. The document cannot be
signed with an unnamed data source.

**Blocker 2 — Pre-lock data integrity inspection not performed.** §15 cannot be resolved
either way until §19.1 has run. The lock must state either that no missing-date rule is
required, or what that rule is.

**Blocker 3 — Reference date and reference values not frozen.** §5 and §6.2 contain
placeholders. Bands cannot be stated absolutely until the reference values are regenerated
from the frozen price file. Day-zero convention (OQ-3) must be locked in the same pass, and
both §1.1 ceilings recomputed algebraically from the frozen constants.

**Note on execution.** All three blockers require the HalvingLens repository and a selected
price source. They cannot be discharged from the methodology document alone. Once the
series is chosen and the snapshot committed, the remaining work is mechanical: populate,
inspect, compute, compare against the Dashboard, and return for sign-off.

**On clearing all three:** populate §0, §1.1, §3, §4, §5, §6.2, §14 and §15; return for
founder sign-off; commit; assign the methodology version; create the immutable tag; then
B1 may begin.

**OQ-1 does not block sign-off or B1.** It blocks the module shipping, and should be
settled while B1 runs.
