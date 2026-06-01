-- ════════════════════════════════════════════════════════════════════════════
-- HALVING.LENS — HISTORICAL INTELLIGENCE WAREHOUSE
-- ════════════════════════════════════════════════════════════════════════════
-- A proprietary, append-only historical dataset. Every daily sync permanently
-- captures the raw metrics, derived metrics, scores, signals, state changes,
-- narratives, briefs, generated content and ETF history for that day. Nothing is
-- ever overwritten: each day is written once and kept forever, so the archive
-- compounds in value for future research, backtesting, intelligence reports and
-- premium/API/institutional products.
--
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query). Re-running
-- is safe — every statement is idempotent (create-if-not-exists).
--
-- Writers: scripts/warehouse.ts (server, service-role key) after the daily sync.
-- Idempotency: a same-day re-run UPSERTs that day's row (on the `date` unique
-- key) rather than creating a duplicate — append-only across days.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Phase 1 — Daily cycle intelligence (one row per day) ─────────────────────
create table if not exists public.daily_cycle (
  id                  bigint generated always as identity primary key,
  date                date not null unique,        -- UTC calendar day (the snapshot day)
  btc_price           double precision,
  market_cap          double precision,
  cycle_day           integer,                     -- days since the 2024 halving
  cycle_progress      double precision,            -- 0-100 % through the ~4y cycle
  cycle_phase         text,                         -- engine phase label
  cycle_score         integer,                      -- 0-100 environment score
  cycle_score_label   text,                         -- Cool / Neutral / Warm / Elevated / Euphoric
  risk_level          text,                         -- heat: cool|neutral|heating|elevated|euphoria
  heat_level          text,                         -- alias of risk_level (kept for queryability)
  confidence          text,                         -- low|medium|high
  historical_position double precision,             -- Mayer percentile across all history
  price_change_24h    double precision,
  price_change_7d     double precision,
  gain_from_halving   double precision,
  drawdown_from_ath   double precision,
  fear_greed          integer,
  sentiment_state     text,                         -- band label (e.g. Fear / Neutral / Greed)
  etf_flow_daily      double precision,             -- latest single-day net flow (USD)
  etf_flow_weekly     double precision,             -- trailing-7d net flow (USD)
  etf_cumulative      double precision,             -- cumulative net flow since launch (USD)
  etf_trend           text,                         -- inflow|outflow|flat
  created_at          timestamptz not null default now()
);
create index if not exists daily_cycle_date_idx on public.daily_cycle (date);

-- ── Phase 2 — Raw metrics (long form: one row per metric per day) ────────────
-- Stores EVERY metric we compute or fetch, even ones not shown in the UI, so the
-- raw series is reconstructable and ML-ready. is_live flags real vs modelled.
create table if not exists public.daily_metrics (
  id          bigint generated always as identity primary key,
  date        date not null,
  metric      text not null,                        -- 'mvrv' | 'nupl' | 'sopr' | 'mayer' | ...
  value       double precision,
  unit        text,                                 -- 'ratio' | 'usd' | 'pct' | 'index' | ...
  is_live     boolean not null default false,       -- real source vs modelled/derived
  source      text,
  created_at  timestamptz not null default now(),
  unique (date, metric)
);
create index if not exists daily_metrics_date_idx on public.daily_metrics (date);
create index if not exists daily_metrics_metric_idx on public.daily_metrics (metric);

-- ── Phases 3 & 6 — Derived intelligence + daily brief (narratives) ───────────
-- The generated reads, summaries and the full daily brief, stored as written.
-- Old days are never regenerated.
create table if not exists public.daily_intelligence (
  id              bigint generated always as identity primary key,
  date            date not null unique,
  headline        text,
  summary         text,                             -- cycle summary
  support         text,                             -- historical comparison / support
  whats_different text,
  what_to_watch   text,
  conclusion      text,
  insights        jsonb not null default '[]',      -- cycle/etf/sentiment insight blocks
  watch_signals   jsonb not null default '[]',      -- "what to watch" signals
  scorecard       jsonb not null default '{}',      -- full multi-factor scorecard
  content         jsonb not null default '{}',      -- cross-channel content pack (Phase 7)
  created_at      timestamptz not null default now()
);
create index if not exists daily_intelligence_date_idx on public.daily_intelligence (date);

