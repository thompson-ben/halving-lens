// Sends the daily Bitcoin Cycle Brief to active subscribers. Run by the daily
// sync workflow after the snapshot/brief/warehouse steps, so it sends from the
// freshly-refreshed data. Never fails the job — logs a summary and exits 0.

import { sendDailyBrief } from "../src/lib/emailSend";

// BRIEF_TEST_TO → send today's brief (rendered identically) to that one address
// only, with no subscriber list and no once-per-day guard. Used by the workflow
// to preview the brief to the founder a few minutes before the subscriber send.
const testTo = process.env.BRIEF_TEST_TO?.trim();

(async () => {
  try {
    const summary = await sendDailyBrief(testTo ? { testTo } : {});
    console.log(`[send-email${testTo ? " preview" : ""}] ${JSON.stringify(summary)}`);
  } catch (e) {
    console.error(`[send-email] failed: ${(e as Error).message}`);
  }
  process.exit(0);
})();
