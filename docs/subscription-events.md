# Subscription — event contract, reliability & verification (PR1)

Scope: P0 only — subscription reliability and analytics/Meta Lead integrity. No
CRO/copy/layout changes. This document is the source of truth for what fires,
when, and why.

## Outcome contract (`POST /api/subscribe`)

The endpoint returns a discriminated outcome. A **success state and any
conversion event may only occur after the server confirms the subscriber was
durably captured.**

| Outcome | HTTP | Meaning | Durably persisted? |
|---|---|---|---|
| `created` | 200 | New subscriber persisted (Supabase insert, or an approved webhook fallback captured it) | Yes |
| `existing` | 200 | Address already belongs to an active subscriber (Supabase 409) | Yes (already) |
| `invalid` | 400 | Validation failed (bad email / malformed request) | N/A |
| `rate_limited` | 429 | Per-IP (12/h) or per-email (3/h) limit hit | N/A |
| `error` | 503 | Persistence failed and nothing durably captured the signup — **retryable** | No |

Response body: `{ ok: boolean, outcome: SubscribeOutcome, error?: string }`.

Key rule change from previous behaviour: the endpoint **no longer returns
`{ok:true}` when nothing was stored**. If Supabase is unavailable and no webhook
fallback captures the signup, it returns `503 error`. A diagnostic log line is
written but **logging alone is never treated as success**.

## Client behaviour (`BriefSignup`, `StartSignup`)

The pure `decideFromResponse(status, body)` (`src/lib/subscription.ts`) maps the
response to a UI state and decides whether the conversion fires. It is **total**:

- Network failure / timeout → `status = null` → **error** (retryable), no conversion.
- A `2xx` with a missing/unknown `outcome` → **error**, never assumed success.
- Success shown only for `created` / `existing`.

UX guarantees:
- Entered email is preserved on any failure; the CTA becomes **“Try again”**.
- Duplicate submissions are blocked while a request is in flight (`busy`/`submitting` guard, input + button disabled).
- Accessibility: success uses `role="status" aria-live="polite"`; errors use `role="alert"`; the input sets `aria-invalid` + `aria-describedby`; the button sets `aria-busy`.
- `StartSignup`’s 3.5s auto-redirect now fires **only on a confirmed success/existing** (never on error). Replacing it with a dedicated confirmation page is **P5**, out of scope here.

## Analytics event contract

| Event | Trigger | Represents | Fires Meta `Lead` / GA4 `sign_up`? |
|---|---|---|---|
| `subscription_submit_attempt` | Form submitted (passed client validation) | attempt | No |
| `signup` | Confirmed `created` | success — the **single canonical conversion event**, chosen by `decideFromResponse` (consumed by analytics + Founder Intelligence conversion/WEAS metrics) | **Yes** (`fireLead`) |
| `subscription_existing` | Confirmed `existing` | recognised returning subscriber | **No** |
| `subscription_failure` | `invalid` / `rate_limited` / `error` / network | failure (with `category`: validation \| rate_limit \| server \| network) | **No** |

Notes:
- **Meta `Lead` and GA4 `sign_up` fire only on `created`.** They no longer fire for existing subscribers, failures, or unconfirmed client success. (Previously `StartSignup` fired them in a `finally` block — i.e. on every submit including failures; that is fixed.)
- **Exactly one first-party event per outcome (PR136).** The former `subscription_success` event was removed: it fired alongside `signup` on the same successful submit, so once the taxonomy accepted it every new subscriber would have been counted twice. `decideFromResponse` now returns `signup` directly as the success event, and the components fire `d.analyticsEvent` exactly once per submit — `scripts/test-subscribe.ts` and `scripts/test-analytics-events.ts` both guard this.
- **No raw email is ever sent to analytics or ad platforms** (unchanged). First-party `track()` posts to `/api/track` with no email; `fireLead()` sends no PII. First-touch attribution (`getAttribution()`) rides along and is not overwritten.

## Structured logging (P0.3)

On a persistence failure the route logs a single structured line:
`[subscribe] persist_failed { ts, placement, outcome, supabase, webhookConfigured, webhookOk, sub }`
where `sub` is the salted `emailHash` — **never the raw address**. Placement is
the form `source` (carries page + attribution + variant already).

## Consent — current behaviour (documented, NOT changed in PR1)

Recorded here as a scope boundary; the full lawful-basis/wording review is **P2.6**.

