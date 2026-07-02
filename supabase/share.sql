-- Sharing + short-link infrastructure for halving.lens.
-- Run once in the Supabase SQL editor. RLS-on with no policies, so only the
-- server's service-role key can read/write (same posture as the other tables).
--
-- Canonical page links (/r/home, /r/hl-r002, …) need NO row here — they resolve
-- in code (src/lib/shareLinks.ts). Only intentional Founder CAMPAIGN links
-- (/r/norfolk-networking) are stored, so the table stays small and clean.

-- 1) Founder share campaigns — one row per named, reusable campaign link.
create table if not exists public.share_campaigns (
  id                bigint generated always as identity primary key,
  slug              text not null unique,          -- /r/<slug>, e.g. 'norfolk-networking'
  name              text not null,                 -- friendly label, e.g. 'Norfolk Networking'
  destination_path  text not null default '/',     -- where the redirect lands
  utm_source        text,                          -- optional attribution overrides…
  utm_medium        text,
  utm_campaign      text,
  utm_content       text,
  utm_term          text,
  notes             text,
  created_by        text,                          -- founder email (optional)
  archived          boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists share_campaigns_slug_idx on public.share_campaigns (slug);

-- 2) Link hits — one row per redirect through /r/<slug> (the recipient side).
-- Records how the link was opened (qr scan / link) and where it went, so we can
-- measure QR scans, share-to-visit and campaign performance. No PII: referrer +
-- a truncated user-agent only, bots excluded before insert.
create table if not exists public.link_hits (
  id             bigint generated always as identity primary key,
  slug           text not null,
  kind           text not null,                    -- 'canonical' | 'finding' | 'encoded' | 'campaign' | 'unknown'
  destination    text not null,
  method         text not null default 'link',     -- 'qr' | 'link' | 'copy' | 'native' | 'x' | 'linkedin' | 'email'
  campaign_slug  text,                              -- set when kind = 'campaign'
  content_type   text,                              -- 'finding' | 'page' | 'brief' | 'weekly' | …
  content_id     text,                              -- e.g. 'HL-R002'
  referrer       text,
  ua             text,
  created_at     timestamptz not null default now()
);
create index if not exists link_hits_slug_idx on public.link_hits (slug);
create index if not exists link_hits_campaign_idx on public.link_hits (campaign_slug);
create index if not exists link_hits_created_idx on public.link_hits (created_at);

alter table public.share_campaigns enable row level security;
alter table public.link_hits enable row level security;
