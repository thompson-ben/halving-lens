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
import { proFeedbackEmail, proConfirmationEmail, proReplyTo, sendProWaitlistEmail, proEmailIdempotencyKey, proConfirmationsEnabled } from "../src/lib/proWaitlistEmails";
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

console.log("2 · Referral destinations stay canonical (member vs friend facing)");
{
  // Founder UX correction (7 Sep): the Brief's referral CTA is MEMBER-facing
  // (the referral dashboard) — the Brief embeds NO friend-facing /?ref link
  // and no per-recipient referral plumbing.
  const send = strip(readFileSync("src/lib/emailSend.ts", "utf8"));
  check("daily send embeds no friend-facing referral link (no referralLink plumbing)", !/referralLink/.test(send) && !/\?ref=/.test(send));
  const brief = strip(readFileSync("src/lib/briefEditionEmail.ts", "utf8"));
  check("Brief referral CTA targets the member referral dashboard", /REFERRAL_INVITE_PATH = "\/dashboard\/referrals"/.test(brief) && !/\?ref=/.test(brief));
  // The friend-facing link remains the canonical generator's job where it
  // belongs: the referral dashboard and the lifecycle emails — untouched.
  const dash = strip(readFileSync("src/app/dashboard/referrals/page.tsx", "utf8"));
  check("referral dashboard still shares via canonical referralLink", /referralLink\(p\.email/.test(dash));
  const lifecycle = strip(readFileSync("src/lib/lifecycleSend.ts", "utf8"));
  check("lifecycle referral emails unchanged (canonical referralCode link)", /referralCode\(email\)/.test(lifecycle));
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

console.log("5 · Pro-waitlist founder feedback emails (commission, 20 Sep)");
(async () => {
  const fb = proFeedbackEmail();
  check("feedback subject is the approved copy", fb.subject === "A quick question about HalvingLens Pro");
  check(
    "feedback body carries the founder's three questions verbatim",
    fb.text.includes("Ben here, founder of HalvingLens. Thanks for joining the Pro waitlist.") &&
      fb.text.includes("1. What caught your attention enough to join the waitlist?") &&
      fb.text.includes("which tools or sources did you use?") &&
      fb.text.includes("3. What was frustrating or missing from that experience?") &&
      fb.text.includes("Just hit reply—even a quick answer to one question would be helpful."),
  );
  const cf = proConfirmationEmail();
  check("confirmation subject is the approved copy", cf.subject === "You’re on the HalvingLens Pro waitlist");
  check(
    "confirmation body asks the one open question verbatim",
    cf.text.includes("I’ll email you when there’s an update on availability and what’s included.") &&
      cf.text.includes("One quick question: what are you hoping Pro will help you with?") &&
      cf.text.includes("Just hit reply—I’d appreciate hearing what matters most to you"),
  );
  for (const [name, c] of [["feedback", fb], ["confirmation", cf]] as const) {
    check(`${name}: listens, never steers — no price or feature pitch`, !/£|\$\d|price|alert|watchlist|discount|per month|\/month/i.test(c.text + c.subject));
    check(`${name}: HTML mirrors the plain-text words`, ["Just hit reply", "Founder, HalvingLens"].every((s) => c.html.includes(s)));
    check(`${name}: personal presentation — not the house dark template`, !c.html.includes("#0a0c10") && !/table role="presentation" width="600"/.test(c.html));
  }

  // Public/internal reply split (founder decision, 20 Sep): subscriber
  // conversations use the DEDICATED public address (PRO_REPLY_TO_EMAIL,
  // ben@halvinglens.com); FOUNDER_EMAIL stays internal-only (notifications
  // and test recipients) and must NEVER leak into a subscriber Reply-To.
  const prevPublic = process.env.PRO_REPLY_TO_EMAIL;
  const prevFounder = process.env.FOUNDER_EMAIL;
  process.env.PRO_REPLY_TO_EMAIL = "Ben@HalvingLens.com ";
  check("Reply-To comes from the dedicated PUBLIC configuration (normalised)", proReplyTo() === "ben@halvinglens.com");
  delete process.env.PRO_REPLY_TO_EMAIL;
  process.env.FOUNDER_EMAIL = "internal@example.com";
  check("FOUNDER_EMAIL alone yields NO Reply-To — no fallback can expose the internal address", proReplyTo() == null);
  const unconfigured = await sendProWaitlistEmail("reader@example.com", "feedback");
  check("reply-first email never sends without the public Reply-To (fail safe)", unconfigured.outcome === "skipped_unconfigured");
  delete process.env.FOUNDER_EMAIL;
  if (prevPublic != null) process.env.PRO_REPLY_TO_EMAIL = prevPublic;
  if (prevFounder != null) process.env.FOUNDER_EMAIL = prevFounder;
  check("the email module never references the internal FOUNDER_EMAIL at all", !/FOUNDER_EMAIL/.test(strip(readFileSync("src/lib/proWaitlistEmails.ts", "utf8"))));

  const lib = strip(readFileSync("src/lib/proWaitlistEmails.ts", "utf8"));
  // AT-MOST-ONCE by construction (founder review, 20 Sep): the log row is an
  // ATOMIC CLAIM written before the send — concurrent executions are
  // arbitrated by the unique index (409 loses), and a successful send can
  // never lose its record because the record precedes it. A failed send
  // releases the claim (retryable); a stuck claim blocks retries — no
  // duplicate is possible in any failure ordering.
  const sendFn = lib.slice(lib.indexOf("export async function sendProWaitlistEmail"));
  check("the claim PRECEDES the send — a successful send can never lose its record", sendFn.indexOf("await claimSend(") > 0 && sendFn.indexOf("await claimSend(") < sendFn.indexOf("await sendEmail("));
  check("the claim is conflict-aware (409 = a claim already exists, send nothing)", /status === 409/.test(lib) && /"already"/.test(lib));
  check("an unavailable store means nothing sends (fail safe)", /skipped_unverifiable/.test(lib) && sendFn.includes('claim === "unavailable"'));
  check("a DEFINITIVE rejection releases the claim so a retry can re-claim", /releaseClaim\(email, kind\)/.test(sendFn) && /sbDelete\("pro_waitlist_emails"/.test(lib));
  check("a stuck claim is loud and blocks retries in the safe direction", /send_failed_claim_stuck/.test(sendFn));

  // Delivery-state v2 (founder review, 21 Sep):
  check("claims are born 'pending' with NO sent_at — sent_at exists only on provider acceptance", /JSON\.stringify\(\{ email: email\.toLowerCase\(\), kind, status: "pending" \}\)/.test(lib) && /res\.ok/.test(sendFn) && sendFn.indexOf('status: "sent"') > sendFn.indexOf("await sendEmail("));
  check("provider acceptance records sent_at + provider id on the claim", /sent_at: new Date\(\)\.toISOString\(\)/.test(sendFn) && /provider_id: res\.id/.test(sendFn));
  check("an AMBIGUOUS outcome RETAINS the claim (never released, never blind-retried)", sendFn.includes("res.ambiguous") && /send_ambiguous_retained/.test(sendFn) && /status: "ambiguous"/.test(sendFn) && sendFn.indexOf("res.ambiguous") < sendFn.indexOf("releaseClaim"));
  check("an accepted-but-unrecorded send stays claimed and is loud", /sent_record_incomplete/.test(sendFn));
  check("every send carries a deterministic provider idempotency key", /idempotencyKey: proEmailIdempotencyKey\(email, kind\)/.test(sendFn));
  check("the idempotency key is stable, case-insensitive and distinct per kind", proEmailIdempotencyKey("A@x.com", "feedback") === proEmailIdempotencyKey(" a@X.com ", "feedback") && proEmailIdempotencyKey("a@x.com", "feedback") !== proEmailIdempotencyKey("a@x.com", "confirmation") && !proEmailIdempotencyKey("a@x.com", "feedback").includes("a@x.com"));
  const resendSrc = strip(readFileSync("src/lib/resend.ts", "utf8"));
  check("the provider client marks network/5xx outcomes ambiguous and supports Idempotency-Key", /ambiguous: true/.test(resendSrc) && /Idempotency-Key/.test(resendSrc) && /res\.status >= 500/.test(resendSrc));
  const schemaV2 = readFileSync("supabase/pro_waitlist_emails.sql", "utf8");
  check("cross-kind exclusion is ATOMIC: one member, one founder email, ever (unique lower(email) alone)", /create unique index if not exists pro_waitlist_emails_email_idx\s*\n\s*on public\.pro_waitlist_emails \(lower\(email\)\);/.test(schemaV2) && /drop index if exists pro_waitlist_emails_email_kind_idx/.test(schemaV2));
  check("schema: sent_at nullable, only on acceptance (rev-1 upgrade included)", /sent_at\s+timestamptz,/.test(schemaV2) && /alter column sent_at drop not null/.test(schemaV2));
  check("Reply-To wired on the actual send", /sendEmail\(\{\s*to: email,\s*subject: c\.subject,\s*html: c\.html,\s*text: c\.text,\s*replyTo,\s*idempotencyKey/.test(lib));

  const schema = readFileSync("supabase/pro_waitlist_emails.sql", "utf8");
  check("send log locked down (RLS), and listed in the consolidated rls.sql", /alter table public\.pro_waitlist_emails enable row level security/.test(schema) && /public\.pro_waitlist_emails\s+enable row level security/.test(readFileSync("supabase/rls.sql", "utf8")));

  const route = strip(readFileSync("src/app/api/pro-waitlist/route.ts", "utf8"));
  const createdBranch = route.slice(route.indexOf('if (stored === "created")'), route.indexOf('if (stored === "duplicate")'));
  check("confirmation fires ONLY on a first successful join (the created branch)", createdBranch.includes('sendProWaitlistEmail(email, "confirmation")') && (route.match(/await sendProWaitlistEmail/g) ?? []).length === 1);
  check("capture first: the join is durable before any email is attempted", route.indexOf("await storeInterest(") < route.indexOf("await sendProWaitlistEmail"));
  check("a failed confirmation can never change the join response", /try \{\s*const r = await sendProWaitlistEmail/.test(route) && createdBranch.includes('outcome: "created"'));
  check("confirmations are PAUSED behind the explicit enable flag; capture is untouched", createdBranch.includes("proConfirmationsEnabled()") && route.indexOf("await storeInterest(") < route.indexOf("proConfirmationsEnabled()"));
  const prevFlag = process.env.PRO_CONFIRMATION_EMAILS;
  delete process.env.PRO_CONFIRMATION_EMAILS;
  check("the enable flag defaults OFF (paused)", proConfirmationsEnabled() === false);
  process.env.PRO_CONFIRMATION_EMAILS = "1";
  check("the enable flag turns on only when explicitly set", proConfirmationsEnabled() === true);
  if (prevFlag != null) process.env.PRO_CONFIRMATION_EMAILS = prevFlag; else delete process.env.PRO_CONFIRMATION_EMAILS;
  const health = strip(readFileSync("src/app/api/pro-waitlist/health/route.ts", "utf8"));
  check("health exposes reply/enable state as BOOLEANS only (never an address)", /publicReplyTo: proReplyTo\(\) != null/.test(health) && /confirmationsEnabled: proConfirmationsEnabled\(\)/.test(health));
  check("health is live on every request — never a build-time snapshot", /dynamic = "force-dynamic"/.test(health) && (health.match(/cache: "no-store"/g) ?? []).length >= 2);
  check("failing email-log probe surfaces status + PostgREST code only (no message in the public response)", /emailLogStatus/.test(health) && /emailLogCode/.test(health) && !/message: body\.message/.test(health));
  check("duplicate submissions still return existing with NO email", !route.slice(route.indexOf('if (stored === "duplicate")')).includes("sendProWaitlistEmail"));

  const form = strip(readFileSync("src/components/lens/ProEarlyAccess.tsx", "utf8"));
  check("signup friction unchanged — still exactly one (email) field", (form.match(/<input/g) ?? []).length === 1 && /type="email"/.test(form));
  check("seam small print no longer promises a single email (confirmation now exists)", !/email\s+you once/.test(form) && /confirm\s+your place by email/.test(form));

  const script = strip(readFileSync("scripts/send-pro-waitlist-feedback.ts", "utf8"));
  check("one-off excludes BOTH kinds — flows can never overlap", script.includes('hasProEmail(email, "feedback")') && script.includes('hasProEmail(email, "confirmation")'));
  check("one-off honours suppression (unsubscribed Brief subscribers skipped)", /status=eq\.unsubscribed/.test(script));
  check("one-off fails safe when the send log is unreadable", /fail safe, skipped/.test(script) || /skipped_unverifiable/.test(script));
  check("uncertain (pending/ambiguous) claims are reported for reconciliation, and abort when unreadable", /status=neq\.sent/.test(script) && /UNCERTAIN CLAIMS/.test(script) && /uncertain == null/.test(script));
  check("missed confirmations are reported, never silently lost", /PRO_FEEDBACK_FLOW_LIVE_FROM/.test(script) && /MISSED CONFIRMATIONS/.test(script));
  check("real send is double-gated (MODE=send + CONFIRM_SEND=SEND)", /CONFIRM_SEND !== "SEND"/.test(script) && /MODE !== "send"/.test(script));
  check("a founder-inbox test mode exists before any real send", /MODE === "test"/.test(script) && /\[TEST\] /.test(script));
  check("test recipient is the INTERNAL inbox; test Reply-To is the PUBLIC address, required with no fallback", /FOUNDER_EMAIL \(the internal test recipient\)/.test(script) && /PRO_REPLY_TO_EMAIL \(the public reply address\) — no fallback/.test(script));
  const wf2 = readFileSync(".github/workflows/pro-waitlist-feedback.yml", "utf8");
  check("workflow supplies the public reply secret", /PRO_REPLY_TO_EMAIL: \$\{\{ secrets\.PRO_REPLY_TO_EMAIL \}\}/.test(wf2));
  check("recipient addresses are masked in job logs", /const mask = /.test(script) && !/\$\{m\.email\}/.test(script) && !/\$\{x\.email\}/.test(script));

  const wf = readFileSync(".github/workflows/pro-waitlist-feedback.yml", "utf8");
  check("workflow is dispatch-only with the confirm gate", /workflow_dispatch/.test(wf) && !/^\s*schedule:|^\s*push:/m.test(wf) && /CONFIRM_SEND: \$\{\{ inputs\.confirm \}\}/.test(wf));

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll member-growth checks passed");
})();
