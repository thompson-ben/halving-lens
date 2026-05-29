# Halving.lens

> The clearest view of the Bitcoin cycle.
>
> Every paid Bitcoin cycle chart, free — with halving-aligned overlays nobody else has.

Concept / MVP scaffold. Ships with a synthetic data fallback so a fresh
clone runs with zero API keys. `npm run sync` pulls live data from public
sources and overwrites the snapshot — no signup, no rate-limited keys.

---

## Strategic position

**Bitcoin-only. Cycle intelligence platform.**

Not a CoinGecko clone. Not a TradingView. Not a generic crypto terminal.

The product answers one question well: **where is Bitcoin in the cycle,
and how does that compare to every prior cycle?**

## The moat

Not the charts themselves — every metric on the site is plotted elsewhere.
The moat is **every metric aligned to halving day zero across all cycles**.
For any oscillator, you can answer:

- Where are we today?
- Where did each prior cycle sit at the same day from halving?
- Is this cycle hotter or cooler than the prior three?
- What happened next, historically?

That comparison view is the headline.

---

## What's built

### Pages

| Route | Purpose |
| --- | --- |
| `/` | Cycle dashboard — clock, composite cycle index (CCI), **cycle analog** ("today most closely resembles Cycle 4 at day 485 from halving"), normalised 4-cycle overlay, metric library teasers, Cycle Replay teaser |
| `/cycles` | Full 4-cycle overlay + per-cycle stats table + diminishing returns vs supercycle framing |
| `/replay` | **Signature feature.** Scrub through 1458 days of halving cycle. Watch every metric evolve across all four cycles in sync. Play/pause transport |
| `/metrics` | Library, grouped: Valuation, Behaviour, Price models, Miners, Cycle models |
| `/metrics/[slug]` | Per-metric: zoned chart, 4-cycle overlay, "where each cycle sat at day 770" snapshot. 9 metrics: **MVRV-Z, NUPL, Mayer Multiple, Puell Multiple, Reserve Risk, Rainbow band, SOPR, RHODL Ratio, Realised Price** |
| `/hodl-waves` | Supply by age cohort — the most heavily paywalled on-chain chart, free, with cycle context |
| `/onchain` `/etf` `/miners` `/derivatives` `/alerts` | Planned views — what comes next, with which paid product each replaces |

### Design system

- **Typography:** Fraunces (display, editorial serif) + Inter (UI) + JetBrains Mono (numbers)
- **Palette:** charcoal/navy base, muted cyan accent, restrained signal colours
- **Card surface:** subtle gradient overlays + edge highlight + soft shadow
- **Charts:** smooth gradient strokes, soft grid lines, glass tooltips, fade-in animation
- **Watermark:** every key card/chart has a small `halving.lens` watermark for shareable screenshots

### Cycle overlay engine

- `CycleOverlayChart` — single client component drives every overlay. Accepts a `mode` ("price" / "normalized" / "metric") and an optional metric slug
- `MetricChart` — single-cycle chart with zone bands
- `MetricGauge` — banded horizontal gauge with current-value marker
- `CycleReplay` — interactive client component with state-driven slider

Adding a new metric is: (1) extend `CycleSample` in `btcData.ts`, (2) add it to the `METRICS` registry in `metrics.ts` with bands and description. Every page picks it up automatically.

---

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** — refined dark palette, custom card surfaces
- **Recharts** for charts, custom SVG for the cycle clock and gauges
- All pages static or server-rendered. Only `/replay` is a client component (slider state)

No database, no APIs. Runs from `src/lib/btcData.ts`.

---

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build       # production build
npm run typecheck   # strict TS
npm run lint        # next lint
```

---

## Data pipeline

`src/lib/data/snapshot.ts` is the single source of truth the app reads from.
By default it re-exports the synthetic generator so a clone runs offline.

```bash
npm run sync         # fetch live data, overwrite snapshot
npm run sync:reset   # restore the synthetic default
```

### Sources

| Metric                     | Source                                    | Free?  |
| -------------------------- | ----------------------------------------- | ------ |
| Price + market cap         | CoinMetrics community (CoinGecko fallback) | yes    |
| Realised cap + supply      | CoinMetrics community API                 | yes    |
| Current block + hash rate  | mempool.space                             | yes    |
| Mayer Multiple             | derived (price / 200d SMA)                | —      |
| MVRV / MVRV-Z              | derived (marketCap / realisedCap + stdz)  | —      |
| NUPL                       | derived ((mcap - realisedCap) / mcap)     | —      |
| Realised Price             | derived (realisedCap / supply)            | —      |
| Puell Multiple             | derived (reward × 144 × price / 365d SMA) | —      |
| Rainbow band               | derived per-cycle                         | —      |
| SOPR, RHODL, Reserve Risk  | **modelled** — no free public source      | —      |

`SOURCE.mode` in the snapshot becomes `"mixed"` when CoinMetrics data is
present, `"live"` when only CoinGecko + mempool succeeded, and
`"synthetic"` for the default fallback. The topbar shows a small badge so
you always know which mode is active.

### Deploy (Vercel / Netlify)

Set the build command to `npm run sync && npm run build`. The host has
outbound, the snapshot regenerates on every deploy, and the build bundles
the fresh data. No DB, no cron jobs, no scheduled tasks needed.

For lower-frequency refresh, add a daily GitHub Action that runs
`npm run sync` and commits the new snapshot.

### What's still concept

1. **HODL Waves real data.** Currently synthesised from a heat factor; in
   production this is computed off UTXO age bands (Glassnode endpoint).
2. **SOPR / RHODL / Reserve Risk.** No free public source. Options:
   pay a single Glassnode key (~$39/mo), self-index UTXOs (weeks of work),
   or scrape Look Into Bitcoin's daily charts.
3. **ETF flow data.** BitMEX Research CSV is the simplest plug; not yet
   wired.

The UI is the spec — wire real data behind it without changing the page
contracts.

## Deliberately not built

Per product direction: no auth, billing, portfolio tracking, altcoin dashboards, mobile apps, public API, notifications, or social features in the MVP. Build the clearest cycle view first. Layer the rest on later.

---

## License

Proprietary — concept code.
