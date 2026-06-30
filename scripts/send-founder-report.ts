// Sends the Founder Weekly Intelligence Report (founder only) on Mondays. Run by
// the daily sync; Monday-gated + idempotent per ISO week, so running it daily is
// safe — it sends once a week. Never fails the job.

import { sendFounderReport } from "../src/lib/emailSend";

(async () => {
  try {
    const summary = await sendFounderReport();
    console.log(`[send-founder-report] ${JSON.stringify(summary)}`);
  } catch (e) {
    console.error(`[send-founder-report] failed: ${(e as Error).message}`);
  }
  process.exit(0);
})();
