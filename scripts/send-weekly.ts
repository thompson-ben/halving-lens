// Sends the HalvingLens Weekly Research email on Sundays. Run by the daily sync
// after the weekly is persisted. Idempotent per ISO week and gated to Sunday, so
// running it every day is safe — it sends once a week. Never fails the job.

import { sendWeekly } from "../src/lib/emailSend";

(async () => {
  try {
    const summary = await sendWeekly();
    console.log(`[send-weekly] ${JSON.stringify(summary)}`);
  } catch (e) {
    console.error(`[send-weekly] failed: ${(e as Error).message}`);
  }
  process.exit(0);
})();
