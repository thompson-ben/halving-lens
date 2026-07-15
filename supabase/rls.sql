-- HalvingLens — Row Level Security backstop for every application table.
--
-- WHY THIS IS SAFE TO RUN
-- The app (and every cron script) reaches Supabase exclusively through the
-- PostgREST REST API with the SERVICE_ROLE key — see src/lib/supabase.ts. The
-- service_role has the BYPASSRLS attribute, so it is completely unaffected by
-- Row Level Security. There is no anon key, no @supabase/supabase-js client and
-- no browser-side database access anywhere in the codebase, so no legitimate
-- read or write path depends on RLS being off.
--
-- WHAT THIS DOES
-- Enables RLS on all 25 public tables. With RLS ON and NO policies defined, the
-- anon, authenticated and public roles are denied every row by default — even
-- though Supabase grants them table-level privileges out of the box. So if the
-- anon key ever leaked, or PostgREST were hit directly with it, it would read
-- and write nothing. The service_role key keeps working unchanged.
--
-- Idempotent: `enable row level security` is a no-op on a table that already has
-- it. Most tables already enable RLS in their own schema file; this consolidated
-- script guarantees the whole set is covered in the live database in one run and
-- closes any drift (notably rate_limits, added later). Safe to run repeatedly.
--
-- Deliberately NO policies: the app never needs anon/authenticated access, so
-- default-deny is the correct, tightest posture. Do not add permissive policies
-- unless a genuine client-side (anon-key) read path is introduced.

-- Identity & audience --------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.profile_otps             enable row level security;
alter table public.brief_subscribers        enable row level security;

-- Rate limiting --------------------------------------------------------------
alter table public.rate_limits              enable row level security;

-- Historical warehouse -------------------------------------------------------
alter table public.daily_cycle              enable row level security;
alter table public.daily_metrics            enable row level security;
alter table public.daily_intelligence       enable row level security;
alter table public.state_changes            enable row level security;
alter table public.cycle_score_components   enable row level security;
alter table public.etf_history              enable row level security;
alter table public.downside_scenarios       enable row level security;
alter table public.sentiment_polls          enable row level security;
alter table public.news_archive             enable row level security;

-- Email delivery -------------------------------------------------------------
alter table public.email_sends              enable row level security;
alter table public.email_deliveries         enable row level security;
alter table public.weekly_email_deliveries  enable row level security;
alter table public.lifecycle_sends          enable row level security;

-- Share links & campaigns ----------------------------------------------------
alter table public.share_campaigns          enable row level security;
alter table public.link_hits                enable row level security;

-- Product analytics ----------------------------------------------------------
alter table public.events                   enable row level security;
alter table public.feedback                 enable row level security;
alter table public.feature_votes            enable row level security;

-- Company history & founder journal ------------------------------------------
alter table public.company_snapshots        enable row level security;
alter table public.company_records          enable row level security;
alter table public.founder_journal          enable row level security;

-- VERIFY (optional): every public table below should read rowsecurity = true.
--   select tablename, rowsecurity
--   from pg_tables
--   where schemaname = 'public'
--   order by rowsecurity, tablename;
