# Consent-flow review (P2.6)

A review of the current subscription consent implementation, documenting what
exists and what to decide. **This PR (PR3b) does not change consent behaviour**
beyond adding a Privacy-policy link at the point of signup — it records the
current state and the open questions. Changing lawful-basis wording or the
consent model is a deliberate, separate decision.

## What the implementation actually does today

**Capture points**
- `BriefSignup` (homepage + content pages): a **pre-ticked** consent checkbox.
- `StartSignup` (`/free`, `/start` paid landings): **no visible checkbox**; the
  request sends `consent: true` implicitly.

**Wording (BriefSignup)**
> "I'm happy to receive the daily brief and occasional updates. No spam,
> unsubscribe anytime." *(PR3b adds: "See our Privacy policy.")*

**Email types this covers**
- The daily brief and "occasional updates" (welcome/onboarding). Promotional or
  third-party marketing is **not** separated out as its own consent.

**What is stored as evidence**
- A single boolean `consent` on the `brief_subscribers` row, plus `signup_at`.
- **Not** stored: the consent wording/version shown, IP/timestamp of consent as
  a distinct evidence record, or a separate marketing-consent flag.

**Unsubscribe**
- Every email carries one-click unsubscribe (`List-Unsubscribe` +
  `/api/unsubscribe`), and the daily brief is the core requested service.

## Assessment (implementation assumptions, not legal advice)

- The **core service** (daily brief + onboarding) is what the user is actively
  requesting by signing up — a reasonable basis for sending it.
- The **pre-ticked box** and the bundling of "occasional updates" with the core
  service are the main areas to review: under GDPR/PECR, consent for optional
  marketing should generally be **specific, separate and unticked**, and the
  core-service email can stand on the requested-service basis rather than a
  pre-ticked box.
- **Evidence of consent** is currently thin (a boolean). If consent is relied on
  for any optional marketing, capturing the wording version + timestamp would
  strengthen it.

## Recommended follow-up (needs a decision — not done here)

1. Decide the lawful basis for each email type: core brief (requested service)
   vs optional marketing/third-party (separate consent).
2. If keeping a checkbox, make **optional marketing** a separate, **unticked**
   opt-in; let the core brief ride on the requested-service basis.
3. Store consent **evidence**: wording version + timestamp (+ source) on the
   subscriber record.
4. Align the wording across `BriefSignup` and `StartSignup` so the paid landings
   describe the same relationship (the paid pages currently have no checkbox).
5. Confirm the privacy policy text matches the actual analytics + email flows.

These are documented as scope boundaries for a dedicated consent/legal pass; PR3b
intentionally leaves the consent model unchanged.
