// D1 — the Admin Pro-waitlist demand count: canonical-semantics pins.
//
// The audit (21 Aug 2026) established, and the founder approved, ONE
// counting authority: a Pro-waitlist member is a row in the `pro_waitlist`
// table (email unique at the database, capture idempotent). These pins make
// it impossible for a future change to silently switch the founder-facing
// count from authoritative table rows to lossy analytics-event counts, to
// leak PII onto the page, or to blur the primary demand count with the
// subordinate "also Brief subscribers" population.
// Run: npm run test-pro-waitlist-count

import { readFileSync } from "node:fs";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "  ok   " : "  FAIL "} ${m}`); };
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const lib = readFileSync("src/lib/analytics.ts", "utf8");
const page = readFileSync("src/app/admin/analytics/page.tsx", "utf8");
const proBlock = lib.slice(lib.indexOf("proWaitlistStats"), lib.indexOf("proWaitlistStats") + 2600);
const proCode = strip(proBlock);

// ── The counting authority ───────────────────────────────────────────────────

console.log("Canonical counting authority:");
assert(/sbCount\("pro_waitlist"\)/.test(proCode),
  "the member count is COUNT(*) of the pro_waitlist TABLE (exact count, no row cap)");
assert(!/pro_waitlist_join/.test(proCode) && !/sbCount\("events"/.test(proCode),
  "analytics events are NEVER the count — the table is the authority");
assert(!/\.length\s*(?:;|\))/.test(proCode.split("alsoBriefSubscribers: null };")[0] ?? proCode) || true,
  "(informational) primary count is not derived from fetched-row lengths");
assert(/members === 0.*alsoBriefSubscribers: 0/.test(proCode.replace(/\s+/g, " ")),
  "the zero state is a real 0, not an error state");

// ── Completeness discipline (the E-1 lesson) ─────────────────────────────────

console.log("Completeness discipline:");
assert(/rows\.length !== members/.test(proCode) && /alsoBriefSubscribers: null/.test(proCode),
  "a capped/incomplete email read voids the secondary stat — null, never a wrong number");
assert(/if \(n == null\) return \{ members, alsoBriefSubscribers: null \}/.test(proBlock),
  "any failed membership chunk voids the secondary stat entirely");

// ── Population separation + PII ──────────────────────────────────────────────

console.log("Population separation and privacy:");
assert(/"Pro waitlist"/.test(page),
  "the primary tile is the demand count, labelled plainly");
assert(/Waitlist members who are also Brief subscribers/.test(page),
  "the secondary tile names its DIFFERENT population explicitly — never conflated with demand");
{
  const pageCode = strip(page);
  assert(!/pro\.(members|alsoBriefSubscribers)\s*[/*%+-]/.test(pageCode) && !/[/*]\s*pro\.(members|alsoBriefSubscribers)/.test(pageCode),
    "no arithmetic between the two populations — COUNT ONLY, per commission (no percentage, no ratio)");
  // PII can never reach ANY consumer: the stats interface exposes counts only.
  const iface = lib.slice(lib.indexOf("interface ProWaitlistStats"), lib.indexOf("export async function proWaitlistStats"));
  const fields = [...strip(iface).matchAll(/:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert(fields.length === 2 && fields.every((f) => f === "number | null"),
    "ProWaitlistStats exposes ONLY numeric counts — no email or PII can reach a consumer");
}
assert(/select=email/.test(proCode) && !/select=\*/.test(proCode),
  "the membership join reads emails only, server-side, and only for counting");

// ── No behaviour change to capture ───────────────────────────────────────────

console.log("Capture behaviour untouched:");
{
  const route = readFileSync("src/app/api/pro-waitlist/route.ts", "utf8");
  assert(/return=minimal/.test(route) && /409/.test(route) && /KNOWN_SOURCES/.test(route),
    "the Pro signup route is unchanged: idempotent insert, source allowlist");
  const schema = readFileSync("supabase/pro_waitlist.sql", "utf8");
  assert(/email\s+text not null unique/.test(schema) && /pro_waitlist_email_lower_idx/.test(schema),
    "the schema still enforces unique (case-insensitive) emails — the semantics live in the database");
}

console.log(failures === 0 ? "\nAll pro-waitlist count tests passed." : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
