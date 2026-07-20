-- Intelligence Events — HalvingLens' historical intelligence database.
-- Run once in the Supabase SQL editor. RLS-on with no policies, so only the
-- server's service-role key can read/write (same posture as the other tables).
--
-- This is NOT an alerts table. It is the durable record of everything HalvingLens
-- has ever judged genuinely significant — produced by the Intelligence Events
-- Engine (src/lib/intelligenceEvents.ts) from the Story Engine's output. Founder
-- Editorial Alerts are the first consumer; Daily Brief, Weekly, Social, YouTube,
-- future Pro/API/Enterprise all read the same rows without re-deriving anything.
--
-- One row per detected publishable event, keyed by a deterministic `dedupe_key`
-- (content-day + story + primary trigger) so re-running detection is idempotent.
-- The human-facing id (EVT-YYYY-NNNNNN) is derived in code from `id` + year.

create table if not exists public.intelligence_events (
  id                    bigint generated always as identity primary key,
  dedupe_key            text not null unique,        -- deterministic identity, e.g. '2026-07-20:etf_demand:regime_change'
  detected_at           timestamptz not null default now(),
  event_type            text not null,               -- editorial family, e.g. 'ETF Flows'
  provider              text not null,               -- story key, e.g. 'etf_demand'
  story_key             text not null,
  story_score           numeric,                     -- 0..100
  confidence            text,                         -- 'high' | 'medium' | 'low'
  rarity                text,                         -- 'high' | 'medium' | 'low'
  trigger               text,                         -- primary trigger reason
  trigger_reason        text,                         -- why it was judged publishable
  summary               text,                         -- what changed, plain English
  suggested_headline    text,
  suggested_pack        text,                         -- a PackId the Social Engine can generate
  suggested_layout      text,                         -- HeroLayout
  suggested_platforms   jsonb not null default '[]',
  supporting_indicators jsonb not null default '[]',
  previous_value        text,
  current_value         text,
  priority              text not null default 'medium', -- 'high' | 'medium' | 'low'
  status                text not null default 'new',    -- 'new' | 'posted' | 'snoozed' | 'dismissed'
  created_creative      boolean not null default false,
  linked_social_post    bigint,                         -- social_posts.id once a creative is published
  grouped               jsonb not null default '[]',    -- story keys folded into this event
  breakdown             jsonb not null default '{}',    -- the 9-factor score transparency
  metadata              jsonb not null default '{}',    -- room to grow without a migration
  created_at            timestamptz not null default now()
);

-- Recency + status are the access patterns consumers need.
create index if not exists intelligence_events_detected_at_idx on public.intelligence_events (detected_at desc);
create index if not exists intelligence_events_story_key_idx on public.intelligence_events (story_key, detected_at desc);
create index if not exists intelligence_events_status_idx on public.intelligence_events (status);

-- RLS on, no policies → service-role key only (matches social_posts.sql).
alter table public.intelligence_events enable row level security;
