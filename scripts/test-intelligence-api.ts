// Deterministic tests for the versioned, secure Founder Intelligence API (PR3).
// Covers the pure auth decision + the pure section shaper (incl. the aggregate-
// only / no-PII invariant). Run: npm run test-intelligence-api

import { authorizeIntelligence, shapeSection, isSection, INTELLIGENCE_SECTIONS, composeFeed, API_VERSION } from "../src/lib/founderIntelligence";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "PASS" : "FAIL"}: ${m}`); };

const NOW = Date.parse("2026-07-20T12:00:00Z");

// ── Authorization (pure, fail-closed) ────────────────────────────────────────
const admin = authorizeIntelligence({ authorization: null, apiKey: undefined, isAdminSession: true });
assert(admin.ok && admin.principal === "admin", "admin cookie authorizes without a bearer token");
assert(authorizeIntelligence({ authorization: null, apiKey: "k", isAdminSession: false }).reason === "missing_credentials", "no credentials → missing_credentials");
assert(authorizeIntelligence({ authorization: "Token abc", apiKey: "abc", isAdminSession: false }).reason === "malformed_authorization", "non-Bearer scheme is rejected");
assert(authorizeIntelligence({ authorization: "Bearer abc", apiKey: "", isAdminSession: false }).reason === "api_key_not_configured", "fail-closed: bearer path unavailable when key unset");
assert(authorizeIntelligence({ authorization: "Bearer wrong", apiKey: "right", isAdminSession: false }).reason === "invalid_token", "wrong token rejected");
const good = authorizeIntelligence({ authorization: "Bearer right", apiKey: "right", isAdminSession: false });
assert(good.ok && good.principal === "bearer", "correct bearer token authorizes");
assert(authorizeIntelligence({ authorization: "bearer right", apiKey: "right", isAdminSession: false }).ok, "Bearer scheme is case-insensitive");
assert(!authorizeIntelligence({ authorization: "Bearer rig", apiKey: "right", isAdminSession: false }).ok, "length-mismatched token rejected (constant-time compare)");

// ── Section routing ──────────────────────────────────────────────────────────
assert(isSection("review") && isSection("feed") && isSection("growth") && isSection("journeys") && isSection("daily-brief"), "all documented sections are recognised");
assert(!isSection("secrets") && !isSection("../etc/passwd") && !isSection(""), "unknown sections are rejected");

// ── Section shaper over a real (Supabase-off) feed ───────────────────────────
(async () => {
  const feed = await composeFeed(NOW);

  const review = shapeSection(feed, "review");
  assert(review.apiVersion === API_VERSION && review.section === "review", "review envelope is versioned + section-labelled");
  assert(review.schemaVersion === "1.0", "envelope carries the feed schema version");
  assert("review" in review && "northStar" in review && "topRecommendation" in review, "review envelope carries the Founder Review + North Star + one prioritised action");

  const growth = shapeSection(feed, "growth");
  assert((growth.module as { moduleId?: string })?.moduleId === "growth", "growth section returns the growth module");
  const brief = shapeSection(feed, "daily-brief");
  assert((brief.module as { moduleId?: string })?.moduleId === "daily_briefs", "daily-brief slug maps to the daily_briefs module");

  const full = shapeSection(feed, "feed");
  assert("modules" in full && "recommendations" in full && "review" in full, "feed section returns the whole feed");

  // Aggregate-only invariant: NO subscriber identifiers in ANY envelope.
  const forbiddenKeys = ['"sub":', '"email":', '"emailHash":', '"hash":', '"session_id":', '"ip":'];
  for (const s of INTELLIGENCE_SECTIONS) {
    const json = JSON.stringify(shapeSection(feed, s));
    for (const k of forbiddenKeys) assert(!json.includes(k), `${s} envelope exposes no PII key (${k})`);
  }

  // Determinism.
  assert(JSON.stringify(shapeSection(feed, "review")) === JSON.stringify(shapeSection(feed, "review")), "shaper is deterministic");

  console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll intelligence-API tests passed.");
  process.exit(failures ? 1 : 0);
})();
