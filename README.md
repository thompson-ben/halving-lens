# Chainglass

> On-chain analytics for crypto markets — CoinGecko-style coverage with a
> chain-native lens. Track smart money, holder x-ray, and DEX flow in one
> dashboard.

This is a concept / MVP scaffold. Every screen is wired up against
deterministic mock data so the app renders end-to-end with zero API keys.

---

## The wedge

CoinGecko is a **price aggregator**. It tells you what a token *did*.
Chainglass is an **on-chain reader**. It tells you what wallets are
*doing*, right now:

- **Smart money flow per token** — net USD bought/sold by the top 200
  wallets in the last 24h, surfaced as a first-class column on the markets
  table.
- **Holder x-ray** — distribution by wallet rank, with insider, team, and
  fresh-wallet flags.
- **Wallet profiles** — public, followable, alertable. A LinkedIn for
  on-chain traders.
- **DEX flow tape** — every swap above a threshold from labeled wallets,
  MEV-filtered.

The composite "Chainglass score" on each token page rolls these signals
into a single 1–99 number, so the table feel of CoinGecko stays — you just
get an extra column that's hard to look away from.

---

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** — custom dark palette with cyan/violet on-chain accent
- **Recharts** + custom SVG sparklines
- **lucide-react** icons
- All pages are server components; no client state in the MVP

The whole app lives under `src/` — no database, no APIs to provision.

---

## Repository layout

```
src/
├── app/
│   ├── page.tsx                 # Markets table (homepage)
│   ├── token/[symbol]/page.tsx  # Token detail + on-chain x-ray
│   ├── smart-money/page.tsx     # Smart money leaderboard
│   ├── smart-money/[address]/   # Individual wallet profile
│   ├── flows/page.tsx           # DEX flow live tape
│   ├── scanner|alerts|portfolio|activity|settings/ — concept pages
│   ├── layout.tsx               # Sidebar + topbar shell
│   └── globals.css
├── components/                  # MarketsTable, SmartMoneyFeed, …
└── lib/
    ├── mockData.ts              # Tokens, wallets, trades, holders
    ├── format.ts                # USD/PCT/address formatters
    ├── types.ts                 # Shared types
    └── cn.ts                    # clsx helper
```

---

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build      # production build
npm run typecheck  # strict TS check
npm run lint       # next lint
```

---

## What's still concept (not built)

- **Real chain data.** Today every number is from `mockData.ts`. The
  wedge requires either:
  - Third-party APIs (Alchemy/Helius for raw chain, Dune for queries,
    Birdeye for Solana, Etherscan/Basescan/etc. for explorer-style
    lookups), or
  - A self-hosted indexer (Ponder, Subsquid, or custom RPC + a
    Postgres-backed store) for the labeled-wallet graph that gives the
    smart-money product its moat.
- **Smart wallet labeling.** Initial seed via well-known wallets
  (Cobie, Ansem, public foundation/insider lists) + heuristic scoring
  (realised PnL, hold time, MEV filter). Hardest and most defensible
  piece long-term.
- **Real-time tape.** WebSocket subscriptions on indexed swap events,
  with a server-sent push to the client. Today the "live" feed is static.
- **Alerts.** Push/email/Telegram/webhook rules, evaluated against the
  same indexed event stream.

The UI is the spec. Wire the data behind it without changing pages.

---

## License

Proprietary — concept code.
