# Pro discovery — measurement conventions and checkpoint guide

Founder commission (Pro discovery & measurement, Sep 2026). This is the one
place the conventions live; the code cites this file.

## The three concepts, kept distinct

| Concept | Where it lives | Values |
| --- | --- | --- |
| **Acquisition source** — where the visitor came from | `?via=` on the /pro URL → the `via` prop on analytics events ONLY | `dashboard` · `nav` · `brief-footer` · `onboarding-email` · `announcement-email` · `verify` (+ `other` for anything unrecognised) |
| **Signup surface** — where the join happened | the authoritative `pro_waitlist.source` column | `/pro` (the offer page); historic values `/cycle-dashboard#pro-early-access` and `brief-footer` remain untouched forever |
| **Offer version** — what was on the page | the `offer` prop on analytics events ONLY | `pro_beta_15_v1` |

`via` never replaces the waitlist row's source and never enters the table.
Historic joins are never re-labelled. First-touch marketing attribution
(`hl.attr`, UTM/ref fields) is a separate, untouched system — `via` is not a
UTM field, so it can never overwrite anyone's first touch.

The Brief-footer switchover boundary: rows with `source = 'brief-footer'`
predate the footer's move to /pro; from the deploy of that move, Brief-
attributed interest appears as `via = brief-footer` on events with
`source = '/pro'` on rows. Report the two eras side by side, never merged.

## Event inventory (all in the existing `events` table; no emails, ever)

| Event | Meaning | Key props |
| --- | --- | --- |
| `page_view` (path `/pro`) | a page load; sessions are SESSIONS, not people | `path`, `session_id` |
| `pro_offer_view` | one offer-page view — an OPPORTUNITY to see the price, not attention | `via`, `offer` |
| `section_view` (id `pro-offer-form`) | the price+form section became visible | `id` |
| `pro_offer_cta` | a CTA click — interest, never a join | `placement` (hero/form), `via`, `offer` |
| `pro_waitlist_join` | confirmed NEW capture (fires only on API "created") — INTEREST, never a purchase or price acceptance | `source`, `via`, `offer`, first-touch attribution |
| `pro_waitlist_existing` | an existing member re-submitting — counted separately, no attribution props | `source`, `via`, `offer` |
| `email_click` | confirmed email engagement (signed redirect) | `campaign` (`lifecycle-pro_intro`, `pro-announcement-2026-09`), `cta`, `sub` (hash) |

## Exclusions

- `via = verify` — controlled release-verification traffic (the
  pro-verification workflow's walkthrough). Excluded from EVERY reporting
  query. The walkthrough never creates waitlist joins (it submits an invalid
  address, stopped client-side) and never sends email.
- The internal founder/test address is excluded from all email audiences by
  the env-derived rule (never hardcoded).
- Known gaps to state in any report: client events under-count (ad blockers,
  disabled JS, beacon loss); the `pro_waitlist` table and `email_click`
  redirects are server-side and complete — the table is always authoritative
  for joins.

## Where to inspect (Supabase SQL editor / PostgREST)

```sql
-- /pro page views + unique sessions (sessions, not people)
select count(*) as views, count(distinct session_id) as sessions
from events where name = 'page_view' and path = '/pro' and created_at >= :since;

-- offer views by acquisition source (verify excluded)
select coalesce(props->>'via','(direct)') as via, count(*)
from events where name = 'pro_offer_view' and created_at >= :since
  and coalesce(props->>'via','') <> 'verify' group by 1 order by 2 desc;

-- form-section visibility
select count(*) from events
where name = 'section_view' and props->>'id' = 'pro-offer-form' and created_at >= :since;

-- CTA clicks by placement and source (verify excluded)
select props->>'placement' as placement, coalesce(props->>'via','(direct)') as via, count(*)
from events where name = 'pro_offer_cta' and created_at >= :since
  and coalesce(props->>'via','') <> 'verify' group by 1, 2 order by 3 desc;

-- NEW joins attributed to /pro: the TABLE is authoritative…
select count(*) from pro_waitlist where source = '/pro' and created_at >= :since;
-- …and the events add offer version + acquisition source (verify excluded)
select coalesce(props->>'via','(direct)') as via, count(*)
from events where name = 'pro_waitlist_join' and created_at >= :since
  and coalesce(props->>'via','') <> 'verify' group by 1;

-- existing-member re-submissions (separate; never conversions)
select count(*) from events where name = 'pro_waitlist_existing' and created_at >= :since;

-- email placements: confirmed clicks per campaign
select props->>'campaign' as campaign, count(*)
from events where name = 'email_click' and created_at >= :since
  and props->>'campaign' in ('lifecycle-pro_intro','pro-announcement-2026-09') group by 1;
```

## Workflows (all dispatch-only — nothing here is scheduled or automated)

1. **`Pro production verification`** (`pro-verification.yml`)
   - `mode=checks` — read-only availability run; its log line
     `PRODUCTION AVAILABILITY CONFIRMED at <ts>` is the release-availability
     timestamp (distinct from CI completion).
   - `mode=activity` — the controlled walkthrough (`via=verify`); its log line
     `ANALYTICS VERIFICATION CONFIRMED at <ts>` is the tracking-verified
     timestamp. Run it once after each relevant deploy.
2. **`Pro discovery report`** (`pro-discovery-report.yml`) — the reusable
   checkpoint. Inputs: `since` = the tracking-verified DATE (from the activity
   run), `days` (default 7). Read-only; prints exposure, interest, source
   breakdown, rates with stated denominators, go-live annotations
   (first-observed per placement) and the three-band reading:
   too little exposure · exposure with limited interest · interest worth
   conversations. It never changes pricing/positioning — bands are review
   aids, and low exposure yields a distribution recommendation, not a demand
   conclusion.
3. **`Pro announcement (one-time)`** (`pro-announcement.yml`) — dry-run /
   test / send (double-gated). Send requires explicit founder approval of
   copy, audience and dispatch.

## Overlap rule (one Pro introduction per address, ever)

The day-18 onboarding step and the one-time announcement both record
`lifecycle_sends` step `pro_intro` on provider acceptance; each excludes
addresses the other has recorded. Existing Pro waitlist members are excluded
from both at send time. The `pro_intro` step also carries an introduction
date (`PRO_INTRO_FROM`): subscribers whose day-18 due date predates it are
never caught up — adding the step produced no retrospective batch.
