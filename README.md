# Halving.lens

> Bitcoin halving cycle analytics — every chart Glassnode and CryptoQuant
> charge for, **free**, with a feature they don't have: every metric
> overlaid across all four halving cycles, aligned to day zero.

Concept / MVP scaffold. Every screen renders end-to-end against
deterministic synthetic cycle data so the app runs with zero API keys.

---

## The wedge

Two camps spend money on Bitcoin analytics today:

1. **Glassnode / CryptoQuant** ($29–$799/mo) — the canonical chart
   library: MVRV, NUPL, SOPR, HODL Waves, Reserve Risk, Hash Ribbons.
   Power tools, but the free tier strips cycle history and overlays.
2. **Look Into Bitcoin, BTC Magazine Pro, Bitbo** — free at the surface,
   paid for depth, alerts, and overlays.

Nobody combines:

- **The full metric library, free** — calibrated zones, full history, real
  band interpretations.
- **Cycle-aligned overlays on every chart** — the headline. Pick any
  metric, see it drawn for cycles 2, 3, 4, and 5 simultaneously,
  anchored to halving day zero. This view doesn't exist anywhere free.
- **A composite cycle index** — one number, 0–100, calibrated so every
  prior cycle peaked above 85.
- **The "where were we then" panel** — for any metric, what value did
  prior cycles read at the same day-from-halving as today.

---

## Screens

| Route | What it does |
| --- | --- |
| `/` | Cycle dashboard — clock, composite index, mini-overlay, six metric cards |
| `/cycles` | The 4-cycle overlay (full size) + per-cycle stats table |
| `/metrics` | Library of paywalled metrics, grouped by category |
| `/metrics/[slug]` | Single-metric page: zoned chart, 4-cycle overlay, cross-cycle snapshot |
| `/onchain` | HODL Waves, exchange reserves, supply by entity (planned view) |
| `/etf` | Spot ETF flows, BTC absorbed, premium tracker (planned) |
| `/miners` | Hash Ribbons, miner reserves, hash price (planned) |
| `/derivatives` | Funding, OI, taker ratios, basis (planned) |
| `/alerts` | Push / email / webhook alerts on any metric or zone crossing (planned) |

The six metric pages built end-to-end today: **MVRV Z-Score, NUPL, Mayer
Multiple, Puell Multiple, Reserve Risk, Rainbow band.**

---

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** — dark palette with cyan/violet accent
- **Recharts** — overlay chart and metric chart with zone bands
- Custom SVG for the cycle clock and band gauges
- All pages are server components; charts are client components

No database, no APIs to provision — runs from `src/lib/btcData.ts`.

---

## Repository layout

```
src/
├── app/
│   ├── page.tsx                  # Cycle dashboard
│   ├── cycles/page.tsx           # 4-cycle overlay
│   ├── metrics/page.tsx          # Metric library
│   ├── metrics/[slug]/page.tsx   # Single-metric page
│   ├── onchain | etf | miners | derivatives | alerts  # Planned views
│   ├── layout.tsx                # Sidebar + topbar
│   └── globals.css
├── components/
│   ├── CycleClock.tsx            # SVG halving-cycle gauge
│   ├── CycleOverlayChart.tsx     # The 4-cycle overlay (Recharts)
│   ├── MetricChart.tsx           # Single-metric chart with zone bands
│   ├── MetricGauge.tsx           # Horizontal banded gauge
│   ├── MetricCard.tsx            # Library card
│   └── PlannedView.tsx           # Shared "what's coming" page
└── lib/
    ├── btcData.ts                # 4 cycles × weekly samples × all metrics
    ├── metrics.ts                # Metric registry + zones + CCI
    ├── format.ts                 # USD/PCT formatters
    └── cn.ts                     # clsx helper
```

---

## Run it

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

## What's still concept (not built)

1. **Real chain data.** All cycle samples in `btcData.ts` are synthesised
   from anchor prices + a deterministic walk. Wire-up path:
   - **Price**: CoinGecko / Coinbase public API for spot + weekly bars.
   - **MVRV / NUPL / Realised Cap**: derive from UTXO age data via
     mempool.space / blockchain.com APIs, or pay for one Glassnode key.
   - **Hash / difficulty / miner data**: mempool.space, blockstream.
   - **ETF flow**: BitMEX Research daily CSV, scrape SEC EDGAR.
   - **Funding / OI**: Binance / Bybit / OKX public endpoints +
     Coinglass aggregator.
2. **Live updates.** Daily cron + server-rendered cache is enough for
   v1 — none of these metrics need sub-minute freshness.
3. **Alerts.** Eval rules against the daily snapshot, fan-out to
   email/Telegram/webhook.
4. **Account system.** Save watchlists, custom alert thresholds, and
   user-tweaked cycle alignments (e.g. anchor on the post-halving
   sell-off rather than halving itself).

The UI is the spec — wire the real data without changing the page
contracts.

---

## License

Proprietary — concept code.
