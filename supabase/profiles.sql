-- HalvingLens Profiles — the identity layer behind magic-link sign-in.
-- One row per profile (keyed by email), holding the per-user state blob
-- (saved research, reading history, streak, badges). Run once in the Supabase
-- SQL editor.

create table if not exists public.profiles (
  email         text primary key,
  referral_code text,
  state         jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_referral_code_idx on public.profiles (referral_code);

-- Optional public display name. When set, it replaces the anonymous handle on the
-- referral leaderboard, the Hall of Founders and the weekly round-up. Names are
-- case-insensitively unique; a PARTIAL index (WHERE not null) lets the many
-- members without a name coexist while still preventing two people claiming the
-- same name. Safe to re-run.
alter table public.profiles add column if not exists display_name text;
create unique index if not exists profiles_display_name_lower_idx
  on public.profiles (lower(display_name)) where display_name is not null;

-- Enable Row Level Security. The app reaches Supabase only via the service_role
-- key (which bypasses RLS), so this denies the public anon key without adding any
-- policies — exactly what we want for a table holding emails.
alter table public.profiles enable row level security;

-- Keep updated_at fresh on writes.
create or replace function public.touch_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_profiles_updated_at();
