# Roadmap

A staged plan from a single-user prototype to a SaaS product for social media
theme pages and luxury automotive brands.

---

## ✅ Shipped in v0.1 (this repository)

- Premium dark UI with sidebar / top bar / dashboard shell.
- Source toggles (Instagram, TikTok, YouTube Shorts, X, RSS, auctions, manual).
- Discovery queue with card-based review (shortlist / approve / reject).
- Manual URL import with platform & car detection.
- AI quality scoring (OpenAI with heuristic fallback) + "why this should
  perform well" reasoning.
- AI caption generator: short / luxury / question variants + hashtags + credit
  line.
- Instagram Graph API client + OAuth callback + sync route.
- Performance learning engine: lift-based model trained from your own posts.
- Historical analytics dashboard: brand lift, hour-of-day, day-of-week,
  hashtag lift, top posts, weekly timeline.
- Posting calendar (week view) + scheduling API.
- Competitor monitoring (CRUD + table view).
- Approval workflow with status timeline; auto-post off by default.
- Full Prisma schema for all required models.
- Seed script that boots a realistic demo from a fresh clone.
- README, Meta API setup guide, environment template.

---

## Phase 1 — Instagram analytics ✅ baseline shipped

- [x] Historical post import (60+ posts) with caption, hashtag, time, theme.
- [x] Performance metrics (likes, comments, reach, impressions, saves, shares).
- [x] Best brand / model / time / day / caption-style breakdown.
- [x] Top posts board.
- [ ] **Cohort comparison**: compare last-30-days vs prior-30-days.
- [ ] **Carousel / Reel separation** in dashboards.
- [ ] **Story metrics** when available.

## Phase 2 — Content sourcing engine

- [x] Manual URL import + AI scoring on ingest.
- [ ] **TikTok Display API** connector (`src/lib/tiktok.ts`).
- [ ] **YouTube Data API v3** connector for Shorts.
- [ ] **X / Twitter v2** connector for media tweets.
- [ ] **RSS** connector that pulls car-blog feeds and extracts og:image.
- [ ] **Auction site** connectors (Bring a Trailer, RM Sotheby's, etc.) via
      structured RSS or sitemap polling.
- [ ] Watchlist of **competitor accounts** drives sourcing (we already store
      them; wire the scan job in next).

## Phase 3 — AI scoring & trend analysis

- [x] AI quality score + rationale.
- [x] Performance learning engine (lift model).
- [ ] **Duplicate detection** via perceptual image hashing.
- [ ] **Repost cooldown tracking** enforced against historical posts.
- [ ] **Trend detection**: which makes / formats are accelerating week-over-week.
- [ ] **"Similar to top performers"** queue tab.
- [ ] **Engagement prediction calibration** — feed real post-publish results
      back into the model and report MAE over time.

## Phase 4 — Automated scheduling & posting

- [x] Schedule API + calendar UI.
- [ ] **Background worker** (BullMQ / Inngest / Trigger.dev) for time-based
      publishing.
- [ ] **Meta `media_publish` flow** end-to-end for images and Reels.
- [ ] **Slack / Discord notifications** on publish success/failure.
- [ ] **Optimal-time suggestions** in the scheduler based on the learned model.
- [ ] **Caption A/B testing** built into the scheduler.

## Phase 5 — Monetisation, multi-account & SaaS prep

- [ ] **Multi-account** support — accounts table, RLS on every query.
- [ ] **Team roles** (owner / editor / reviewer).
- [ ] **Stripe billing** with usage tiers (posts / AI calls / connected accounts).
- [ ] **Audit log** of every approval, post, and AI suggestion.
- [ ] **Webhook API** so brands can wire the engine into their own systems.
- [ ] **White-label theme** support (per-account brand colors / logo).
- [ ] **Public landing page** + onboarding flow.

---

## Open ideas / parking lot

- Pinterest, Reddit, Threads connectors.
- LLM-based visual tagging (colour palette, time of day, scene, plate
  detection for blurring).
- Auto-attribution outreach: pre-drafted DM templates for permission requests.
- "Vault" for raw, rights-cleared media reuse.
- Mobile companion app (Expo) for on-the-go approval.

---

## Non-goals

- **No unsafe automation.** No follow/like/comment bots, no shadow account
  cycling, no proxy farms.
- **No aggressive scraping.** Every source connector uses an official API or
  a public RSS/sitemap feed; nothing pretends to be a browser session it
  isn't.
- **No copyright laundering.** Attribution and rights tracking are
  first-class data, not afterthoughts.
