# Lifecycle & Onboarding Engine

Turns a new (or existing) subscriber through a config-driven onboarding email
sequence, without ever interrupting the Daily Brief. This is Phase 1 of the
lifecycle platform; later phases (Investor Profile, streaks, achievements,
referral platform, entitlements, Hall of Founders, analytics) build on top.

## How it works

- **The sequence is data, not code.** Every onboarding email is one entry in
  `LIFECYCLE_STEPS` (`src/lib/lifecycleEmails.ts`) with a stable `id`, a
  `dayOffset`, a `subject`, and a `build(ctx)` that returns `{ html, text }`.
  Adding, reordering or disabling an email is a config change — the engine and
  sender need no edits.
- **Enrolment anchor** (`src/lib/lifecycle.ts`):
  `anchor = max(signup_at, LIFECYCLE_LAUNCH)`. New subscribers drip from signup;
  subscribers who joined *before* onboarding existed are enrolled from the launch
  date, so they experience the sequence from the start rather than receiving
  every email at once.
- **Idempotent progress.** Each send is recorded as one row in `lifecycle_sends`
  (`(lower(email), step)` unique). A step is only ever sent once.
- **One email per subscriber per run.** The daily job sends the single next due
  step, so the sequence drips instead of arriving together.
- **Catch-up bound** (`LIFECYCLE_CATCHUP_DAYS`, default 30): a step is sent only
  within N days of becoming due. This lets a missed cron day still deliver, and —
  importantly — stops a *newly inserted* early email from back-blasting members
  who are already well past that point.

## The sequence (Phase 1)

| id | day | subject |
|----|-----|---------|
| — (welcome) | 0 | *Immediate* on signup — improved Welcome (see `welcomeEmail.ts`) |
| `tour` | 1 | Start here: the 5-minute tour |
| `different` | 2 | Why HalvingLens is different |
| `youtube` | 4 | Prefer watching instead? |
| `referral` | 6 | Unlock more with referrals |
| `advanced` | 10 | Get even more from HalvingLens |

The `tour` step supersedes the old standalone "showcase" email; the migration
seeds `lifecycle_sends` so anyone who already got the showcase never gets `tour`.

## Configuration (`src/lib/lifecycleConfig.ts`, all env-overridable)

- `LIFECYCLE_LAUNCH` (`YYYY-MM-DD`) — back-enrolment date for existing subscribers.
- `LIFECYCLE_YOUTUBE_URL` — the YouTube channel. Until set, the YouTube email and
  links adapt gracefully ("coming soon" / link to on-site analysis) instead of
  pointing somewhere broken.
- `LIFECYCLE_CATCHUP_DAYS` — the send window described above.

## Operating it

- **Enable:** run `supabase/lifecycle.sql` once (creates `lifecycle_sends` and
  seeds the showcase→tour migration).
- **Scheduling:** `npm run send-lifecycle` runs in the daily sync workflow after
  the brief. Idempotent and safe to run daily; non-fatal.
- **Preview any email:** `/api/admin/email-preview?email=lifecycle&step=<id>`
  (omit `step` to list them). `?email=welcome` previews the improved Welcome.

## Adding a new onboarding email later

Add an entry to `LIFECYCLE_STEPS` with a new `id` and `dayOffset`. Existing
members past that offset's catch-up window won't receive it; anyone still within
the window (and future subscribers) will get it on cadence. No migration needed.
