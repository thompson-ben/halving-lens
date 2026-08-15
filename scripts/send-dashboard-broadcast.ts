#!/usr/bin/env tsx
/**
 * One-off Cycle Dashboard broadcast to the ESTABLISHED subscriber base.
 *
 * SEND SAFETY (founder rule): this is a DRY RUN unless --confirm is passed.
 * A dry run enumerates the audience and reports the count, exclusions and the
 * subject — and sends nothing. Nothing in the daily sync calls this script;
 * it is run deliberately, once, by hand, after founder send approval.
 *
 *   npm run broadcast-dashboard            # dry run — audience + counts only
 *   npm run broadcast-dashboard -- --confirm   # actually sends (founder approval)
 *   npm run broadcast-dashboard -- --test-to me@example.com   # one test copy
 *
 * Idempotency + exclusions:
 *   · recipients are recorded in lifecycle_sends ({ email, step }) under
 *     BROADCAST_STEP_ID, so a
 *     second run re-enumerates to zero and can never double-send;
 *   · anyone who already received the day-3 onboarding email (ONBOARDING_STEP_ID)
 *     is excluded — nobody gets both;
 *   · only active subscribers (status active or legacy null) are eligible;
 *   · a failed send is NOT recorded, so it retries on a later run.
 */
import { sbSelect, sbInsert, supabaseConfigured } from "../src/lib/supabase";
import { sendEmail, resendConfigured } from "../src/lib/resend";
import {
  dashboardBroadcastHtml,
  dashboardBroadcastText,
  BROADCAST_SUBJECT,
  BROADCAST_STEP_ID,
  ONBOARDING_STEP_ID,
} from "../src/lib/dashboardBroadcast";
import { unsubToken } from "../src/lib/emailToken";
import { emailTracking } from "../src/lib/emailTracking";
import { absoluteUrl } from "../src/lib/site";

interface Subscriber {
  id: number;
  email: string;
}

async function main() {
  const argv = process.argv.slice(2);
  const confirm = argv.includes("--confirm");
  const testIdx = argv.indexOf("--test-to");
  const testTo = testIdx >= 0 ? argv[testIdx + 1] : null;

  if (!resendConfigured) {
    console.log("[broadcast] resend not configured — nothing to do.");
    return;
  }

  if (testTo) {
    const unsubUrl = absoluteUrl(`/api/unsubscribe?e=${encodeURIComponent(testTo)}&t=${unsubToken(testTo)}`);
    const res = await sendEmail({
      to: testTo,
      subject: `[TEST] ${BROADCAST_SUBJECT}`,
      html: dashboardBroadcastHtml(unsubUrl, emailTracking(testTo, "cdoe-broadcast-test")),
      text: dashboardBroadcastText(),
      headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    console.log(`[broadcast] test copy → ${testTo}: ${res.ok ? "sent" : `FAILED (${res.error ?? "unknown"})`}`);
    return;
  }

  if (!supabaseConfigured) {
    console.log("[broadcast] supabase not configured — cannot enumerate the audience.");
    return;
  }

  // Active subscribers.
  const subs =
    (await sbSelect<Subscriber[]>("brief_subscribers?select=id,email&or=(status.is.null,status.eq.active)&limit=20000")) ?? [];
  // Everyone who already had this broadcast, or the day-3 onboarding email.
  // lifecycle_sends is keyed by { email, step } — the same shape the drip writes.
  const sent =
    (await sbSelect<{ email: string; step: string }[]>(
      `lifecycle_sends?select=email,step&step=in.(${BROADCAST_STEP_ID},${ONBOARDING_STEP_ID})&limit=200000`,
    )) ?? [];
  const excluded = new Set(sent.map((r) => r.email.trim().toLowerCase()));
  const audience = subs.filter((s) => !excluded.has(s.email.trim().toLowerCase()));

  const alreadyBroadcast = sent.filter((r) => r.step === BROADCAST_STEP_ID).length;
  const gotOnboarding = sent.filter((r) => r.step === ONBOARDING_STEP_ID).length;

  console.log("[broadcast] Cycle Dashboard one-off");
  console.log(`  subject           : ${BROADCAST_SUBJECT}`);
  console.log(`  active subscribers: ${subs.length}`);
  console.log(`  excluded (already broadcast): ${alreadyBroadcast}`);
  console.log(`  excluded (received day-3 onboarding): ${gotOnboarding}`);
  console.log(`  AUDIENCE          : ${audience.length}`);

  if (!confirm) {
    console.log("  MODE              : DRY RUN — nothing sent. Re-run with --confirm after founder approval.");
    return;
  }

  let delivered = 0;
  let failed = 0;
  for (const sub of audience) {
    const unsubUrl = absoluteUrl(`/api/unsubscribe?e=${encodeURIComponent(sub.email)}&t=${unsubToken(sub.email)}`);
    const res = await sendEmail({
      to: sub.email,
      subject: BROADCAST_SUBJECT,
      html: dashboardBroadcastHtml(unsubUrl, emailTracking(sub.email, "cdoe-broadcast")),
      text: dashboardBroadcastText(),
      headers: { "List-Unsubscribe": `<${unsubUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    });
    if (res.ok) {
      delivered += 1;
      // Recorded ONLY on success, so a transient failure retries on a later run.
      await sbInsert("lifecycle_sends", { email: sub.email, step: BROADCAST_STEP_ID });
    } else {
      failed += 1;
    }
  }
  console.log(`  SENT              : ${delivered} delivered, ${failed} failed`);
}

main().catch((e) => {
  console.error(`[broadcast] failed: ${(e as Error).message}`);
  process.exit(1);
});
