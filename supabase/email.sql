-- Email delivery tables for halving.lens (Resend daily brief).
-- Run once in the Supabase SQL editor. All tables are RLS-on with no policies,
-- so only the server's service-role key can read/write them.

-- 1. Subscriber status + unsubscribe support (extends brief_subscribers).
alter table public.brief_subscribers
  add column if not exists status text not null default 'active';
alter table public.brief_subscribers
  add column if not exists unsubscribed_at timestamptz;

create index if not exists brief_subscribers_status_idx
  on public.brief_subscribers (status);

-- Day-2 onboarding "showcase" email — one-time per subscriber. NULL = not yet
-- sent; the drip (sendOnboardingShowcase) stamps this once the tour goes out.
alter table public.brief_subscribers
  add column if not exists showcase_sent_at timestamptz;

-- 2. Per-email send log — one row per recipient per send.
create table if not exists public.email_sends (
  id                    bigint generated always as identity primary key,
  date                  date not null,
  subscriber_id         bigint,
  email                 text not null,
  email_status          text not null,            -- 'delivered' (accepted) | 'failed'
  provider_message_id   text,
  error                 text,
  sent_at               timestamptz not null default now(),
  created_at            timestamptz not null default now()
);
create index if not exists email_sends_date_idx on public.email_sends (date);

-- 3. Daily delivery summary — one row per send day (the intelligence warehouse).
create table if not exists public.email_deliveries (
  id                bigint generated always as identity primary key,
  date              date not null unique,
  subscriber_count  integer not null default 0,
  emails_sent       integer not null default 0,
  emails_delivered  integer not null default 0,
  emails_failed     integer not null default 0,
  provider          text,
  created_at        timestamptz not null default now()
);

-- 4. Weekly send summary — one row per ISO week (idempotency for the Sunday send).
create table if not exists public.weekly_email_deliveries (
  id                bigint generated always as identity primary key,
  slug              text not null unique,          -- ISO week, e.g. 2026-W27
  subscriber_count  integer not null default 0,
  emails_sent       integer not null default 0,
  emails_delivered  integer not null default 0,
  emails_failed     integer not null default 0,
  provider          text,
  created_at        timestamptz not null default now()
);

alter table public.email_sends enable row level security;
alter table public.email_deliveries enable row level security;
alter table public.weekly_email_deliveries enable row level security;
