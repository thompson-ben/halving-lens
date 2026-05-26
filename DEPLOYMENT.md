# Deployment guide

Walks through getting Supercar Content Engine running on Vercel + Supabase
end-to-end. **~30 minutes** if you already have GitHub, Supabase, and Vercel
accounts.

The app boots with mock data and zero API keys, so you can have a working
URL before touching any of the optional connectors.

---

## Prerequisites

- GitHub access to `thompson-ben/claude`
- A **Supabase** account — free tier is plenty
- A **Vercel** account — Hobby tier (free) supports the daily cron
- *(optional)* An OpenAI API key, Meta/Instagram credentials, etc. — only
  needed when you flip `USE_MOCK_DATA=false` later

You don't need anything installed locally for the deploy itself, but the
schema-push step in Step 5 wants Node 20+ and `npm`.

---

## Step 1 — Merge the deployment branch

`feat/vercel-supabase-ci` carries the changes Vercel and Supabase need:

- `prisma generate && next build` in the build script (so the Prisma
  client is built on Vercel)
- `directUrl` in `prisma/schema.prisma` (so migrations use Supabase's
  direct connection while runtime uses the pooler)
- `vercel.json` with a daily cron
- GitHub Actions for lint + typecheck on PRs

Open the PR and merge it into `main`:

<https://github.com/thompson-ben/claude/pull/new/feat/vercel-supabase-ci>

Every other feature branch is independent and can merge in any order after
this one lands.

---

## Step 2 — Create the Supabase project

