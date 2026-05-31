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

-- 2) Page feedback: 👍 / 👎 + optional text.
create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  path        text,
  helpful     boolean,
  message     text,
  session_id  text,
  created_at  timestamptz not null default now()
);

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
