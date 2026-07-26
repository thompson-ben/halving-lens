// Heading-outline regression check (PR132).
//
// Asserts, for every public route below, against a running server:
//   1. exactly one <h1> per page
//   2. no skipped heading levels going downward (e.g. h1 -> h3), except the
//      documented exceptions list
//   3. the skip-to-content link and the #main landmark are present
// Plus one static source check: the shared SectionHeader component must not
// render an h1.
//
// Usage:  node scripts/check-headings.mjs [baseUrl]
//         (default http://localhost:3000 — run `npm start` first, or let CI
//          start the server; the script retries until the server responds)

import { readFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";

// Public templates — one representative per dynamic route. Deliberately NOT
// every archive entry: templates share markup, so one instance per template
// catches regressions without a slow, brittle full crawl.
const ROUTES = [
  "/", "/journal", "/journal/archive", "/state-of-bitcoin", "/cycles",
  "/accumulation", "/market-health", "/similar-moments",
  "/historical-price-paths", "/brief", "/brief/archive", "/research",
  "/research/findings", "/research/briefs", "/research/notes",
  "/research/myths", "/research/timeline", "/weekly", "/weekly/archive",
  "/sentiment", "/replay", "/metrics", "/learn", "/about", "/methodology",
  "/privacy", "/terms", "/price", "/four-reference-prices", "/etf", "/halving", "/miners", "/onchain",
  "/hodl-waves", "/start", "/free", "/alerts", "/derivatives",
];

// Downward heading jumps accepted with a documented reason.
// (none currently — add "route: reason" entries only with justification)
const ALLOWED_JUMPS = new Map();

async function fetchWithRetry(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.text();
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      if (i === attempts - 1) throw e;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("unreachable");
}

// First representative of each dynamic template, discovered from the sitemap
// so the list never goes stale as content accrues.
async function dynamicRepresentatives() {
  const xml = await fetchWithRetry(`${BASE}/sitemap.xml`);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const firstMatching = (re) => urls.find((u) => re.test(u));
  return [
    firstMatching(/^\/brief\/\d{4}-\d{2}-\d{2}$/),
    firstMatching(/^\/research\/\d+$/),
    firstMatching(/^\/weekly\/\d{4}-W\d{2}$/),
    firstMatching(/^\/research\/findings\/[a-z0-9-]+$/),
    firstMatching(/^\/research\/briefs\/[a-z0-9-]+$/),
    firstMatching(/^\/research\/notes\/[a-z0-9-]+$/),
    firstMatching(/^\/metrics\/[a-z0-9-]+$/),
  ].filter(Boolean);
}

function headings(html) {
  return [...html.matchAll(/<(h[1-6])[^>]*>(.*?)<\/\1>/gs)].map((m) => ({
    level: Number(m[1][1]),
    text: m[2].replace(/<[^>]+>/g, "").trim().slice(0, 60),
  }));
}

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`  FAIL  ${msg}`);
};

// Static check: the shared SectionHeader must never render h1.
const shSource = readFileSync("src/components/SectionHeader.tsx", "utf8");
if (/<h1[\s>]/.test(shSource)) {
  fail("src/components/SectionHeader.tsx renders <h1> — a shared section header must not emit the page title level");
} else {
  console.log("  ok    SectionHeader source contains no <h1>");
}

const routes = [...ROUTES, ...(await dynamicRepresentatives())];
for (const route of routes) {
  let html;
  try {
    html = await fetchWithRetry(`${BASE}${route}`, route === routes[0] ? 30 : 3);
  } catch (e) {
    fail(`${route} — fetch failed: ${e.message}`);
    continue;
  }
  const hs = headings(html);
  const h1s = hs.filter((h) => h.level === 1);
  if (h1s.length !== 1) {
    fail(`${route} — expected exactly 1 h1, found ${h1s.length}${h1s.length ? `: ${h1s.map((h) => JSON.stringify(h.text)).join(", ")}` : ""}`);
  }
  let prev = null;
  for (const h of hs) {
    if (prev !== null && h.level > prev + 1) {
      const key = `${route}`;
      if (!ALLOWED_JUMPS.has(key)) {
        fail(`${route} — heading level jump h${prev} -> h${h.level} at "${h.text}"`);
      }
    }
    prev = h.level;
  }
  if (!html.includes('href="#main"')) fail(`${route} — skip-to-content link missing`);
  if (!html.includes('id="main"')) fail(`${route} — id="main" landmark missing`);
}

console.log(`\nChecked ${routes.length} routes.`);
if (failures) {
  console.error(`${failures} heading-outline failure(s).`);
  process.exit(1);
}
console.log("Heading outline OK: one h1 per page, no level jumps, skip link present.");
