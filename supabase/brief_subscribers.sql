-- Daily Brief waitlist table for halving.lens.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- The /api/subscribe route inserts here using the service-role key from the
-- server only, so Row Level Security stays ON and the table is not publicly
-- readable/writable.

create table if not exists public.brief_subscribers (
  id          bigint generated always as identity primary key,
  email       text not null unique,
  source      text,
  consent     boolean not null default false,
  signup_at   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Case-insensitive uniqueness (so Foo@x.com == foo@x.com). The app already
-- lowercases, but this is a belt-and-braces guard.
create unique index if not exists brief_subscribers_email_lower_idx
  on public.brief_subscribers (lower(email));

-- Lock the table down: RLS on, no policies => only the service-role key (used
-- by the server route) can read/write. Anonymous/public clients get nothing.
alter table public.brief_subscribers enable row level security;
