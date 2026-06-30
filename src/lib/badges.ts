// Achievement / badge framework. Config-driven and rarity-tiered, designed so
// early badges become permanently unobtainable (genuine prestige) and so badges
// can later appear beside usernames in comments, leaderboards and profiles
// without redesign.
//
// Phase 1: badges that can be earned from on-device signals (streaks, research
// read, indicators viewed, dashboard use) are live for anonymous visitors.
// Legacy / founding / referral badges depend on per-account identity (Phase 2)
// and are defined here but shown as locked until accounts exist.

export type BadgeCategory = "Community" | "Loyalty" | "Research" | "Referral" | "Product";
export type BadgeRarity = "Common" | "Rare" | "Epic" | "Legendary";

export type BadgeSignal =
  | "researchRead"
  | "metricsViewed"
  | "savedCount"
  | "streak"
  | "dashboardVisits"
  | "viewedAccumulation"
  | "viewedSentiment";

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  signal?: BadgeSignal; // omitted ⇒ requires accounts (legacy/referral)
  target?: number; // threshold for the signal (default 1 for boolean signals)
  legacy?: boolean; // never obtainable again once the window closes
  requiresAccount?: boolean; // can't be evaluated until Phase 2
}

export const BADGES: BadgeDef[] = [
  // Loyalty — streaks
  { id: "streak-7", name: "7-Day Streak", description: "Visited HalvingLens 7 days running.", category: "Loyalty", rarity: "Common", signal: "streak", target: 7 },
  { id: "streak-30", name: "30-Day Streak", description: "A full month, every day.", category: "Loyalty", rarity: "Rare", signal: "streak", target: 30 },
  { id: "streak-100", name: "100-Day Streak", description: "One hundred consecutive days.", category: "Loyalty", rarity: "Epic", signal: "streak", target: 100 },
  { id: "streak-365", name: "365-Day Streak", description: "A full year, unbroken.", category: "Loyalty", rarity: "Legendary", signal: "streak", target: 365 },

  // Research
  { id: "research-reader", name: "Research Reader", description: "Read 10 research pieces.", category: "Research", rarity: "Common", signal: "researchRead", target: 10 },
  { id: "research-scholar", name: "Research Scholar", description: "Read 25 research pieces.", category: "Research", rarity: "Rare", signal: "researchRead", target: 25 },
  { id: "research-master", name: "Research Master", description: "Read 50 research pieces.", category: "Research", rarity: "Epic", signal: "researchRead", target: 50 },
  { id: "research-collector", name: "Research Collector", description: "Saved 5 research pieces.", category: "Research", rarity: "Common", signal: "savedCount", target: 5 },

  // Product
  { id: "dashboard-explorer", name: "Dashboard Explorer", description: "Made your dashboard home.", category: "Product", rarity: "Common", signal: "dashboardVisits", target: 1 },
  { id: "indicator-specialist", name: "Indicator Specialist", description: "Explored 10 different indicators.", category: "Product", rarity: "Rare", signal: "metricsViewed", target: 10 },
  { id: "accumulation-hunter", name: "Accumulation Hunter", description: "Studied the Accumulation Index.", category: "Product", rarity: "Common", signal: "viewedAccumulation", target: 1 },
  { id: "market-observer", name: "Market Observer", description: "Checked market sentiment.", category: "Product", rarity: "Common", signal: "viewedSentiment", target: 1 },

  // Community — legacy / founding (require accounts; permanently scarce)
  { id: "early-supporter", name: "Early Supporter", description: "Joined before the first 1,000 subscribers.", category: "Community", rarity: "Legendary", legacy: true, requiresAccount: true },
  { id: "founding-100", name: "Founding 100", description: "One of the first 100 active members.", category: "Community", rarity: "Legendary", legacy: true, requiresAccount: true },
  { id: "founding-500", name: "Founding 500", description: "One of the first 500 members.", category: "Community", rarity: "Epic", legacy: true, requiresAccount: true },
  { id: "founding-1000", name: "Founding 1000", description: "One of the first 1,000 members.", category: "Community", rarity: "Rare", legacy: true, requiresAccount: true },

  // Referral (require accounts)
  { id: "referral-champion", name: "Referral Champion", description: "Introduced engaged subscribers.", category: "Referral", rarity: "Rare", requiresAccount: true },
  { id: "ambassador", name: "Ambassador", description: "A leading advocate for HalvingLens.", category: "Referral", rarity: "Epic", requiresAccount: true },
];

export interface BadgeState {
  def: BadgeDef;
  earned: boolean;
  progress: number; // current value toward target
  target: number;
  locked: boolean; // requires accounts / not yet obtainable
}

export function evaluateBadges(signals: Partial<Record<BadgeSignal, number>>): BadgeState[] {
  return BADGES.map((def) => {
    const target = def.target ?? 1;
    if (def.requiresAccount || !def.signal) {
      return { def, earned: false, progress: 0, target, locked: true };
    }
    const value = signals[def.signal] ?? 0;
    return { def, earned: value >= target, progress: Math.min(value, target), target, locked: false };
  });
}

export const RARITY_TONE: Record<BadgeRarity, string> = {
  Common: "border-white/[0.12] text-ink-200",
  Rare: "border-signal-blue/40 text-signal-blue",
  Epic: "border-signal-violet/40 text-signal-violet",
  Legendary: "border-[#d9b96a]/50 text-[#d9b96a]",
};
