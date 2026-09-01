// Admin Hub — Analytics navigation map (navigation-hygiene micro-fix).
//
// Pins the founder-approved Analytics section so every label routes to a
// genuine existing destination and can never silently drift back into
// catch-all wiring:
//   Executive summary   → /admin/executive
//   Lifecycle Analytics → /admin/lifecycle
//   Website Analytics   → /admin/analytics   (holds the PR2 funnel section)
//   Visitor Journeys    → /admin/journeys
//   Email Analytics     → /admin/growth#email
//   Campaign Analytics  → /admin/growth#campaigns
//   Metrics admin       → /admin/metrics
// The redundant "Behaviour" duplicate is removed (no dedicated page exists);
// anchored links must always have a matching id on the target page; and the
// /admin/analytics tab title no longer collides with /admin/growth.
//
// Navigation only: no analytics calculation, funnel logic, attribution or
// instrumentation is touched by this fix — those contracts keep their own
// suites (test-brief-funnel, test-analytics-events, …).

import { existsSync, readFileSync } from "node:fs";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

// Strip comments so a pinned/banned pattern named in prose can never trip a scan.
const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const hubSrc = readFileSync("src/app/admin/page.tsx", "utf8");
const hub = strip(hubSrc);
const growth = strip(readFileSync("src/app/admin/growth/page.tsx", "utf8"));
const analytics = readFileSync("src/app/admin/analytics/page.tsx", "utf8");

console.log("Analytics section — the approved navigation map, exactly");
{
  // The Analytics section literal: from its title to the next section title.
  const m = hub.match(/title:\s*"Analytics"[\s\S]*?items:\s*\[([\s\S]*?)\]\s*,?\s*\}/);
  check("Analytics section exists on the Admin Hub", m != null);
  const block = m ? m[1] : "";
  const items = [...block.matchAll(/label:\s*"([^"]+)",\s*href:\s*"([^"]+)"/g)].map((x) => [x[1], x[2]]);

  const APPROVED: Array<[string, string]> = [
    ["Executive summary", "/admin/executive"],
    ["Lifecycle Analytics", "/admin/lifecycle"],
    ["Website Analytics", "/admin/analytics"],
    ["Visitor Journeys", "/admin/journeys"],
    ["Email Analytics", "/admin/growth#email"],
    ["Campaign Analytics", "/admin/growth#campaigns"],
    ["Metrics admin", "/admin/metrics"],
  ];
  check(`exactly ${APPROVED.length} items — the duplicate is gone, nothing added`, items.length === APPROVED.length, JSON.stringify(items));
  for (const [label, href] of APPROVED) {
    const got = items.find((i) => i[0] === label);
    check(`"${label}" → ${href}`, got != null && got[1] === href, got ? got[1] : "missing");
  }
  check('no "Behaviour" item remains (no dedicated page exists)', !/label:\s*"Behaviour"/.test(hub));
}

console.log("Anchored links — every fragment has a real target");
{
  check(
    'Email engagement panel carries id="email"',
    /<Panel title="Email engagement" id="email">/.test(growth),
  );
  check(
    'Campaign performance panel carries id="campaigns"',
    /<Panel title="Campaign performance \(cost per subscriber\)" id="campaigns">/.test(growth),
  );
  // Deterministic integrity for ANY /admin/growth#… link the hub ever grows.
  const frags = [...hub.matchAll(/href:\s*"\/admin\/growth#([\w-]+)"/g)].map((x) => x[1]);
  check("hub links at least the two approved growth anchors", frags.includes("email") && frags.includes("campaigns"), JSON.stringify(frags));
  for (const f of frags) {
    check(`growth page defines id="${f}" for the anchored link`, new RegExp(`id="${f}"`).test(growth));
  }
}

console.log("Destinations — every linked route genuinely exists");
{
  const hrefs = [...hub.matchAll(/href:\s*"(\/admin\/[\w-]+)(?:#[\w-]+)?"/g)].map((x) => x[1]);
  for (const path of [...new Set(hrefs)]) {
    check(`${path} has a page`, existsSync(`src/app${path}/page.tsx`));
  }
}

console.log("Naming & the PR2 reporting surface");
{
  check(
    '/admin/analytics tab title is "Website analytics" (collision with /admin/growth removed)',
    /title:\s*"Website analytics — halvinglens\.com"/.test(analytics),
  );
  check('/admin/growth keeps its own "Growth" title', /title:\s*"Growth — halvinglens\.com"/.test(growth));
  check(
    'Website Analytics reaches the PR2 "Brief → Dashboard (prospective)" section',
    analytics.includes("Brief → Dashboard (prospective)"),
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll admin-navigation checks passed");
