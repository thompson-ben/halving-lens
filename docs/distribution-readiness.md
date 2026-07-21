# Distribution readiness (P7)

Making the existing platform better support the current distribution strategy
(YouTube Shorts, TikTok/Reels, X, weekly long-form, Reddit, PR). **No new content
tooling** (P7.3) — the content packs + share infra already exist; this improves
the *destination* pages content links to.

## P7.1 — Shareable landing links (already in place)
Verified across the major pages:
- **OG images** — per-page `opengraph-image.tsx` exists for the key content pages
  (research findings, weekly, briefs, notes, brief, plus flagship analysis pages
  like state-of-bitcoin, accumulation, market-health, etf, similar-moments,
  historical-price-paths). Others fall back to the site `/og`.
- **Canonicals + OG/Twitter metadata** — added across public pages in PR3a/3c;
  titles standardised to `Topic | HalvingLens`.
- **UTM support** — first-touch attribution (`captureAttribution`/`getAttribution`)
  captures `utm_*` + `ref`/`hlr`/`hlc` on landing and carries them through signup.

## P7.2 — Content → subscription path (this change)
Every distributed **research** content page now ends with a contextual
subscription CTA (`ArticleSubscribe`, reusing `BriefSignup` so the PR1
subscription contract + attribution come for free):
- `/research/findings/[slug]`
- `/weekly/[slug]`
- `/research/briefs/[slug]`
- `/research/notes/[slug]`

Copy is context-sensitive ("Get this context in your inbox each morning"), and
`BriefSignup` stamps `source = pathname` + attribution on the signup event, so
conversions from a shared link are attributed to the page (and campaign).

## P7.3 — No new content tooling
Reused the existing signup component; added no generators or dashboards.

## Small follow-up (not in this PR)
The daily-brief pages (`/brief`, `/brief/[date]`) render via the shared
`BriefBody` / `StoredBriefBody` components and already carry the site-chrome
subscribe routes (nav CTA + footer). Adding an inline end-of-brief
`ArticleSubscribe` there is a nice-to-have but touches shared brief-rendering
components — deferred to keep this change low-risk.
