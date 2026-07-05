// Sends due onboarding (lifecycle) emails to subscribers. Run by the daily sync
// workflow after the brief. Idempotent per subscriber+step, drips one email per
// subscriber per run, never touches the Daily Brief. Never fails the job.

import { sendLifecycleEmails } from "../src/lib/lifecycleSend";

(async () => {
  try {
    const summary = await sendLifecycleEmails();
    console.log(`[send-lifecycle] ${JSON.stringify(summary)}`);
  } catch (e) {
    console.error(`[send-lifecycle] failed: ${(e as Error).message}`);
  }
  process.exit(0);
})();
