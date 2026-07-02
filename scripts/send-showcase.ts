// Sends the Day-2 onboarding "showcase" email to subscribers who joined a day or
// two ago and haven't received it yet. Run by the daily sync workflow. Idempotent
// per subscriber (showcase_sent_at) and safe to run daily. Never fails the job.

import { sendOnboardingShowcase } from "../src/lib/emailSend";

(async () => {
  try {
    const summary = await sendOnboardingShowcase();
    console.log(`[send-showcase] ${JSON.stringify(summary)}`);
  } catch (e) {
    console.error(`[send-showcase] failed: ${(e as Error).message}`);
  }
  process.exit(0);
})();
