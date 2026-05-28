# Halving.lens — Handover

> Read this first. Everything a new Claude Code session (or human
> contributor) needs to pick up where the concept work left off.

---

## 1. Product

**Halving.lens** — _"The clearest view of the Bitcoin cycle."_

A premium, Bitcoin-only cycle intelligence platform. Every paid
Bitcoin cycle chart, free, with halving-aligned overlays nobody else does
properly.

The tagline matters because it tells you what the product **isn't**:

- NOT a CoinGecko / CoinMarketCap clone
- NOT a TradingView clone
- NOT a multi-chain analytics terminal
- NOT a retail trading interface

### Why this exists

CoinGecko shows you what a token _did_. Glassnode and CryptoQuant show
you the right charts but charge $30–800/mo for the full library. Free
sites like Look Into Bitcoin cover a slice but ship one chart at a time
with no cycle overlays.

The wedge: **every metric, aligned to halving day zero, across all four
cycles.** That comparison view doesn't exist anywhere free. It's the
moat.

### Non-negotiables

| Stay | Don't build |
|---|---|
| Bitcoin-only | ETH / SOL / altcoins / DeFi |
| Cycle-focused | Generic crypto dashboards |
| Visually premium | "Crypto casino" aesthetics |
| Screenshot-first | Auth / billing / portfolio (yet) |
| Free core | Mobile apps |
| Halving-aligned overlays | Public API (yet) |

The opportunity is to be **THE BEST** at one thing, not the broadest at
many.

### Aesthetic target

"Bloomberg Terminal meets Apple."

- Premium, calm, intelligent, institutional
- Restrained dark palette
- Generous whitespace
- Editorial typography
- Charts ARE the product

---

## 2. What's built

### Pages (live in app/)

| Route | What it does |
|---|---|
| `/` | Cycle dashboard — clock, Composite Cycle Index, **Cycle Analog** ("today most closely resembles Cycle 4 at day 485"), normalised 4-cycle overlay, 6 metric cards, Cycle Replay teaser |
| `/cycles` | Full 4-cycle overlay + per-cycle stats table + diminishing returns vs supercycle copy |
| `/replay` | **Signature interactive feature.** Scrub through 1458 days of halving cycle. Watch every metric evolve across all four cycles in sync. Play/pause transport |
| `/metrics` | Library grouped by Valuation / Behaviour / Price models / Miners / Cycle models |
| `/metrics/[slug]` | Per-metric page: zoned chart, 4-cycle overlay, "where each cycle sat at day 770" snapshot. 9 metrics live: **MVRV Z-Score, NUPL, Mayer Multiple, Puell Multiple, Reserve Risk, Rainbow band, SOPR, RHODL Ratio, Realised Price** |
| `/hodl-waves` | Supply by age cohort — the iconic heavily-paywalled chart, free, with cycle context |
| `/onchain` `/etf` `/miners` `/derivatives` `/alerts` | Planned views — list what's coming with which paid product each replaces |

### Components

The cycle overlay system is reusable, not one-off:

- `CycleOverlayChart` — the engine. Accepts `mode: "price" | "normalized" | "metric"` + optional metric slug. Powers homepage overlay, `/cycles`, and every metric page
- `MetricChart` — single-cycle chart with zone bands
- `MetricGauge` — banded horizontal gauge with current-value marker
- `MetricCard` — library card with gauge inline
- `CycleClock` — pure SVG halving-cycle gauge
- `CycleAnalog` — "today vs prior cycles" intelligence (server component)
- `CycleReplay` — interactive client component with state-driven slider
- `HodlWavesChart` — Recharts stacked area
- `Sidebar` / `TopBar` — chrome (TopBar shows a `Data — Live/Modelled/Mixed` pill)
- `Watermark` — small "halving.lens" mark on signature cards for shareability

### Repo layout

```
src/
├── app/
│   ├── page.tsx                  # Cycle dashboard
│   ├── cycles/page.tsx           # 4-cycle overlay
│   ├── replay/page.tsx           # Cycle replay
│   ├── metrics/page.tsx          # Library
│   ├── metrics/[slug]/page.tsx   # Per-metric
│   ├── hodl-waves/page.tsx
│   ├── onchain|etf|miners|derivatives|alerts/page.tsx  # Planned views
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── CycleClock.tsx
│   ├── CycleOverlayChart.tsx     # The reusable engine
│   ├── CycleAnalog.tsx
│   ├── CycleReplay.tsx
│   ├── HodlWavesChart.tsx
│   ├── MetricCard.tsx
│   ├── MetricChart.tsx
│   ├── MetricGauge.tsx
│   ├── PlannedView.tsx
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   └── …
└── lib/
    ├── btcData.ts                # Public data API (re-exports from snapshot)
    ├── metrics.ts                # Metric registry + zones + Composite Cycle Index
    ├── hodlWaves.ts              # HODL waves synthesis
    ├── format.ts                 # USD / pct / address formatters
    ├── cn.ts                     # clsx helper
    └── data/
        ├── types.ts              # Cycle, CycleSample, Snapshot, HALVINGS
        ├── synthetic.ts          # Synthesised fallback generator
        └── snapshot.ts           # Single source of truth — overwritten by sync

scripts/
└── sync.ts                       # CoinGecko + CoinMetrics + mempool fetcher

.github/workflows/
├── ci.yml                        # lint + typecheck + build on PRs to main
└── sync.yml                      # daily 02:15 UTC sync + commit + auto-deploy

LICENSE                           # proprietary
vercel.json                       # framework + build command
README.md                         # public-facing
HANDOVER.md                       # this file
```

