// Weekly Round-up configuration. The "What's new" items are editable here (or via
// env JSON) so the Sunday round-up can highlight recent shipping without a code
// change. Keep the newest 2–3; older ones drop off naturally.

export interface RoundupFeature {
  title: string;
  desc: string;
  href: string; // relative path
}

export const ROUNDUP_FEATURES: RoundupFeature[] = (() => {
  try {
    const raw = process.env.ROUNDUP_FEATURES;
    if (raw) return JSON.parse(raw) as RoundupFeature[];
  } catch {
    /* fall through to defaults */
  }
  return [
    { title: "Investor Profile", desc: "Your reading streak, achievements and referral progress in one view.", href: "/profile" },
    { title: "Referral leaderboard", desc: "See where you rank — and climb it.", href: "/dashboard/referrals" },
    { title: "Hall of Founders", desc: "The earliest supporters of HalvingLens, recognised permanently.", href: "/founders" },
  ];
})();
