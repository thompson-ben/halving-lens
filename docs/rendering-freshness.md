# Rendering & freshness model (P3.5 review)

A review of how public pages render and how fresh their data is, with ISR
candidates. **No rendering modes were changed blind in this pass** — converting a
`force-dynamic` page to static/ISR can change data freshness, so any conversion
is called out here as a recommendation to make deliberately and verify against
the data pipeline, not a change to ship untested.

## How the site stays fresh today

Market/cycle data lives in a committed snapshot that a scheduled job refreshes
(the `chore(data)` commits). Each refresh triggers a redeploy, so **statically
rendered pages are rebuilt with current data on every refresh** — they are fast,
cacheable and indexable, and still current to the last refresh. This is the
right default for almost every public page and needs no change.

## Public pages that are `force-dynamic`

| Page | Why dynamic today | Recommendation |
|------|-------------------|----------------|
| `/founders` | Reads live subscriber/profile data from Supabase per request; already `noindex`. | **Keep dynamic.** Correct — it's personalised/live and not indexed. |
| `/state-of-bitcoin` | Live reads (cycle/sentiment). | **Candidate for ISR** (`export const revalidate = 3600` or similar) — indexable + cached while staying fresh. Verify the live reads tolerate caching before switching. |
| `/etf` | Live ETF flow reads. | **Candidate for ISR.** Same caveat. |
| `/market-health` | Live market-health reads. | **Candidate for ISR.** Same caveat. |

All other public routes are already static (rebuilt per data refresh) — verified
in the production build output (`○`/`●`), e.g. `/`, `/cycles`, `/metrics`,
`/metrics/[slug]`, `/sentiment`, `/accumulation`, `/about`, `/methodology`,
`/terms` all render static.

## Recommended follow-up (deliberate, verified — not in this PR)

1. For `/state-of-bitcoin`, `/etf`, `/market-health`: trial `revalidate` (ISR)
   instead of `force-dynamic`, confirming the underlying data helpers work under
   caching and that freshness (bounded by the revalidate window + the daily
   refresh redeploy) is acceptable. Document the chosen window per page.
2. Leave `/founders` dynamic (live, noindex).

## Freshness model summary (for the record)

- **Static (most pages):** current to the last data-refresh deploy (≈ intraday).
- **Dynamic (`/founders`):** live per request.
- **Evergreen/legal (`/about`, `/methodology`, `/privacy`, `/terms`, `/learn`,
  `/halving`):** static; sitemap `lastModified` fixed to a "last reviewed" date
  so it doesn't churn every deploy (P3.6).
