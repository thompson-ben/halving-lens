// ETF archive integrity (V2.1 Phase 0).
//
// The SoSoValue endpoint returns a ROLLING ~300-trading-day window. Before
// this phase the sync swapped the stored ETF block wholesale, so observed
// trading days silently fell off the front on every full sync — the only
// monitored series without erosion protection. These tests pin the fix:
// mergeEtfArchives must grow the archive monotonically (union by date, fresh
// wins, never shrink), `cumulative` is a running net total since the FIRST
// STORED observation (never a since-launch figure), and the shared
// etfWindowNet primitive must make consecutive-window comparisons exact.
//
// Style matches scripts/test-observed-archive.ts: plain asserts, fixture
// first, then live-data guards over the committed snapshot.

import { mergeEtfArchives } from "../src/lib/data/observedArchive";
import { etfWindowNet } from "../src/lib/etf";
import { windowOf } from "../src/lib/etfFlows";
import { etfFlowsRead } from "../src/lib/etfFlows";
import { observedWindows } from "../src/lib/data/observedWindows";
import { SNAPSHOT } from "../src/lib/data/snapshot";
import type { EtfData } from "../src/lib/data/types";
import { readFileSync } from "node:fs";

let failures = 0;
function assert(cond: boolean, label: string): void {
  if (cond) console.log(`  ok    ${label}`);
  else {
    console.error(`  FAIL  ${label}`);
    failures++;
  }
}
const approx = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

function etf(points: Array<[string, number]>, fetchedAt = "2026-01-02T00:00:00Z"): EtfData {
  let cum = 0;
  return {
    source: "fixture",
    fetchedAt,
    points: points.map(([date, netFlow]) => ({ date, netFlow, cumulative: (cum += netFlow) })),
  };
}

console.log("mergeEtfArchives — fixtures:");
{
  const prev = etf([
    ["2026-01-05", 100],
    ["2026-01-06", -50],
    ["2026-01-07", 25],
  ]);
  // The provider window rolled forward: the oldest stored day is gone from the
  // fresh response, one shared day was revised, one new day appeared.
  const fresh = etf(
    [
      ["2026-01-06", -60],
      ["2026-01-07", 25],
      ["2026-01-08", 40],
    ],
    "2026-01-08T07:00:00Z",
  );
  const merged = mergeEtfArchives(prev, fresh)!;
  assert(merged.points.length === 4, "union keeps every observed date — the rolled-off day survives");
  assert(merged.points[0].date === "2026-01-05" && merged.points[0].netFlow === 100, "the day the provider dropped is retained with its stored value");
  assert(merged.points.find((p) => p.date === "2026-01-06")!.netFlow === -60, "fresh wins on a date conflict (sources revise recent values)");
  assert(merged.points[merged.points.length - 1].date === "2026-01-08", "new trading days append");
  assert(merged.fetchedAt === "2026-01-08T07:00:00Z" && merged.source === "fixture", "provenance comes from the fresh fetch");
  const dates = merged.points.map((p) => p.date);
  assert([...dates].sort().join() === dates.join() && new Set(dates).size === dates.length, "result is ascending with no duplicate dates");
  let cum = 0;
  assert(
    merged.points.every((p) => approx((cum += p.netFlow), p.cumulative)),
    "cumulative is recomputed as the running net total over the MERGED series",
  );
  assert(approx(merged.points[merged.points.length - 1].cumulative, 100 - 60 + 25 + 40), "final cumulative reflects the union, not either input window");
}
{
  const prev = etf([["2026-01-05", 100]]);
  const same = mergeEtfArchives(prev, null);
  assert(same === prev, "fresh null → the previous archive carries over untouched (rate-limited sync)");
  const fresh = etf([["2026-01-06", 7]]);
  assert(mergeEtfArchives(null, fresh) === fresh, "no previous archive → the fresh fetch stands as-is");
  assert(mergeEtfArchives(null, null) === null, "nothing in, nothing out");
}
{
  // Never-shrink: whatever the provider returns, the merged range and count
  // can only match or exceed the previous archive's.
  const prev = etf([
    ["2026-01-01", 1],
    ["2026-01-02", 2],
    ["2026-01-05", 3],
  ]);
  const fresh = etf([["2026-01-05", 3]]);
  const merged = mergeEtfArchives(prev, fresh)!;
  assert(merged.points.length >= prev.points.length, "a merge never shrinks the point count");
  assert(merged.points[0].date <= prev.points[0].date, "the earliest observed date is a permanent floor");
}

