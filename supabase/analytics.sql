-- Analytics + feedback tables for halving.lens.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Privacy-friendly, first-party: no third-party trackers, no cookies, no PII.
-- A per-session anonymous id (random, stored in sessionStorage) groups events.

-- 1) Raw events: page views + section/CTA interactions.
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  name        text not null,            -- e.g. 'page_view', 'section_click', 'copy_post'
  path        text,                     -- page path
  props       jsonb not null default '{}',
  session_id  text,                     -- anonymous random id (not a user id)
  is_new      boolean not null default false, -- first session for this visitor?
  created_at  timestamptz not null default now()
);
create index if not exists events_name_idx on public.events (name);
create index if not exists events_created_idx on public.events (created_at);

-- 2) Section-level feedback: 👍 / 👎 + optional text, tagged by page + section.
create table if not exists public.feedback (
  id           bigint generated always as identity primary key,
  path         text,
  section      text,                      -- e.g. 'mvrv_explanation', 'cycle_summary'
  content_type text,                      -- e.g. 'metric', 'homepage_section', 'page'
  helpful      boolean,
  message      text,
  session_id   text,
  visitor_id   text,                      -- stable anonymous per-device id
  device_type  text,                      -- 'mobile' | 'tablet' | 'desktop'
  created_at   timestamptz not null default now()
);
-- Add the section-level columns to an existing feedback table (safe to re-run).
alter table public.feedback add column if not exists section      text;
alter table public.feedback add column if not exists content_type text;
alter table public.feedback add column if not exists visitor_id   text;
alter table public.feedback add column if not exists device_type  text;
create index if not exists feedback_section_idx on public.feedback (section);
create index if not exists feedback_created_idx on public.feedback (created_at);

-- 3) Feature votes: "what should we build next?"
create table if not exists public.feature_votes (
  id          bigint generated always as identity primary key,
  feature     text not null,            -- 'alerts' | 'daily_emails' | 'etf_tracking' | ...
  session_id  text,
  created_at  timestamptz not null default now()
);
create index if not exists feature_votes_feature_idx on public.feature_votes (feature);

-- RLS on for all: only the server's service-role key can read/write.
alter table public.events enable row level security;
alter table public.feedback enable row level security;
alter table public.feature_votes enable row level security;