### Stack

- **Next.js 14** App Router + **React 18** + **TypeScript**
- **Tailwind CSS** — refined dark palette, custom card surfaces
- **Recharts** for charts; custom SVG for the cycle clock and gauges
- **lucide-react** icons
- Typography: **Fraunces** (display serif) + **Inter** (UI sans) + **JetBrains Mono** (numbers)
- Mostly server components; `/replay` and chart components are client

---

## 3. Data pipeline

`src/lib/data/snapshot.ts` is the single source of truth. By default it
re-exports the synthetic generator so a fresh clone runs offline.

`npm run sync` fetches live data and overwrites the snapshot. Soft-fails
by default (warns and exits 0); pass `--strict` for hard failures.

### Sources (all free, no signup)

| Metric | Source on sync |
|---|---|
| Price + market cap | CoinGecko `/coins/bitcoin/market_chart` |
| Realised cap + supply | CoinMetrics community API |
| Current block + hash rate | mempool.space |
| Mayer Multiple | derived (price / 200d SMA) |
| MVRV / MVRV-Z | derived (marketCap / realisedCap + standardisation) |
| NUPL | derived ((marketCap − realisedCap) / marketCap) |
| Realised Price | derived (realisedCap / supply) |
| Puell Multiple | derived ((reward × 144 × price) / 365d SMA) |
| Rainbow band | derived per-cycle |
| **SOPR, RHODL, Reserve Risk** | **modelled** — no free public source |
| **HODL Waves** | **modelled** from a heat factor |

`SOURCE.mode` becomes `"mixed"` when CoinMetrics works, `"live"` when
only CoinGecko + mempool succeeded, `"synthetic"` for the default. The
topbar pill always reflects this.

### Deploy

Vercel auto-detects `vercel.json` which sets:
```
buildCommand: npm run sync && npm run build
```

Daily refresh: `.github/workflows/sync.yml` runs at 02:15 UTC, commits
the new snapshot if changed. Vercel auto-deploys on push, so the site
stays fresh with zero manual work.

---

## 4. Design system

- **Palette:** charcoal/navy base, muted cyan accent (`#5eead4`), violet
  glow for gradients, restrained signal colours (green / red / amber /
  blue). Avoid neon. Avoid bright saturation.
- **Typography:** Fraunces variable serif for display headings (40–60px,
  tight tracking `-0.02em` to `-0.04em`), Inter for UI, JetBrains Mono
  for numbers. All `tabular-nums` on financial figures.
- **Cards:** subtle gradient overlay + 1px edge highlight + soft shadow.
  `.card` and `.card-glow` classes in `globals.css`. Avoid heavy glass /
  neumorphism / strong glow.
- **Charts:** gradient strokes per cycle, soft grid (`rgba 0.025`
  opacity), glass tooltips (CSS-styled via `.recharts-default-tooltip`),
  animated entry (`isAnimationActive`, `animationDuration: 900`).
- **Spacing:** `space-y-12` to `space-y-20` between major sections.
  Cards `p-6` to `p-8`. Max content width 1320px.
- **Motion:** subtle fades only (`fade-up` keyframe). No bounce. No
  flashy transitions.
- **Watermark:** `.watermark` class drops `halving.lens · <context>` in
  the bottom-right of signature cards for shareable screenshots.

### Emotional labels

The product uses human-readable zone labels alongside the numbers:
"Belief", "FOMO", "Capitulation", "Bullish phase", "Cycle top zone",
"Generational buy". These bridge hardcore on-chain analysis and normal
investor understanding. **Keep using them.**

---

## 5. Things explicitly NOT built (yet)

Per the master product directive — these are off the table for now:

- Auth, login, accounts
- Billing, subscriptions, paywalls
- Portfolio tracking / wallet integration
- Trading tools / exchange connections
- APIs (public)
- Mobile apps
- Notifications (push / email / Telegram beyond planned-view stub)
- Social / community features
- Altcoin coverage of any kind

These exist as `/alerts` etc. planned-view pages that explain what's
coming. They are stubs, not feature-flagged hidden work.

---

## 6. Recommended next moves

In rough priority order:

### Tier A — high impact, low effort

1. **ETF flow data** — `/etf` page is a stub. BitMEX Research publishes
   a free weekly CSV of spot ETF flows. Plug it in, add `etfFlow` to
   `CycleSample`, register as a metric. Net-flow + BTC absorbed is the
   defining cycle 5 variable.
