-- Testimonials (P6.2): reader feedback → moderation → site use.
-- Nothing here is publishable until status = 'approved' (a human approves it in
-- the admin area). Attribution is a salted email HASH (`sub`), never the raw
-- address. Run once in the Supabase SQL editor. RLS-on with no policies, so only
-- the server's service-role key can read/write.

create table if not exists public.testimonials (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  quote         text not null,
  display_name  text not null,
  role          text,                       -- optional, e.g. "long-term holder"
  sub           text,                        -- salted email hash (attribution; never the raw email)
  source        text,                        -- 'day14_email' | 'site' | …
  status        text not null default 'pending',  -- pending | approved | rejected
  reviewed_at   timestamptz
);

create index if not exists testimonials_status_idx on public.testimonials (status);

alter table public.testimonials enable row level security;
