#!/usr/bin/env tsx
/**
 * Historical Intelligence Warehouse writer.
 *
 * Runs after `npm run sync` (so the snapshot is current) and permanently appends
 * today's intelligence to the Supabase warehouse: the daily cycle row, every raw
 * metric, the derived narratives + brief, the cross-channel content pack, the
 * engine score components, the ETF history slice and any state transitions.
 *
 *   npm run sync && npm run warehouse
 *
 * Append-only across days; idempotent within a day (same-day re-runs UPSERT the
 * day's row via on-conflict). Non-fatal: if Supabase isn't configured, or a write
 * fails, it logs and exits 0 so it never breaks the daily build.
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment.
 */
import { buildWarehouseRecord } from "../src/lib/warehouse";
import { sbUpsert, sbInsert, supabaseConfigured } from "../src/lib/supabase";

async function main() {
  if (!supabaseConfigured) {
    console.log(
      "! warehouse: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — skipping (run supabase/warehouse.sql and set the env vars to enable).",
    );
    return;
  }

  const rec = buildWarehouseRecord();
  console.log(`→ Warehousing intelligence for ${rec.date}…`);

  const results: Array<[string, boolean]> = [];

  // One-row-per-day tables: upsert on their unique key so a same-day re-run
  // refreshes that day rather than duplicating it.
  results.push(["daily_cycle", await sbUpsert("daily_cycle", rec.dailyCycle, "date")]);
  results.push([
    "daily_intelligence",
    await sbUpsert("daily_intelligence", rec.dailyIntelligence, "date"),
  ]);

  // Multi-row tables keyed on (date, …): batch upsert.
  if (rec.dailyMetrics.length)
    results.push(["daily_metrics", await sbUpsert("daily_metrics", rec.dailyMetrics, "date,metric")]);
  if (rec.scoreComponents.length)
    results.push([
      "cycle_score_components",
      await sbUpsert("cycle_score_components", rec.scoreComponents, "date,factor"),
    ]);
  if (rec.etfHistory.length)
    results.push(["etf_history", await sbUpsert("etf_history", rec.etfHistory, "date,issuer")]);
  results.push([
    "downside_scenarios",
    await sbUpsert("downside_scenarios", rec.downsideScenarios, "date"),
  ]);

  // State changes are a pure event log — insert only, never overwrite.
  for (const change of rec.stateChanges) {
    const ok = await sbInsert("state_changes", change);
    results.push([`state_change:${(change as { dimension?: string }).dimension}`, ok]);
  }

  for (const [table, ok] of results) {
    console.log(`  ${ok ? "✓" : "✗"} ${table}`);
  }
  const failed = results.filter(([, ok]) => !ok);
  console.log(
    `✓ Warehouse run complete: ${results.length - failed.length}/${results.length} writes ok` +
      (rec.stateChanges.length ? ` · ${rec.stateChanges.length} state change(s)` : ""),
  );
  if (failed.length) {
    console.warn(`  (${failed.map(([t]) => t).join(", ")} did not confirm — check RLS / schema.)`);
  }
}

main().catch((e) => {
  console.warn(`! warehouse failed (non-fatal): ${(e as Error).message}`);
});
