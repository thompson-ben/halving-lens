-- Pro-waitlist email send log (founder feedback flow, Sep 2026).
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query).
--
-- One row per (waitlist member, email kind) that has been SENT — the single
-- source of truth for "never email a waitlist member the same thing twice":
--   · kind 'confirmation' — the signup confirmation (with the founder's
--     feedback question), sent once on a person's FIRST successful join;
--   · kind 'feedback'     — the one-off founder feedback note to members who
--     joined before the confirmation flow existed.
-- The one-off send skips anyone with EITHER kind recorded, so the two flows
-- can never overlap. Same posture as lifecycle_sends: RLS on, no policies —
-- only the server's service-role key can read/write.

create table if not exists public.pro_waitlist_emails (
  id          bigint generated always as identity primary key,
  email       text not null,
  kind        text not null,            -- 'confirmation' | 'feedback'
  sent_at     timestamptz not null default now()
);

-- Idempotency: a member can only ever be sent a given kind once.
create unique index if not exists pro_waitlist_emails_email_kind_idx
  on public.pro_waitlist_emails (lower(email), kind);

create index if not exists pro_waitlist_emails_kind_idx
  on public.pro_waitlist_emails (kind);

alter table public.pro_waitlist_emails enable row level security;
