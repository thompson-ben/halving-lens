-- One-time sign-in codes for the HalvingLens Profile (an alternative to the
-- magic link — codes carry no scannable URL, so they pass corporate mail
-- security gateways that quarantine link-based sign-in emails). Only a HASH of
-- the code is stored; codes expire and are rate-limited. Run once.

create table if not exists public.profile_otps (
  email       text primary key,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  created_at  timestamptz not null default now()
);

-- Reached only via the service_role key (bypasses RLS); deny the anon key.
alter table public.profile_otps enable row level security;
