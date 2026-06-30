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
