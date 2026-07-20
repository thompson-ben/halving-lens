// Sends the daily Founder Intelligence Briefing IF the Intelligence Events Engine
// detects publishable events. Safe to run daily — sends nothing on quiet days.
// Also persists newly-detected events into the historical intelligence database.

import { sendIntelligenceBriefing } from "../src/lib/intelligenceEmail";

(async () => {
  try {
    const summary = await sendIntelligenceBriefing();
    console.log(`[send-intelligence] ${JSON.stringify(summary)}`);
  } catch (e) {
    console.error(`[send-intelligence] failed: ${(e as Error).message}`);
  }
  process.exit(0);
})();
