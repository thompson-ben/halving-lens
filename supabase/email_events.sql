-- Resend webhook ingestion — provider-reported email deliverability events
-- (delivered / bounced / complained / delayed / sent). This is the analytics
-- sink ONLY; the send path never reads or depends on it, so an ingestion outage
-- can never affect email delivery.
--
-- Privacy-first: we store a salted per-subscriber HASH (emailHash), never the
-- raw address — the same hash space the on-site events table uses, so provider
-- signals can be attributed to a subscriber without holding PII here.
--
-- Idempotent: `event_id` (the Svix delivery id) is UNIQUE, so Resend's at-least-
-- once retries upsert the same row instead of double-counting.
--
-- Run once in the Supabase SQL editor. RLS-on with no policies, so only the
-- server's service-role key can read/write (matches the other analytics tables).

create table if not exists public.email_events (
  id                  bigint generated always as identity primary key,
  event_id            text not null unique,        -- Svix message id — idempotency key
  type                text not null,               -- raw Resend type, e.g. 'email.bounced'
  category            text not null,               -- normalized bucket: delivered|bounced|complained|delayed|sent|opened|clicked|other
  email_hash          text,                        -- salted hash of the recipient (never the raw address)
  provider_message_id text,                        -- Resend email_id — joins to email_sends.provider_message_id
  campaign            text,                         -- from message tags when present
  occurred_at         timestamptz,                 -- provider event time (created_at in the payload)
  created_at          timestamptz not null default now()
);

create index if not exists email_events_category_idx on public.email_events (category);
create index if not exists email_events_occurred_idx  on public.email_events (occurred_at);
create index if not exists email_events_message_idx   on public.email_events (provider_message_id);

alter table public.email_events enable row level security;
