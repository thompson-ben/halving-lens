# Data licensing & provider audit

**Status:** governance record — Cycle Dashboard V2, CD0 (August 2026).
**Owner:** founder (legal review actions); engineering (keeping the factual
sections in step with `scripts/sync.ts`).

This document records, per provider: what data HalvingLens consumes, where and
how it is consumed, the technical limitations observed in the implementation,
where the provider's terms can be found, and an explicit rights status.

Two rules govern this document:

1. **No implementation-derived legal conclusions.** That an endpoint is
   keyless, free, or currently permissive tells us nothing about redistribution
   or commercial-use rights. Statements about *code behaviour* are facts;
   statements about *rights* are only made where terms have actually been
   reviewed.
2. **Unverified means REQUIRES REVIEW.** Every provider whose redistribution
   rights have not been positively confirmed is listed as REQUIRES REVIEW,
   whatever the working assumption has been.

Statuses: `VERIFIED` (terms reviewed and rights confirmed for our use) ·
`REQUIRES REVIEW` (rights not yet confirmed) · `NOT APPLICABLE` (no external
rights involved).

---

## 1. CoinMetrics — community API

- **Data consumed:** daily `PriceUSD` (full depth — feeds the permanent
  `PRICE_ARCHIVE`), `CapMrktCurUSD`, `SplyCur`, `HashRate`
  (`scripts/sync.ts`, community endpoint
  `community-api.coinmetrics.io/v4/timeseries/asset-metrics`).
- **Where consumed:** the committed snapshot and price archive that power
  effectively every price-derived surface — cycle charts, seasonality,
  reference gaps, market movers, the daily brief.
- **Technical limitations observed in code:** keyless community tier;
  requests must send a browser User-Agent (the endpoint's WAF rejects
  non-browser agents); `CapRealUSD` (realised cap) is not available on the
  community tier — the snapshot records `realizedCap: "synthetic fallback"`
  and the product sources realised price elsewhere.
- **Terms reference:** CoinMetrics community data terms —
  https://coinmetrics.io/community-network-data/ (and the terms linked from
  it).
- **Status: REQUIRES REVIEW.** Community data is commonly published under a
  non-commercial attribution licence; HalvingLens is a commercial
  publication. Whether our use (derived metrics and charts, no bulk
  redistribution of the raw series) is within the licence has not been
  legally confirmed.
- **Action / owner:** founder — review community terms, confirm scope or
  identify the required commercial tier.

## 2. BGeometrics — bitcoin-data.com

- **Data consumed:** on-chain series for the current cycle — MVRV-Z, NUPL,
  SOPR, realised price, RHODL, reserve risk (`scripts/sync.ts`,
  `bitcoin-data.com/v1/…`, `BITCOIN_DATA_API_KEY`).
- **Where consumed:** current-cycle on-chain readings across the product;
  clearly labelled "current cycle" — prior-cycle on-chain values remain
  synthetic and are excluded from observed-window claims.
- **Technical limitations observed in code:** free tier quota honoured
  explicitly — full sync only (`FULL_SYNC=1`), ≤8 requests/run against an
  ~15 requests/day, 8/hour budget; committed values are carried over between
  full syncs; per-metric sanity ranges gate ingestion.
- **Terms reference:** https://bitcoin-data.com (API documentation and any
  terms published there).
- **Status: REQUIRES REVIEW.** Free-tier API access does not establish
  display or redistribution rights for a paid publication; no terms review
  is on record.
- **Action / owner:** founder — confirm terms of use for commercial display,
  or move to a paid plan that grants them.

## 3. alternative.me — Crypto Fear & Greed index

- **Data consumed:** full daily index history (`api.alternative.me/fng/`).
- **Where consumed:** sentiment surfaces (/sentiment, scorecard sentiment
  factor, briefs and packs), always as the named third-party index.
- **Technical limitations observed in code:** keyless; single call returns
  full history; treated as can-lag/can-revise in the product's freshness
  handling.
