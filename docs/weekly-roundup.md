# Weekly Round-up + Retention Analytics (Phase 5)

## Weekly Round-up email

A personalised Sunday retention note, separate from the Weekly Research report.

- **General sections** (same for everyone, computed once per send): the market
  this week (Context Score + Accumulation band + Fear & Greed), the most-read
  content this week, "What's new" (`ROUNDUP_FEATURES`, editable/env), and the
  latest YouTube (shown when `LIFECYCLE_YOUTUBE_URL` is set).
- **Personal block** (members with an Investor Profile only): current + longest
  reading streak, referrals, referral **leaderboard position**, and achievements.
  Subscribers without a profile see a gentle "create your profile" nudge instead.
- **Sending:** `npm run send-roundup` in the daily workflow — **Sunday-gated** and
  **idempotent per ISO week** (logged in `weekly_email_deliveries` under a
  `roundup-YYYY-Www` slug), so it's safe to run daily. Personalised from two
  prefetched maps (profiles, referral counts) so per-recipient cost is just the send.
- **Preview:** `/api/admin/email-preview?email=roundup`.

## Retention analytics (Founder Dashboard → "Retention & habit")

Computed in `src/lib/retentionAnalytics.ts` from member profiles + the event
stream: total members, founding members, active-this-week, average current
streak, longest streak, returning sessions (7d), average DAU (7d), and the
**reading-streak distribution** (No streak / 1–6 / 7–29 / 30–99 / 100+).

## Config

`ROUNDUP_FEATURES` (JSON array of `{title, desc, href}`) · `LIFECYCLE_YOUTUBE_URL`
(shared with onboarding).
