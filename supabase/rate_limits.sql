-- Best-effort rate limiting for public write endpoints (magic-link / OTP requests
-- and Daily Brief subscribe), used by src/lib/rateLimit.ts. One row per limiter
-- key, e.g. "otp:ip:1.2.3.4", "otp:email:you@example.com", "sub:ip:...". The app
-- resets a key's window once it has elapsed, so old rows are harmless. The
-- limiter fails OPEN, so the site works fine even if this table is never created
-- — creating it simply switches the throttling on. Safe to run once.

create table if not exists rate_limits (
  key text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);

-- Optional periodic prune (rows self-reset on next hit, so this is just hygiene):
--   delete from rate_limits where window_start < now() - interval '1 day';