-- ── Phase 4 — State changes / transitions (append-only event log) ────────────
-- One row per detected transition (risk level, cycle phase, sentiment, ETF
-- trend). Purely additive — a row is inserted only when something flips.
create table if not exists public.state_changes (
  id             bigint generated always as identity primary key,
  date           date not null,
  dimension      text not null,                     -- 'risk_level' | 'cycle_phase' | 'sentiment' | 'etf_trend'
  previous_state text,
  current_state  text,
  change_reason  text,
  created_at     timestamptz not null default now()
);
create index if not exists state_changes_dimension_idx on public.state_changes (dimension);
create index if not exists state_changes_date_idx on public.state_changes (date);

-- ── Phase 5 — Engine score components (explainability) ───────────────────────
-- The component contributions behind the cycle score, so every score is fully
-- explainable after the fact.
create table if not exists public.cycle_score_components (
  id          bigint generated always as identity primary key,
  date        date not null,
  factor      text not null,                        -- 'Cycle timing' | 'Price structure' | ...
  status      text,
  score       integer,                              -- 0-100 condition reading
  explanation text,
  confidence  text,
  created_at  timestamptz not null default now(),
  unique (date, factor)
);
create index if not exists cycle_score_components_date_idx on public.cycle_score_components (date);

-- ── Phase 12 — ETF history archive (build our own, don't rely on a third party) ──
-- Per-day US spot BTC ETF net flow + cumulative. issuer='ALL' is the aggregate;
-- per-issuer rows (IBIT/FBTC/ARKB/GBTC/…) can be added later under the same shape.
create table if not exists public.etf_history (
  id           bigint generated always as identity primary key,
  date         date not null,
  issuer       text not null default 'ALL',
  net_flow     double precision,
  cumulative   double precision,
  avg_7d       double precision,
  avg_30d      double precision,
  created_at   timestamptz not null default now(),
  unique (date, issuer)
);
create index if not exists etf_history_date_idx on public.etf_history (date);
create index if not exists etf_history_issuer_idx on public.etf_history (issuer);

-- ── Downside scenarios — daily cycle-low scenario map (one row per day) ──────
-- Tracks how the historical downside scenario ranges shift over time.
create table if not exists public.downside_scenarios (
  id                       bigint generated always as identity primary key,
  date                     date not null unique,
  current_price            double precision,
  cycle_high               double precision,
  mild_drawdown_price      double precision,
  average_drawdown_price   double precision,
  severe_drawdown_price    double precision,
  realized_price_support   double precision,
  moving_average_support   double precision,
  prior_cycle_high_support double precision,
  methodology_version      text,
  created_at               timestamptz not null default now()
);
create index if not exists downside_scenarios_date_idx on public.downside_scenarios (date);

-- ── Phase 11 — User sentiment polls (future schema; no writer yet) ───────────
create table if not exists public.sentiment_polls (
  id          bigint generated always as identity primary key,
  question    text not null,
  answer      text not null,
  session_id  text,
  visitor_id  text,
  created_at  timestamptz not null default now()
);
create index if not exists sentiment_polls_question_idx on public.sentiment_polls (question);

-- ── Phase 13 — News archive (future schema; no writer yet) ───────────────────
create table if not exists public.news_archive (
  id                 bigint generated always as identity primary key,
  headline           text not null,
  source             text,
  url                text,
  published_date     date,
  category           text,
  sentiment          text,
  btc_price_at_time  double precision,
  cycle_score_at_time integer,
  created_at         timestamptz not null default now()
);
create index if not exists news_archive_published_idx on public.news_archive (published_date);
create index if not exists news_archive_category_idx on public.news_archive (category);

-- ── RLS: server-only (service-role key) access for every warehouse table ─────
alter table public.daily_cycle            enable row level security;
alter table public.daily_metrics          enable row level security;
alter table public.daily_intelligence     enable row level security;
alter table public.state_changes          enable row level security;
alter table public.cycle_score_components enable row level security;
alter table public.downside_scenarios     enable row level security;
alter table public.etf_history            enable row level security;
alter table public.sentiment_polls        enable row level security;
alter table public.news_archive           enable row level security;
