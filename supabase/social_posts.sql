-- Social post history for the Editorial Story Engine (Social Creative Engine V2).
-- Run once in the Supabase SQL editor. RLS-on with no policies, so only the
-- server's service-role key can read/write (same posture as the other tables).
--
-- One row per PUBLISHED social post, logged from the content studio's "Mark as
-- posted" action. The story engine reads the recent rows to keep consecutive
-- posts visually and editorially distinct: it avoids repeating a hero chart,
-- layout, story angle or headline that was used recently — unless today's story
-- is genuinely the biggest in the record, which always wins.

create table if not exists public.social_posts (
  id             bigint generated always as identity primary key,
  post_date      date not null,                 -- the content date (brief date) the post covers
  pack           text not null,                 -- PackId, e.g. 'chart_week'
  hero_card      text,                          -- CardId of the hero chart it led with
  headline       text,                          -- the editorial headline used
  layout         text,                          -- hero layout key: 'stacked' | 'split' | 'spotlight'
  primary_metric text,                          -- the story's primary metric / key
  story_category text,                           -- 'demand' | 'valuation' | 'sentiment' | 'volatility' | 'health' | 'similarity' | 'cycle'
  score          numeric,                        -- the story's importance score (0..1) at publish time
  meta           jsonb not null default '{}',    -- room to grow without a migration
  posted_at      timestamptz not null default now()
);

-- Recency is the only access pattern the engine needs.
create index if not exists social_posts_post_date_idx on public.social_posts (post_date desc);
create index if not exists social_posts_posted_at_idx on public.social_posts (posted_at desc);

-- RLS on, no policies → service-role key only (matches share.sql / analytics.sql).
alter table public.social_posts enable row level security;
