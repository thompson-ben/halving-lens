// Sends the daily Bitcoin Cycle Brief to active subscribers. Run by the daily
// sync workflow after the snapshot/brief/warehouse steps, so it sends from the
// freshly-refreshed data. Never fails the job — logs a summary and exits 0.

import { sendDailyBrief } from "../src/lib/emailSend";

(async () => {
  try {
    const summary = await sendDailyBrief();
    console.log(`[send-email] ${JSON.stringify(summary)}`);
  } catch (e) {
    console.error(`[send-email] failed: ${(e as Error).message}`);
  }
  process.exit(0);
})();