- **Terms reference:** https://alternative.me/crypto/fear-and-greed-index/
  (attribution note on the index page).
- **Status: REQUIRES REVIEW.** The index is widely re-displayed with
  attribution, and HalvingLens names the source; the formal terms for
  commercial re-display have not been reviewed.
- **Action / owner:** founder — confirm attribution requirements are met and
  sufficient.

## 4. SoSoValue — US spot Bitcoin ETF flows

- **Data consumed:** aggregate daily net-flow and cumulative series for US
  spot Bitcoin ETFs (`openapi.sosovalue.com`, `SOSOVALUE_API_KEY`).
- **Where consumed:** /etf, the scorecard's ETF factor, ETF glance rows,
  briefs, content packs. Aggregate only — the product deliberately shows no
  per-fund breakdown because the source is aggregate-only.
- **Technical limitations observed in code:** requires an API key; when the
  key is absent the sync skips ETF data and the page stays "coming soon" —
  the product never fabricates flows.
- **Terms reference:** SoSoValue open-API terms (developer portal at
  https://sosovalue.com).
- **Status: REQUIRES REVIEW.** API-key access under their open programme has
  not been legally confirmed to cover display in a paid research
  publication.
- **Action / owner:** founder — review open-API terms; confirm display
  rights and any attribution requirement.

## 5. mempool.space

- **Data consumed:** current block height and 24h network hash rate
  (`mempool.space/api/…`).
- **Where consumed:** halving countdown / network stats (block-based
  progress figures).
- **Technical limitations observed in code:** keyless REST calls; the
  product falls back to a block-height estimate when unavailable.
- **Terms reference:** https://mempool.space/docs/api (project is
  open-source; hosted API terms are published there).
- **Status: REQUIRES REVIEW.** The hosted API is openly offered, but rate
  and usage expectations for commercial consumers have not been formally
  reviewed.
- **Action / owner:** founder — confirm acceptable-use terms of the hosted
  instance (or self-host if required).

## 6. CryptoCompare / CoinGecko — price fallbacks

- **Data consumed:** daily price history (CryptoCompare `histoday`,
  keyless) and recent prices (CoinGecko `market_chart`, free tier), used
  only when CoinMetrics fails.
- **Where consumed:** same price surfaces as §1, only in fallback runs; the
  committed archive records whichever source actually served.
- **Technical limitations observed in code:** CoinGecko free tier caps
  history at 365 days and rejects `days=max` (401) — it is last-resort,
  recent-data-only; both fallbacks send a browser User-Agent for the same
  WAF reason as §1.
- **Terms reference:** https://www.cryptocompare.com/api-terms/ ·
  https://www.coingecko.com/en/api_terms.
- **Status: REQUIRES REVIEW.** Fallback use is occasional, but occasional
  use is still use; neither provider's terms have been reviewed for
  commercial display.
- **Action / owner:** founder — review both terms; if either is
  incompatible, restrict the fallback chain.

## 7. Modelled and self-derived series

- **Data concerned:** Estimated Mining Cost (own model, versioned
  assumptions — `ASSUMPTIONS_VERSION` in
  `src/lib/data/productionCost.ts`); derived metrics computed by HalvingLens
  from licensed inputs (Mayer, MVRV, NUPL, realised price, Puell, rainbow
  band, drawdowns, cycle-day alignment, accumulation scoring); synthetic
  prior-cycle on-chain curves (SOPR, RHODL, reserve risk), which are
  labelled modelled and excluded from live claims.
- **Status: NOT APPLICABLE** for the models themselves — no external rights
  are involved in the formulas or the synthetic curves. The *inputs* to the
  derived metrics carry the statuses of their providers above.

---

## Standing rules

- Do not widen any redistribution assumption because an implementation
  happens to work — capability is not permission.
- Do not add a new data source to get a feature working before its terms
  have been reviewed under this document's structure.
- V2 dashboard work is not blocked on the reviews above: it consumes the
  same already-integrated feeds under the same working assumptions,
  documented here. The reviews are a governance track that proceeds in
  parallel.
