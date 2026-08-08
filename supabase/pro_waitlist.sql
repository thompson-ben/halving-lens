-- HalvingLens Pro early-access waitlist (Cycle Dashboard V2, CD2).
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- First-class Pro demand capture — deliberately SEPARATE from
-- brief_subscribers: joining the waitlist subscribes no one to anything
-- else, and this table is the authoritative demand count. The
-- /api/pro-waitlist route inserts here using the service-role key from the
-- server only, so Row Level Security stays ON and the table is not publicly
-- readable/writable. Idempotent by design: the unique email means a repeat
-- submission is a 409 the route reports as a harmless "existing".

create table if not exists public.pro_waitlist (
  id          bigint generated always as identity primary key,
  email       text not null unique,
  source      text not null,
  created_at  timestamptz not null default now()
);

-- Case-insensitive uniqueness (so Foo@x.com == foo@x.com). The app already
-- lowercases, but this is a belt-and-braces guard.
create unique index if not exists pro_waitlist_email_lower_idx
  on public.pro_waitlist (lower(email));

-- Lock the table down: RLS on, no policies => only the service-role key (used
-- by the server route) can read/write. Anonymous/public clients get nothing.
alter table public.pro_waitlist enable row level security;