console.log("etfWindowNet / windowOf — the one shared window sum:");
{
  const pts = etf([
    ["2026-01-01", 10],
    ["2026-01-02", 20],
    ["2026-01-05", 30],
    ["2026-01-06", 40],
  ]).points;
  assert(etfWindowNet(pts, 2).net === 70 && etfWindowNet(pts, 2).days === 2, "offset 0 is the latest window");
  assert(etfWindowNet(pts, 2, 2).net === 30 && etfWindowNet(pts, 2, 2).days === 2, "offset n is the previous, non-overlapping window");
  assert(etfWindowNet(pts, 3, 3).net === 10 && etfWindowNet(pts, 3, 3).days === 1, "a short head window reports its true day count, never pads");
  assert(etfWindowNet(pts, 2, 10).days === 0 && etfWindowNet(pts, 2, 10).net === 0, "an offset past the series start is empty, not an error");
  const w = windowOf(pts, 2, 2);
  assert(w.net === 30 && approx(w.avgPerDay, 15), "windowOf wraps the same sum and derives avgPerDay from it");
}

console.log("Live committed archive — structural guards:");
{
  const e = SNAPSHOT.etf;
  assert(!!e && e.points.length > 0, "the committed snapshot carries an ETF block");
  if (e) {
    const dates = e.points.map((p) => p.date);
    assert([...dates].sort().join() === dates.join(), "committed points ascend by date");
    assert(new Set(dates).size === dates.length, "no duplicate committed dates");
    assert(
      dates.every((d) => {
        const dow = new Date(`${d}T00:00:00Z`).getUTCDay();
        return dow >= 1 && dow <= 5;
      }),
      "trading-day series: no weekend dates committed",
    );
    let cum = 0;
    assert(
      e.points.every((p) => approx((cum += p.netFlow), p.cumulative, 1e-9)),
      "committed cumulative is exactly the running net total of the committed netFlows",
    );
    const live = etfFlowsRead();
    assert(approx(live.windows.d7.net, etfWindowNet(e.points, 7).net), "the page's 7-trading-day net IS the shared window sum");
    const prev7 = etfWindowNet(e.points, 7, 7);
    assert(prev7.days === 7, "a previous-7-window comparison is available from the committed archive");
  }
}

console.log("Registered cadence and sync discipline (source scans):");
{
  const w = observedWindows().find((x) => x.id === "etfFlows");
  assert(!!w && w.cadence === "trading-day", "the observed-windows registry declares ETF as trading-day, not daily");
  const sync = readFileSync("scripts/sync.ts", "utf8");
  assert(/etf:\s*mergeEtfArchives\(/.test(sync), "the sync assembles the ETF block through mergeEtfArchives — no wholesale swap");
  assert(!/etf:\s*etf\s*\?\?\s*PREVIOUS_SNAPSHOT\.etf/.test(sync), "the old carry-over swap is gone");
  const types = readFileSync("src/lib/data/types.ts", "utf8");
  assert(/FIRST[\s/]+STORED[\s/]+observation/.test(types), "the cumulative field documents its since-first-stored semantics");
  assert(!/running total since launch/.test(types), "the false since-launch claim is retired");
}

console.log("");
if (failures) {
  console.error(`${failures} failure(s).`);
  process.exit(1);
}
console.log("All ETF-archive tests passed.");
