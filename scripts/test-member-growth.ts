// Member growth footer + referral truthfulness (founder commission, 7 Sep).
//
// Pins the contracts that live OUTSIDE the Brief renderer (which has its own
// pins in test-brief-edition §5c, and the hlb exclusion in test-brief-funnel):
//   · the Pro waitlist source allowlist recognises brief-footer, sourced from
//     the canonical proWaitlist constants (no literal drift);
//   · the dashboard Pro form reads the non-personal source-carrier param;
//   · the send path derives every recipient's referral URL from the ONE
//     canonical generator (referralLink), never a second implementation;
//   · the weekly roundup can no longer promise a phantom referral milestone:
//     its progress line derives from the canonical reward ladder
//     (REWARD_TIERS via nextReward), and its achievements tally counts
//     unlocked canonical tiers — no private milestone lists anywhere.

import { readFileSync } from "node:fs";
import { PRO_SOURCE_BRIEF_FOOTER, PRO_SOURCE_DASHBOARD, PRO_SOURCE_PARAM } from "../src/lib/proWaitlist";
import { REWARD_TIERS, nextReward, referralLink, referralCode } from "../src/lib/referral";
import { progressLine, type RoundupPersonal } from "../src/lib/weeklyRoundup";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// Strip comments so a banned pattern named in prose can never trip a scan.
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

console.log("1 · Pro waitlist source contract");
{
  check("canonical constants pinned", PRO_SOURCE_BRIEF_FOOTER === "brief-footer" && PRO_SOURCE_DASHBOARD === "/cycle-dashboard#pro-early-access" && PRO_SOURCE_PARAM === "pro");
  const route = strip(readFileSync("src/app/api/pro-waitlist/route.ts", "utf8"));
  check("API allowlist derives from the canonical constants", /KNOWN_SOURCES = new Set\(\[PRO_SOURCE_DASHBOARD, PRO_SOURCE_BRIEF_FOOTER\]\)/.test(route));
  check("no literal source strings left to drift in the API", !/"brief-footer"|"\/cycle-dashboard#pro-early-access"/.test(route));
  const form = strip(readFileSync("src/components/lens/ProEarlyAccess.tsx", "utf8"));
  check("dashboard Pro form reads the source-carrier param via the constants", /PRO_SOURCE_PARAM/.test(form) && /PRO_SOURCE_BRIEF_FOOTER/.test(form) && /setSource\(PRO_SOURCE_BRIEF_FOOTER\)/.test(form));
  check("form submits the resolved source (never a hardcoded one)", /JSON\.stringify\(\{ email, source \}\)/.test(form));
  check("join event carries the resolved source", /track\("pro_waitlist_join", \{ source, /.test(form));
}

console.log("2 · Referral URL generation stays canonical");
{
  const send = strip(readFileSync("src/lib/emailSend.ts", "utf8"));
  check("daily send derives recipient referral URLs via referralLink(email)", /referralLink\(email\)/.test(send));
  check("no second referral-code implementation in the send path", !/\?ref=\$\{(?!referralCode)/.test(send));
  const code = referralCode("reader@example.com");
  check("canonical link shape is /?ref=<derived code>, no PII", referralLink("reader@example.com") === `https://halvinglens.com/?ref=${code}` && !code.includes("@"));
}

console.log("3 · Weekly roundup truthfulness — canonical ladder only");
{
  const roundup = strip(readFileSync("src/lib/weeklyRoundup.ts", "utf8"));
  const roundupSend = strip(readFileSync("src/lib/weeklyRoundupSend.ts", "utf8"));
  check("no phantom 'Community Builder' reward anywhere", !/Community Builder/i.test(roundup) && !/Community Builder/i.test(roundupSend));
  check("progress line derives from the canonical ladder (nextReward)", /nextReward\(/.test(roundup));
  check("achievements count unlocked CANONICAL tiers, not a private list", /REWARD_TIERS\.filter\(\(t\) => refs >= t\.referrals\)\.length/.test(roundupSend) && !/\[1, 5, 25\]/.test(roundupSend));

  const p = (referrals: number): RoundupPersonal => ({ name: null, streak: 3, longest: 5, referrals, briefsRead: 12, leaderboardPosition: null, achievements: 0 });
  check("ladder is the canonical 3/10/25/50/100", JSON.stringify(REWARD_TIERS.map((t) => t.referrals)) === JSON.stringify([3, 10, 25, 50, 100]));
  const one = progressLine(p(1));
  check("1 referral → nudges toward the REAL first tier (3)", one.includes("2 referrals away") && one.includes(REWARD_TIERS[0].reward), one);
  const five = progressLine(p(5));
  check("5 referrals → next canonical tier (10), never a phantom milestone", five.includes("5 referrals away") && five.includes(REWARD_TIERS[1].reward), five);
  check("2 away reads singularly at 9 referrals", progressLine(p(9)).includes("1 referral away"));
  check("0 referrals → reading-progress line (nudge behaviour unchanged)", progressLine(p(0)).includes("Daily Brief"));
  check("beyond the top tier → reading-progress line (no invented tier)", progressLine(p(150)).includes("Daily Brief"));
  for (const n of [1, 4, 7, 26, 60]) {
    const next = nextReward(n)!;
    check(`progress line at ${n} quotes the canonical next reward verbatim`, progressLine(p(n)).includes(`${next.remaining} referral${next.remaining === 1 ? "" : "s"} away from your next reward: ${next.tier.reward}.`));
  }
}

console.log("4 · Reward ladder untouched (commission hold)");
{
  const tiers = REWARD_TIERS.map((t) => [t.referrals, t.fulfilment]);
  check("thresholds and fulfilment kinds unchanged", JSON.stringify(tiers) === JSON.stringify([[3, "instant"], [10, "recognition"], [25, "recognition"], [50, "recognition"], [100, "recognition"]]));
  const ref = strip(readFileSync("src/lib/referral.ts", "utf8"));
  check("no paid-Pro/months/discount promises introduced", !/free month|discount|paid Pro|lifetime Pro/i.test(ref));
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll member-growth checks passed");
