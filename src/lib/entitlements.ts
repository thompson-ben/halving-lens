// Membership & entitlement engine. Nothing in the product hardcodes "Free" vs
// "Premium" vs "Founding Member": a user holds a SET of independent entitlements,
// and features check `hasEntitlement(...)`. Some entitlements are derived (from
// signup order, referral rank, the founder email); others are granted and stored
// on the profile (premium, beta, etc.). New tiers slot in here without a redesign.

import { isFounderEmail } from "./profile";

export type Entitlement =
  | "founder" // the platform founder
  | "founding-member" // joined before the founding cut-off (permanent)
  | "early-supporter" // one of the first EARLY_SUPPORTER_LIMIT members
  | "top-referrer" // currently in the referral top N
  | "premium" // granted, stored
  | "lifetime-premium"
  | "beta-tester"
  | "early-access"
  | "ambassador";

// ── Configuration (all env-overridable, no redesign to change) ────────────────
// A member is "founding" if they joined before a member-number milestone OR
// before a cut-off date. Either/both may be set; joining before either qualifies.
export const FOUNDING_MEMBER_LIMIT = Number(process.env.FOUNDING_MEMBER_LIMIT) || 500;
export const FOUNDING_MEMBER_BEFORE = process.env.FOUNDING_MEMBER_BEFORE || ""; // e.g. "2026-12-31"
export const TOP_REFERRER_LIMIT = Number(process.env.TOP_REFERRER_LIMIT) || 10;

// Founding Member benefits — configurable copy, shown on the profile + Hall.
export const FOUNDING_MEMBER_BENEFITS: string[] = (() => {
  try {
    const raw = process.env.FOUNDING_MEMBER_BENEFITS;
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* fall through to defaults */
  }
  return [
    "A permanent Founding Member badge",
    "Recognition in the Hall of Founders",
    "Priority access to new indicators and betas",
    "Exclusive founding-member updates",
    "Early access to Premium features",
  ];
})();

export interface EntitlementContext {
  email: string;
  memberNo: number | null;
  createdAt?: string | null;
  referralRank?: number | null;
  stored?: string[]; // entitlements granted + persisted on the profile
}

export function isFoundingMember(memberNo: number | null, createdAt?: string | null): boolean {
  if (memberNo != null && memberNo <= FOUNDING_MEMBER_LIMIT) return true;
  if (FOUNDING_MEMBER_BEFORE && createdAt) {
    const cut = Date.parse(`${FOUNDING_MEMBER_BEFORE}T23:59:59Z`);
    const joined = Date.parse(createdAt);
    if (Number.isFinite(cut) && Number.isFinite(joined) && joined <= cut) return true;
  }
  return false;
}

// The full set of entitlements a user holds right now.
export function entitlementsFor(ctx: EntitlementContext): Set<Entitlement> {
  const e = new Set<Entitlement>();
  const email = ctx.email.trim().toLowerCase();
  if (isFounderEmail(email)) e.add("founder");
  if (isFoundingMember(ctx.memberNo, ctx.createdAt)) e.add("founding-member");
  if (ctx.memberNo != null && ctx.memberNo <= (Number(process.env.EARLY_SUPPORTER_LIMIT) || 100)) e.add("early-supporter");
  if (ctx.referralRank != null && ctx.referralRank <= TOP_REFERRER_LIMIT) e.add("top-referrer");
  // Granted + stored entitlements (premium, beta, …). Validated against the type.
  for (const s of ctx.stored ?? []) if (GRANTABLE.has(s as Entitlement)) e.add(s as Entitlement);
  return e;
}

export function hasEntitlement(set: Set<Entitlement>, key: Entitlement): boolean {
  return set.has(key);
}

// Entitlements that can be granted + stored on a profile (vs purely derived).
const GRANTABLE = new Set<Entitlement>(["premium", "lifetime-premium", "beta-tester", "early-access", "ambassador"]);

// Human labels for badges / UI.
export const ENTITLEMENT_LABEL: Record<Entitlement, string> = {
  founder: "Founder",
  "founding-member": "Founding Member",
  "early-supporter": "Early Supporter",
  "top-referrer": "Top Referrer",
  premium: "Premium",
  "lifetime-premium": "Lifetime Premium",
  "beta-tester": "Beta Tester",
  "early-access": "Early Access",
  ambassador: "Ambassador",
};
