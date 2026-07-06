-- Company history & longitudinal performance for the Founder Review.
-- Run once in the Supabase SQL editor. Service-role only (RLS on, no policies) —
-- same posture as the other tables (the app reaches Supabase via the service key).
--
-- Three tables build the "permanent memory" of HalvingLens:
--   company_snapshots — one metric snapshot per calendar month (seeds year-over-year)
--   company_records   — each metric's best-ever value + when it happened
--   founder_journal   — hand-written monthly reflections (the story behind the numbers)

-- Monthly metric snapshots. The seed for "This Time Last Year" and the
-- year-over-year story — captured every month so a full picture exists in a year.
create table if not exists public.company_snapshots (
  month       text primary key,                    -- 'YYYY-MM' (UTC)
  metrics     jsonb not null default '{}'::jsonb,   -- flat { key: number } of that month's figures
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.company_snapshots enable row level security;

-- All-time records — the best value ever seen for each metric, and its date.
-- Updated automatically whenever a new high is reached.
create table if not exists public.company_records (
  metric       text primary key,                   -- stable id, e.g. 'daily_visitors'
  label        text not null,
  value        numeric not null,
  unit         text not null default '',            -- e.g. '%', ''
  achieved_on  date not null,
  updated_at   timestamptz not null default now()
);
-- Optional context for the record (e.g. which brief was most-read). Added
-- separately so an existing table upgrades in place. Safe to re-run.
alter table public.company_records add column if not exists detail text;
alter table public.company_records enable row level security;

-- Founder journal — hand-written monthly reflections. A chronological journal
-- documenting the growth of HalvingLens: the story behind the numbers.
create table if not exists public.founder_journal (
  id          bigint generated always as identity primary key,
  month       text not null,                        -- 'YYYY-MM'
  entry       jsonb not null default '{}'::jsonb,    -- { proud, surprised, lesson, differently, focus }
  created_at  timestamptz not null default now()
);
create index if not exists founder_journal_month_idx on public.founder_journal (month desc, created_at desc);
alter table public.founder_journal enable row level security;
