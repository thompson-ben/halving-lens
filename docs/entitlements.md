# Membership & Entitlement Engine + Founding Members (Phase 4)

Nothing in the product hardcodes "Free" vs "Premium" vs "Founding Member". A user
holds a **set of independent entitlements**, and features check `hasEntitlement`.
New tiers slot in without a redesign.

## Entitlement engine (`src/lib/entitlements.ts`)

- `Entitlement` union: `founder`, `founding-member`, `early-supporter`,
  `top-referrer`, `premium`, `lifetime-premium`, `beta-tester`, `early-access`,
  `ambassador`.
- `entitlementsFor(ctx)` → `Set<Entitlement>`, derived from:
  - **founder** — the `FOUNDER_EMAIL`.
  - **founding-member** — joined before the milestone/date (see config).
  - **early-supporter** — member number ≤ `EARLY_SUPPORTER_LIMIT`.
  - **top-referrer** — current referral rank ≤ `TOP_REFERRER_LIMIT`.
  - **granted** entitlements (`premium`, `beta-tester`, …) stored on the profile
    (`ProfileState.entitlements`).
- `hasEntitlement(set, key)` — the single check every feature should use, e.g.
  `if (hasEntitlement(ents, "premium")) …` — never `if (accountType === …)`.

## Founding Member programme

- **Eligibility (configurable, permanent):** member number ≤
  `FOUNDING_MEMBER_LIMIT` (default 500) **or** joined before
  `FOUNDING_MEMBER_BEFORE` (a date). Either qualifies. Never lost.
- **Benefits:** `FOUNDING_MEMBER_BENEFITS` — a configurable list (env JSON), shown
  on the Investor Profile and Hall.
- **Badge:** understated `◆ Founding Member`, shown on the profile; also drives the
  join-timeline entry ("Joined as a Founding Member").

## Hall of Founders (`/founders`)

Lists founding members by join order: member number, join month, longest reading
streak, referrals, a light achievements tally, and an ◆ Early Supporter mark for
the first `EARLY_SUPPORTER_LIMIT`. **Privacy-first** — members are shown by number
(no email/PII) unless they set a public `hallName`, and any member can **opt out**
from their Investor Profile (`hideFromHall`, toggled via `/api/profile/hall`).

## Configuration (env, all optional)

| Var | Default | Meaning |
|-----|---------|---------|
| `FOUNDING_MEMBER_LIMIT` | 500 | member-number cut-off for founding status |
| `FOUNDING_MEMBER_BEFORE` | — | date cut-off (e.g. `2026-12-31`) |
| `TOP_REFERRER_LIMIT` | 10 | referral rank that grants `top-referrer` |
| `FOUNDING_MEMBER_BENEFITS` | (built-in list) | JSON array of benefit strings |
| `EARLY_SUPPORTER_LIMIT` | 100 | member-number cut-off for early supporter |

## Granting premium / beta later

Add the key to a profile's `state.entitlements` array (via the profile state
write path). `entitlementsFor` validates it against the grantable set and the
feature's `hasEntitlement` check lights up — no code change.
