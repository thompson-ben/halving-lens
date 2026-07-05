-- Lifecycle / onboarding email progress for halving.lens.
-- Run once in the Supabase SQL editor. RLS-on with no policies, so only the
-- server's service-role key can read/write (same posture as the other tables).
--
-- One row per (subscriber, onboarding step) that has been sent — the single
-- source of truth for "never send a duplicate onboarding email", and what lets
-- new steps be added later without re-sending old ones.

create table if not exists public.lifecycle_sends (
  id          bigint generated always as identity primary key,
  email       text not null,
  step        text not null,            -- stable step id, e.g. 'tour', 'referral'
  sent_at     timestamptz not null default now()
);

-- Idempotency: a subscriber can only ever be sent a given step once.
create unique index if not exists lifecycle_sends_email_step_idx
  on public.lifecycle_sends (lower(email), step);

create index if not exists lifecycle_sends_step_idx on public.lifecycle_sends (step);

alter table public.lifecycle_sends enable row level security;

-- Migration seed: the onboarding "tour" (step 'tour') supersedes the old
-- standalone Day-2 "showcase" email. Anyone who already received the showcase
-- must NOT get the tour again, so mark it done for them. Guarded so it's a no-op
-- (rather than an error) if the old showcase_sent_at column was never added.
-- Safe to re-run.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'brief_subscribers' and column_name = 'showcase_sent_at'
  ) then
    insert into public.lifecycle_sends (email, step)
    select lower(email), 'tour'
    from public.brief_subscribers
    where showcase_sent_at is not null
    on conflict do nothing;
  end if;
end $$;
