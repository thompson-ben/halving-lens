// Premium tier architecture (planning only — no payments, no auth yet).
// Defines the FREE vs PRO feature split so a future paywall can be switched on
// without restructuring. `currentTier()` returns "free" for everyone today;
// `canAccess()` is the single gate every future premium check should call.

export type Tier = "free" | "pro";

export interface TierDefinition {
  tier: Tier;
  label: string;
  features: string[];
}

export const TIERS: Record<Tier, TierDefinition> = {
  free: {
    tier: "free",
    label: "Free",
    features: [
      "homepage",
      "current_research", // today's brief
      "latest_weekly",
      "morning_research_recent_7", // latest 7 editions
      "core_charts",
      "research_library_preview",
    ],
  },
  pro: {
    tier: "pro",
    label: "Pro",
    features: [
      // everything in free, plus:
      "morning_research_full_archive",
      "weekly_archive_full",
      "premium_pdfs",
      "advanced_similar_moments",
      "interactive_research_tools",
      "downloadable_assets",
      "portfolio_tools_future",
      "api_future",
    ],
  },
};

// Free-tier limits, referenced where gating will eventually apply.
export const FREE_LIMITS = {
  morningEditions: 7, // latest N editions free; older = pro
  weeklyReports: 1, // latest weekly free; archive = pro
};

// No auth/payments yet — everyone is free. The single switch a future paywall
// flips. Kept here so callers never hardcode the assumption.
export function currentTier(): Tier {
  return "free";
}

export function canAccess(feature: string, tier: Tier = currentTier()): boolean {
  if (tier === "pro") return true;
  return TIERS.free.features.includes(feature);
}
