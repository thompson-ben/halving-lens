# Supercar Content Engine

> Instagram content sourcing, scoring, and performance engine for a curated
> luxury / supercar repost account. Built as a standalone, production-ready
> Next.js application.

---

## What it does

A premium content operations dashboard:

- **Source Selection** — toggle Instagram, TikTok, YouTube Shorts, X/Twitter, RSS feeds, auction sites, and manual URL imports.
- **Discovery Queue** — review potential posts with thumbnails, engagement stats, AI quality scores, and "why this should perform well" reasoning.
- **Instagram Historical Analysis** — pull your own posts via the official Meta Graph API and break down performance by car make/model, posting hour, day of week, caption style, hashtags, and theme.
- **Performance Learning Engine** — train an explainable lift-based model from your history and rescore the discovery queue automatically.
- **AI Caption Generator** — produce four caption variants plus a hashtag set and credit line per shortlisted item.
- **Approval Workflow** — `Discover → Shortlist → Approve → Schedule → Posted`. Auto-post is **disabled by default** for account safety.
- **Posting Calendar** — week view of scheduled content.
- **Competitor Monitoring** — track other supercar accounts for sourcing and benchmarking.
- **Premium Dark UI** — Linear / modern-trading-dashboard aesthetic, mobile-friendly.

The app gracefully falls back to rich mock data when no API credentials are configured, so a fresh clone is immediately demonstrable.

---

## Tech stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** with a custom dark palette and gold accent
- **Prisma ORM** targeting **PostgreSQL** (Supabase / Neon / RDS) — SQLite-compatible for local dev
- **OpenAI** (`gpt-4o-mini` by default) for caption generation & AI scoring
- **Meta Graph API v21** for Instagram historical insights & publishing
- **Recharts** for analytics visualisations
- **Zod** for request validation
- Modular connector design — new sources slot into `src/lib/` without touching the rest of the app

---

## Repository layout

```
.
├── prisma/
│   ├── schema.prisma          # All 9 required models
│   └── seed.ts                # Seeds default sources, settings, mock content & history
├── src/
│   ├── app/
│   │   ├── api/               # Route handlers (sources, content, instagram, captions, schedule, …)
│   │   ├── page.tsx           # Dashboard
│   │   ├── discovery/         # Discovery queue
│   │   ├── analytics/         # Historical performance dashboard
│   │   ├── calendar/          # Posting calendar
│   │   ├── import/            # Manual URL import
│   │   ├── competitors/       # Competitor monitoring
│   │   └── settings/          # Source toggles, IG connect, posting settings
│   ├── components/            # Sidebar, TopBar, ContentCard, StatCard, …
│   ├── lib/
│   │   ├── prisma.ts          # Prisma singleton
│   │   ├── env.ts             # Typed env access
│   │   ├── instagram.ts       # Meta Graph API wrapper (with mock fallback)
│   │   ├── openai.ts          # Caption / scoring (with deterministic fallback)
│   │   ├── scoring.ts         # Performance learning engine
│   │   ├── mockData.ts        # Seed + dev fallback data
│   │   └── utils.ts           # car detection, formatting, hashtag extraction
│   └── types/                 # Shared enums & labels
├── .env.example
├── META_API_SETUP.md
├── ROADMAP.md
└── README.md
```

---

## Quickstart

### 1. Install

```bash
git clone <repo-url> supercar-content-engine
cd supercar-content-engine
npm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

The minimum to boot is `DATABASE_URL`. Everything else has safe fallbacks (mock data + heuristic scoring) so the dashboard works without external credentials.

The schema uses `String[]` and `Json` columns, so **PostgreSQL** is the supported target out of the box (Supabase, Neon, RDS, or local). Point `DATABASE_URL` at it:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/supercar_engine?schema=public"
```

If you specifically want SQLite for a fast local prototype, change `provider` in `prisma/schema.prisma` to `"sqlite"` and replace `String[]`/`Json` columns with their SQLite-friendly equivalents (comma-strings / string blobs).

### 3. Database

```bash
npm run db:push       # apply schema
npm run db:seed       # populate default sources + rich mock content/history
```

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Connecting Instagram

The engine uses the **official Meta Graph API** — no scraping, no automation hacks.

1. Walk through [`META_API_SETUP.md`](./META_API_SETUP.md) to create a Meta app, link your IG Business Account to a Facebook Page, and obtain a long-lived access token.
2. Drop the values into `.env.local`:

   ```env
   META_APP_ID=...
   META_APP_SECRET=...
   META_REDIRECT_URI=http://localhost:3000/api/instagram/callback
   INSTAGRAM_ACCESS_TOKEN=...
   INSTAGRAM_BUSINESS_ACCOUNT_ID=...
   FACEBOOK_PAGE_ID=...
   ```

3. Visit `/settings` → **Connect Instagram Business Account** to verify, or just hit **Sync IG** in the top bar to import your last 60 posts and insights.
4. Hit **Rescore queue** to retrain the performance model and refresh queue scoring against your real data.

---

## Workflow

```
              Sync IG  ──►  Historical posts + metrics
                                    │
                                    ▼
                         Performance Learning Engine
                                    │
                                    ▼
  Sources ─► Discovery Queue ─► Score ─► Shortlist ─► Approve ─► Schedule ─► Posted
                ▲                                                              │
                │                                                              ▼
                └────────── Performance feedback ◄──── Post metrics ◄──── Auto-monitor
```

Auto-post is gated behind a settings flag (`auto_post_enabled`) — **off by default** for account safety.

---

## Constraints & safety

- No scraping of platforms without official APIs.
- No spam / automation behaviours.
- Every imported piece of content tracks **attribution** and a **rights status** field.
- Manual approval workflow is the default and the recommended mode.
- The discovery queue surfaces credit lines for every item so attribution stays visible.

---

## Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start Next.js in dev mode                |
| `npm run build`      | Production build                         |
| `npm run start`      | Start production server                  |
| `npm run lint`       | Lint                                     |
| `npm run typecheck`  | Strict TypeScript check                  |
| `npm run db:push`    | Push Prisma schema                       |
| `npm run db:migrate` | Create + apply migrations                |
| `npm run db:seed`    | Seed default sources + mock content      |
| `npm run db:studio`  | Open Prisma Studio                       |

---

## Roadmap

See [`ROADMAP.md`](./ROADMAP.md).

## License

Proprietary — all rights reserved. Treat this as your private product codebase.