1. <https://supabase.com/dashboard> → **New project**
2. Name it (e.g. `supercar-content-engine`), set a strong database password
   (save it somewhere — you can't read it back later), pick a region near
   your users.
3. Wait ~2 minutes for provisioning.
4. Once it's up: **Project Settings → Database → Connection string**.
5. Grab **two** strings:

   - **Transaction pooler** (port `6543`) → this becomes `DATABASE_URL`.
     Format:
     `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true`
   - **Direct connection** (port `5432`) → this becomes `DIRECT_URL`.
     Format:
     `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`

   Substitute the database password into `[YOUR-PASSWORD]` in both
   strings. The Supabase UI literally shows `[YOUR-PASSWORD]` as a
   placeholder; it does **not** auto-fill.

Why two URLs? Vercel serverless functions reuse short-lived connections —
the pooler (PgBouncer) is required to avoid exhausting Postgres
connection slots. But Prisma migrations need a direct connection because
PgBouncer doesn't support some of Prisma's metadata queries. The split
keeps both happy.

---

## Step 3 — Generate `CRON_SECRET`

Used to authenticate Vercel's daily cron when it hits `/api/instagram/sync`.

```bash
openssl rand -hex 32
```

Save the output. Anything cryptographically random with 32+ bytes is fine.

---

## Step 4 — Create the Vercel project

1. <https://vercel.com/new> → **Import** `thompson-ben/claude` from GitHub.
2. Framework preset: **Next.js** (auto-detected).
3. Root directory: leave as `./`.
4. Build & output settings: leave as defaults — the `package.json` build
   script handles it.
5. Before clicking **Deploy**, expand **Environment Variables** and add:

   **Required (won't boot without these):**

   | Name | Value |
   | --- | --- |
   | `DATABASE_URL` | Supabase pooled string from Step 2 |
   | `DIRECT_URL` | Supabase direct string from Step 2 |
   | `CRON_SECRET` | Output from Step 3 |
   | `USE_MOCK_DATA` | `true` (flip to `false` after you've added real keys) |
   | `NEXT_PUBLIC_APP_URL` | Your Vercel domain, e.g. `https://supercar-content-engine.vercel.app` (you can update after first deploy) |

   **Optional (add when you have the credentials; everything has a mock fallback):**

   | Name | Where to get it |
   | --- | --- |
   | `OPENAI_API_KEY` | <https://platform.openai.com/api-keys> |
   | `OPENAI_MODEL` | `gpt-4o-mini` is the default |
   | `META_APP_ID` / `META_APP_SECRET` / `META_REDIRECT_URI` | <https://developers.facebook.com/apps> (see `META_API_SETUP.md`) |
   | `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_BUSINESS_ACCOUNT_ID` / `FACEBOOK_PAGE_ID` | Same — `META_API_SETUP.md` walks through it |
   | `YOUTUBE_API_KEY` | <https://console.cloud.google.com/apis> — enable Data API v3 |
   | `TIKTOK_ACCESS_TOKEN` | <https://developers.tiktok.com> — needs OAuth (own account only) |
   | `TWITTER_BEARER_TOKEN` | <https://developer.twitter.com> — recent search needs Basic tier ($100/mo) |

6. Click **Deploy**. The first deploy will succeed at build time but
   any page that hits Prisma will 500 until you apply the schema in Step 5.

---

## Step 5 — Apply the database schema

You only need to do this once. Easiest path: from a local clone.

```bash
git clone https://github.com/thompson-ben/claude
cd claude
git checkout main           # after Step 1 merged
npm install

# Point a local .env.local at Supabase. Don't commit this.
cat > .env.local <<'EOF'
DATABASE_URL="postgresql://postgres.xxxxx:PWD@aws-0-xxxxx.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxx:PWD@aws-0-xxxxx.pooler.supabase.com:5432/postgres"
USE_MOCK_DATA=true
EOF

# Create the tables on Supabase
npx prisma db push

# Seed default sources + mock historical posts so analytics has data
npm run db:seed
```

Both commands run against the **direct** URL because that's how Prisma is
configured. They typically finish in under 30 seconds.

If you'd rather avoid the local clone, you can:
- Run the equivalent in any Node environment that can reach Supabase, or
- Use `prisma migrate dev` + commit the migration to the repo (preferred
  long-term but more setup for the first run)

---

## Step 6 — Verify the deployment

1. Visit your Vercel URL.
2. Dashboard should load with stats populated from seeded mock posts.
3. Click **Sync IG** in the top bar — should report
   `Synced N mock posts (live IG not configured)`. That confirms the
   route handler can talk to Supabase.
4. Visit `/discovery` — you should see ~8 mock items in the queue.
5. Visit `/analytics` — charts should be populated from the 60 seeded
   historical posts.

If a page 500s with `Can't reach database server`, the most likely cause
is `DATABASE_URL` pointing at the wrong host — Supabase uses
`<region>.pooler.supabase.com`, not the older `db.<ref>.supabase.co`.

---

## Step 7 — *(optional)* Merge connector branches

Six branches are open, each adding a connector and its `Sync` button.
Independent — merge in any order:

- `feat/rss-connector` — Car blog RSS feeds (no API key needed)
- `feat/youtube-connector` — YouTube Shorts via Data API v3
- `feat/tiktok-connector` — TikTok Display API (own-account only)
- `feat/twitter-connector` — X / Twitter v2 media tweets
- `feat/auction-connector` — Bring a Trailer RSS
- `feat/competitor-scan` — Wires the competitor watchlist into a scan job

Each has the same two `react/no-unescaped-entities` fixes. Whichever
merges *second after* `feat/vercel-supabase-ci` will need a 30-second
conflict resolve on those two lines (`git checkout --ours` works).

URLs to open the PRs:

- <https://github.com/thompson-ben/claude/pull/new/feat/rss-connector>
- <https://github.com/thompson-ben/claude/pull/new/feat/youtube-connector>
- <https://github.com/thompson-ben/claude/pull/new/feat/tiktok-connector>
- <https://github.com/thompson-ben/claude/pull/new/feat/twitter-connector>
- <https://github.com/thompson-ben/claude/pull/new/feat/auction-connector>
- <https://github.com/thompson-ben/claude/pull/new/feat/competitor-scan>

---

## Step 8 — *(when ready)* Switch off mock data

Once you've added at least one real API key (start with `OPENAI_API_KEY`
for proper AI scoring), in Vercel:

- Set `USE_MOCK_DATA` = `false`
- Hit **Redeploy** (Deployments tab → latest → Redeploy)

Now `Sync IG` / `Sync RSS` / etc. pull real data. Anything still
missing credentials falls back to mock at the wrapper level
(`hasInstagramCredentials()`, `hasYouTubeCredentials()`, etc.), so a
partial setup is fine.

---

## Cron schedule

`vercel.json` defines:

```json
{
  "crons": [
    { "path": "/api/instagram/sync", "schedule": "0 4 * * *" }
  ]
}
```

That runs daily at **04:00 UTC**. Verify it's wired up in
Vercel dashboard → your project → **Crons** tab. The `Authorization`
header is set automatically by Vercel using `CRON_SECRET`.

Each connector also exposes a `GET /api/<connector>/sync` guarded by
the same secret, so adding cron entries for RSS, YouTube, Twitter,
TikTok, and auctions is one JSON line each once those branches land.

---

## Troubleshooting

| Symptom | Likely fix |
| --- | --- |
| Build fails with `Environment variable not found: DATABASE_URL` | Add `DATABASE_URL` *and* `DIRECT_URL` to Vercel env vars |
| Build succeeds but pages 500 with `Can't reach database server` | Connection string host is wrong — should be `<region>.pooler.supabase.com` |
| `prisma db push` hangs | You're using the pooler URL instead of the direct one for migrations |
| Cron returns 401 in the Vercel logs | `CRON_SECRET` in Vercel doesn't match — regenerate, set on the env var, redeploy |
| Analytics page is empty | `npm run db:seed` was never run; do it once from local |
| Dashboard shows 0 lifetime likes after sync | `USE_MOCK_DATA=true` but you also ran the live sync; the live route only writes new posts. Toggle and re-seed |
| `Sync IG` returns `usingMock: true` despite credentials being set | Unset `USE_MOCK_DATA` (or set it to `false`); Vercel needs a redeploy to pick up env var changes |
| First deploy on Vercel: "Module not found: '@prisma/client'" | Confirm the build script is `prisma generate && next build` — that's only on the deployment branch, so make sure Step 1 merged before deploying |

---

## What's wired up after this guide

After Steps 1–6 you have:
- Live URL on Vercel, backed by Supabase Postgres
- All UI pages working with seeded mock data
- IG sync route reachable (mock until you add Meta keys)
- Cron firing daily at 04:00 UTC (mock data sync until you flip the flag)
- CI running lint + typecheck on every PR

After Step 7 (merging connectors) you also have:
- RSS / YouTube / TikTok / X / auction sync routes
- "Scan now" on the competitors page for IG business_discovery

Send the deployment URL to Claude and we'll verify it from this end before
continuing with Phase 3 work (duplicate detection, repost cooldown, trend
analysis).