2. **Soft-fail polish** — the sync currently warns on any failure.
   Could be smarter: succeed partially (use CoinGecko data even if
   CoinMetrics fails), report per-source status in `SOURCE.sources`.
3. **Better metric chart axis** — single-cycle MetricChart can look
   empty when zone bands extend above the data. Consider auto-tightening
   Y domain to data range + 20% headroom.
4. **Coinbase Premium** — easy to compute (Coinbase price − Binance
   price). Real-time read on US-driven demand.

### Tier B — signature features

5. **Cycle Replay autoplay polish** — number transitions on the
   per-cycle snapshot cards as the slider moves. Currently the chart
   re-renders smoothly but numbers snap.
6. **Cycle Replay overlay mode** — toggle to show all four cycles
   simultaneously at the scrubbed day on a single mini-chart.
7. **Per-metric chart tabs** — `7d / 1m / 3m / 1y / Cycle / All` on
   `/metrics/[slug]` are visual only. Wire them to filter the data.

### Tier C — depth

8. **More metrics:** Coin Days Destroyed, Dormancy Flow, Stablecoin
   Supply Ratio, Exchange Reserves, Miner Outflows. All on the
   `/onchain` planned-view list.
9. **HODL Waves real data.** Requires either a Glassnode key (~$39/mo)
   or self-indexing UTXOs by age. Glassnode is faster, indexing is more
   defensible long-term.
10. **SOPR / RHODL / Reserve Risk real data.** Same options as HODL
    Waves. Probably worth one Glassnode subscription to fill the last
    three modelled metrics — gets the whole library to live data.

### Tier D — distribution

11. **Export PNG button** on signature cards. Use `html-to-image` or a
    server-side render via Playwright. Twitter virality is a stated
    product goal.
12. **Social card layouts** — OG image generation per route with the
    headline metric burned in.
13. **Newsletter generator** — the cycle analog data is rich enough to
    produce a weekly "Bitcoin today vs prior cycles" summary
    automatically.

### Tier E — eventual

14. Real-time hashrate / mempool data on `/onchain`
15. Macro overlay (FRED — DXY, M2, fed rates)
16. Alerts (push / Telegram / webhook) — first paid feature when the
    time comes
17. Public API
18. Wallet portfolio tool (still in the "not yet" pile but could be
    later)

---

## 7. Operational

### Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run typecheck    # strict TS
npm run lint         # next lint
npm run sync         # fetch live data → snapshot.ts (soft-fail)
npm run sync:reset   # restore synthetic default
```

### Vercel

- Already configured via `vercel.json`
- Production branch: `main`
- Build command: `npm run sync && npm run build`
- No env vars required
- No paid integrations

### GitHub Actions

- `ci.yml` — lint + typecheck + build on PRs and main pushes
- `sync.yml` — daily 02:15 UTC, commits snapshot if changed; uses
  default `GITHUB_TOKEN`, no secrets needed

---

## 8. Decisions and history

Snapshot of decisions made during concept stage so a new session
doesn't relitigate:

- **Bitcoin-only.** Multi-chain was explored and rejected. The wedge
  is focus.
- **CoinGecko + CoinMetrics + mempool.space as v1 data sources.**
  Free, no auth, sufficient for 7 of 9 metric library entries.
- **SOPR / RHODL / Reserve Risk stay modelled** until either a
  Glassnode key is procured or those series are scraped from a free
  source. Don't fake-mark them as live.
- **Synthetic data is the default snapshot,** not gitignored. Ships in
  the repo so a fresh clone works offline. Sync overwrites; the
  GitHub Action commits the overwrite daily.
- **Fraunces + Inter + JetBrains Mono.** Editorial serif + clean sans
  + tabular mono. Already committed across every surface — don't
  introduce a fourth font.
- **Cyan accent (`#5eead4`), restrained signal colours.** Avoid
  saturated brand colours like luxury gold or rainbow palettes.
- **Watermark on signature cards** for shareability. The watermark is
  intentionally quiet — CSS-only, no JS.
- **Cycle overlay is a reusable engine,** not metric-specific. New
  metrics get the overlay for free by adding to the `METRICS`
  registry in `src/lib/metrics.ts`.

---

## 9. Quick context for a new session

If you're a new Claude session reading this:

- The product is **Halving.lens** — Bitcoin cycle analytics, free.
- The moat is the **4-cycle overlay** aligned to halving day zero.
- Don't broaden scope to other crypto. Don't add auth/billing/portfolio.
- Aesthetic target: **Bloomberg Terminal meets Apple** — premium, calm,
  institutional, screenshot-friendly.
- Read `README.md` for public-facing context.
- Read `src/lib/data/types.ts` to understand the data shape.
- Read `src/lib/metrics.ts` to understand the metric registry.
- Run `npm run dev` and click around.
- Pick from Tier A in the "Recommended next moves" section above
  unless told otherwise.

The product is **opinionated**: Bitcoin moves in cycles, and
understanding those cycles clearly is the edge.
