-- Pro-waitlist email send log (founder feedback flow, Sep 2026 — rev 2).
-- Run once in the Supabase SQL editor; SAFE TO RE-RUN (idempotent, and the
-- trailing block upgrades a rev-1 table in place).
--
-- One row per waitlist member, EVER — the at-most-once authority for the
-- founder emails:
--   · kind 'confirmation' — the signup confirmation (founder question),
--     claimed on a person's FIRST successful join;
--   · kind 'feedback'     — the one-off founder note to pre-flow members.
-- A row is an ATOMIC CLAIM created BEFORE any send:
--   · status 'pending'   — claimed, provider acceptance not yet confirmed;
--   · status 'sent'      — provider ACCEPTED (only then is sent_at set);
--   · status 'ambiguous' — the send outcome is unknown (e.g. timeout after
--     the request may have reached the provider): the claim is RETAINED for
--     manual reconciliation, never released for a blind retry.
-- The UNIQUE index on lower(email) alone makes the two kinds MUTUALLY
-- EXCLUSIVE ATOMICALLY: concurrent confirmation + feedback claims for the
-- same member cannot both win, whatever the interleaving.
-- Same posture as the other tables: RLS on, no policies — service-role only.

create table if not exists public.pro_waitlist_emails (
  id          bigint generated always as identity primary key,
  email       text not null,
  kind        text not null,            -- 'confirmation' | 'feedback'
  status      text not null default 'pending',  -- 'pending' | 'sent' | 'ambiguous'
  claimed_at  timestamptz not null default now(),
  sent_at     timestamptz,              -- ONLY set on confirmed provider acceptance
  provider_id text                      -- the provider's message id, on acceptance
);

-- ONE member, ONE founder email, EVER — atomic across BOTH kinds.
create unique index if not exists pro_waitlist_emails_email_idx
  on public.pro_waitlist_emails (lower(email));

create index if not exists pro_waitlist_emails_kind_idx
  on public.pro_waitlist_emails (kind);

alter table public.pro_waitlist_emails enable row level security;

-- ── Upgrade from rev 1 (no-ops on a fresh rev-2 table) ──────────────────────
alter table public.pro_waitlist_emails add column if not exists status text not null default 'pending';
alter table public.pro_waitlist_emails add column if not exists claimed_at timestamptz not null default now();
alter table public.pro_waitlist_emails add column if not exists provider_id text;
alter table public.pro_waitlist_emails alter column sent_at drop not null;
alter table public.pro_waitlist_emails alter column sent_at drop default;
-- rev 1's per-kind uniqueness is superseded by the stricter one-per-member index.
drop index if exists pro_waitlist_emails_email_kind_idx;
