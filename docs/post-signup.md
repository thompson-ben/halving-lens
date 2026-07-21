# Post-signup experience (PR5 / P5)

## What changed

- **P5.1 — No more forced redirect.** `StartSignup` (the `/free` + `/start`
  paid landings) previously auto-redirected to `/` after 3.5s. That timer is
  removed. Both `StartSignup` and `BriefSignup` now render a shared
  `SignupConfirmation` component with clear, ordered next steps.
- **P5.1 — Confirmation (new subscriber):** "You're subscribed — your first
  email is on its way." then three ordered steps:
  1. **Open the welcome email** — confirms delivery + prompts adding
     `brief@halvinglens.com` to contacts (doubles as deliverability guidance).
  2. **Read today's cycle analysis** → one recommended page (`/state-of-bitcoin`),
     not a wall of links.
  3. **Set up your member profile** → `/profile` (streak, referrals, Founding
     Member status).
  Optional: a single **Share HalvingLens** link, after the core steps.
- **P5.2 — Existing subscriber.** An already-subscribed address gets a distinct
  "You're already subscribed" state — **no "duplicate signup" implication and no
  new Lead** (the Lead gating was fixed in PR1). It offers: **Read today's
  analysis** and **Access your profile** (sign in / request a new access link).
- **P5.3 — Deliverability guidance.** Kept concise on both variants: check
  spam/promotions, add the sender, and the brief arrives ~8am UK. Not overloaded.

## Files
- `src/components/SignupConfirmation.tsx` *(new)* — shared success/existing confirmation.
- `src/components/LandingClient.tsx` (`StartSignup`) — removed the 3.5s redirect; renders the confirmation.
- `src/components/BriefSignup.tsx` — renders the confirmation in its done state.

## P5.4 — Full lifecycle entry verification (run on the Vercel preview)

The confirmation UX is verified by build/lint/typecheck; the **lifecycle** behind
it depends on live Supabase + Resend, so verify on the preview with a staging/
isolated store (never the live subscriber DB):

1. **Welcome email** — a brand-new address receives the welcome email immediately
   (sent only on `created`, per PR1).
2. **Onboarding sequence** — the subscriber enters the lifecycle drip as expected
   (welcome → day-2 showcase, etc.).
3. **Daily brief eligibility** — the new subscriber is included in the next daily
   send.
4. **Founding Member status** — creating a profile before member #500 confers
   Founding Member status and it shows in the Hall of Founders.
5. **Referral attribution** — a signup via a `?ref=`/`/r/<slug>` link attributes
   to the referrer (first-touch attribution preserved).
6. **Profile identity linking** — `/profile` sign-in (code / access link via
   `/api/profile/verify-code`) links the subscriber to their profile.
7. **Unsubscribe** — one-click unsubscribe works and stops further sends.
8. **Existing-subscriber path** — re-submitting a subscribed address shows the
   "already subscribed" state, sends **no** welcome, and fires **no** Lead.

## Not in scope here
- A standalone `/welcome` route was not added — the inline confirmation keeps the
  visitor on the (chrome-free) landing with clear next steps, which is simpler and
  avoids an extra navigation. Can revisit if a shareable confirmation URL is wanted.
