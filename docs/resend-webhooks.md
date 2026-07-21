# Resend webhook ingestion (`/api/webhooks/resend`)

Ingests Resend's delivery events (delivered / bounced / complained / delayed /
sent) into the `email_events` analytics table. This closes the gap the Daily
Brief Intelligence module flagged: HalvingLens can measure its own opens/clicks,
but only the provider can report **deliverability** (bounces, spam complaints,
delivery delays) — the signals behind the unsubscribe-rate and complaint-rate
guardrails.

## Isolation guarantee

This endpoint is **delivery-safe and isolated by design**:

- It only **writes** to the analytics sink (`email_events`).
- Nothing on the email **send** path imports it, so email delivery can never
  depend on ingestion being up.
- A store failure is swallowed and still `200`-acked, so an analytics outage
  never turns into a provider retry-storm or masks delivery health.

## Security & correctness

- **Signature-verified.** Resend signs webhooks with Svix; the handler verifies
  the `svix-id` / `svix-timestamp` / `svix-signature` HMAC against
  `RESEND_WEBHOOK_SECRET` (constant-time), and rejects timestamps outside ±5 min
  (replay protection). Forged requests get `401`.
- **Idempotent.** The Svix message id is stored as a `UNIQUE` `event_id` and
  written with an upsert, so Resend's at-least-once retries never double-count.
- **Privacy-first.** Recipients are stored as the salted `emailHash` (the same
  hash space as the on-site events table) — never the raw address.

## Setup

1. Run `supabase/email_events.sql` once in the Supabase SQL editor.
2. In the Resend dashboard, add a webhook pointing at
   `https://halvinglens.com/api/webhooks/resend` and subscribe to the
   `email.*` events.
3. Copy the signing secret (`whsec_…`) into the environment as
   `RESEND_WEBHOOK_SECRET`. Until it is set, the endpoint acknowledges and
   ignores events (it never stores unverified data).

## Consuming the data

`emailDeliverability(windowDays)` in `src/lib/emailEvents.ts` aggregates the
table into delivered / bounced / complained / delayed counts plus bounce and
complaint rates. Wiring these into the Daily Brief module's guardrails is a
small follow-up, kept separate so this PR remains a pure ingestion change.