- **Default state:** the consent checkbox is **pre-ticked** (`consent = true`) in `BriefSignup`. `StartSignup` sends `consent: true` implicitly (no visible checkbox on the paid landings).
- **Current wording (`BriefSignup`):** “I’m happy to receive the daily brief and occasional updates. No spam, unsubscribe anytime.”
- **Email types covered:** the daily brief + “occasional updates” (onboarding/welcome). Promotional/third-party marketing is not separated out.
- **Consent evidence stored:** a single boolean `consent` on the `brief_subscribers` row plus `signup_at`; no versioned wording snapshot or separate marketing-consent field.
- **P2.6 follow-up:** confirm lawful basis; consider separating core-service email from optional marketing consent (separate, unticked); capture consent wording version + timestamp as evidence; review the pre-ticked default.

PR1 intentionally leaves all of the above unchanged.

## Files changed (PR1)

- `src/lib/subscription.ts` (new) — shared outcome type + pure `decideFromResponse`.
- `src/lib/subscribeCore.ts` (new) — pure email validation + `resolveOutcome`.
- `src/app/api/subscribe/route.ts` — discriminated outcomes, fail-closed 503, structured hashed logging.
- `src/components/BriefSignup.tsx` — outcome-aware UI, a11y, retry, double-submit guard, gated conversion.
- `src/components/LandingClient.tsx` (`StartSignup`) — same, plus events moved out of `finally`; redirect only on success.
- `scripts/test-subscribe.ts` (new) + `package.json` script.

## Automated tests (`npm run test-subscribe`)

Pure `decideFromResponse`: created / existing / 400 / 429 / 503 / network / ambiguous-2xx. Pure `resolveOutcome`: created / duplicate / webhook-fallback / webhook-failed / no-fallback. Route handler (mocked fetch + env): new → 200 created, duplicate → 200 existing, persistence failure → 503 error, invalid email → 400, malformed JSON → 400, over-limit → 429. Conversion integrity asserted at every branch (fires only on `created`).

---

## Vercel preview verification checklist

Run against the **preview deployment** with a **staging / isolated Supabase** (never the live subscriber DB).

Environment for the preview:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` → point at a **staging** project with a `brief_subscribers` table (see `supabase/*.sql`).
- Optional `SIGNUP_WEBHOOK_URL` → a throwaway sink (e.g. webhook.site) to verify the durable fallback.
- `RESEND_API_KEY` optional (leave unset to skip real welcome emails, or use a test key + test inbox).
- `NEXT_PUBLIC_META_PIXEL_ID` / `NEXT_PUBLIC_GA4_ID` → **test pixel / test GA property** so Lead events don’t pollute production optimisation. Use Meta Pixel Helper + GA4 DebugView.
- Add `?notrack=0` is not needed; to exclude your own first-party analytics while testing use `?notrack=1`.

Exact test cases to run on the preview URL (both `/free` and homepage `BriefSignup`, desktop + mid-range mobile profile):

1. **New email** → success state shown; Meta Pixel Helper shows exactly **one `Lead`**; GA4 DebugView shows one `sign_up`; row appears in staging `brief_subscribers`; welcome email received (if Resend test key set).
2. **Same email again** → “already subscribed” state; **no `Lead`**, no `sign_up`; `subscription_existing` present in `/api/track` payloads; no duplicate row.
3. **Invalid email** (`foo`) → inline validation error; no network request fires Lead; CTA reads “Try again”.
4. **Rate limit** → submit >12 times/hour from one IP (or lower staging limits) → 429 “too many attempts”; no Lead.
5. **Server failure** → temporarily point `SUPABASE_URL` at an unreachable/invalid staging value (NOT production) → error state “your email wasn’t saved”, retry available, **no `Lead`**, `503` in the network tab, `persist_failed` in Vercel logs with a hashed `sub` (no raw email).
6. **Network failure** → throttle/offline in devtools mid-submit → error state, no false success, no Lead.
7. **Duplicate click** → double-click submit rapidly → only one `/api/subscribe` request; button disabled while busy.
8. **Accessibility** → screen reader announces success (`status`) and errors (`alert`); keyboard-only submit works; input marked invalid on validation error.
9. **Redirect** → on `/free` success, auto-redirect to `/` after ~3.5s; on error, **no redirect**.
10. **No PII** → inspect `/api/track` payloads and the Meta/GA network calls — confirm no raw email is present.

Sign-off: capture screenshots of states 1, 2, 3, 5 (desktop + mobile) and the Meta Pixel Helper on state 1 (one Lead) and state 2 (no Lead).
