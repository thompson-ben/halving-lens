// Sends the Weekly Round-up email (Sundays). Idempotent per ISO week and
// Sunday-gated — safe to run daily. Never fails the job.

import { sendWeeklyRoundup } from "../src/lib/weeklyRoundupSend";

(async () => {
  try {
    const summary = await sendWeeklyRoundup();
    console.log(`[send-roundup] ${JSON.stringify(summary)}`);
  } catch (e) {
    console.error(`[send-roundup] failed: ${(e as Error).message}`);
  }
  process.exit(0);
})();
