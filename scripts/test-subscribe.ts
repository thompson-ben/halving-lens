// Deterministic tests for PR1 — subscription reliability + analytics integrity.
// Three layers: the pure UI decision, the pure server outcome resolver, and the
// real /api/subscribe route handler driven with a mocked fetch + env (so we test
// the actual contract, not a reimplementation). Run: npm run test-subscribe

import { decideFromResponse } from "../src/lib/subscription";
import { resolveOutcome, isValidEmail, normalizeEmail } from "../src/lib/subscribeCore";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "PASS" : "FAIL"}: ${m}`); };

// ── Pure UI decision: success + conversion ONLY on confirmed durable capture ──
const created = decideFromResponse(200, { ok: true, outcome: "created" });
assert(created.state === "success" && created.fireConversion === true && created.analyticsEvent === "subscription_success", "created → success + fires conversion");

const existing = decideFromResponse(200, { ok: true, outcome: "existing" });
assert(existing.state === "existing" && existing.fireConversion === false && existing.analyticsEvent === "subscription_existing", "existing → existing state, NO conversion event");

const invalid = decideFromResponse(400, { ok: false, outcome: "invalid" });
assert(invalid.state === "invalid" && invalid.fireConversion === false && invalid.retryable === false, "400 → invalid, no conversion, not retryable");

const limited = decideFromResponse(429, { ok: false, outcome: "rate_limited" });
assert(limited.state === "rate_limited" && limited.fireConversion === false && limited.retryable === true, "429 → rate_limited, no conversion, retryable");

const server = decideFromResponse(503, { ok: false, outcome: "error" });
assert(server.state === "error" && server.fireConversion === false && server.failureCategory === "server" && server.retryable === true, "503 → error, no conversion, retryable");

const network = decideFromResponse(null, null);
assert(network.state === "error" && network.fireConversion === false && network.failureCategory === "network" && network.retryable === true, "network failure (status null) → error, NO conversion");

// The critical guard: a 2xx with a missing/unknown outcome must NOT read as success.
const ambiguous = decideFromResponse(200, { ok: true });
assert(ambiguous.state === "error" && ambiguous.fireConversion === false, "ambiguous 2xx (no outcome) → error, never assumed success");
const ambiguous2 = decideFromResponse(200, null);
assert(ambiguous2.state === "error" && ambiguous2.fireConversion === false, "2xx with unparseable body → error, never assumed success");

// ── Pure server resolver ──────────────────────────────────────────────────────
assert(resolveOutcome("created", false, false).outcome === "created" && resolveOutcome("created", false, false).sendWelcome === true, "supabase created → created + welcome");
assert(resolveOutcome("duplicate", false, false).outcome === "existing" && resolveOutcome("duplicate", false, false).sendWelcome === false, "supabase duplicate → existing, no welcome");
assert(resolveOutcome("unavailable", true, true).outcome === "created" && resolveOutcome("unavailable", true, true).sendWelcome === false, "supabase down + webhook captured → created (durable fallback), no welcome");
assert(resolveOutcome("unavailable", true, false).outcome === "error" && resolveOutcome("unavailable", true, false).status === 503, "supabase down + webhook FAILED → error 503 (not a false success)");
assert(resolveOutcome("unavailable", false, false).outcome === "error" && resolveOutcome("unavailable", false, false).status === 503, "supabase down + no fallback → error 503 (logging alone is not success)");

assert(isValidEmail("a@b.co") && !isValidEmail("nope") && !isValidEmail(""), "email validation");
assert(normalizeEmail("  A@B.CO ") === "a@b.co", "email normalised (trim + lowercase)");

// ── Real route handler, mocked fetch + env ────────────────────────────────────
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
delete process.env.SIGNUP_WEBHOOK_URL;
delete process.env.RESEND_API_KEY; // welcome email becomes a no-op

const mode = { supa: 201, blocked: false };
const realFetch = global.fetch;
// Route by URL: rate_limits reads (allow/block), brief_subscribers writes (status).
global.fetch = (async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes("rate_limits")) {
    const rows = mode.blocked ? [{ count: 999, window_start: new Date().toISOString() }] : [];
    return new Response(JSON.stringify(rows), { status: 200 });
  }
  if (url.includes("brief_subscribers")) return new Response("", { status: mode.supa });
  return new Response("", { status: 200 });
}) as typeof fetch;

function makeReq(body: unknown, badJson = false): Request {
  return new Request("http://localhost/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
    body: badJson ? "{not json" : JSON.stringify(body),
  });
}

(async () => {
  const { POST } = await import("../src/app/api/subscribe/route");
  const call = async (body: unknown, badJson = false) => {
    const res = await POST(makeReq(body, badJson));
    const j = (await res.json()) as { ok: boolean; outcome?: string };
    return { status: res.status, ...j };
  };

  mode.blocked = false;
  mode.supa = 201;
  let r = await call({ email: "new@reader.com", source: "/free", consent: true });
  assert(r.status === 200 && r.outcome === "created", `new signup → 200 created (got ${r.status}/${r.outcome})`);

  mode.supa = 409;
  r = await call({ email: "already@reader.com", source: "/free", consent: true });
  assert(r.status === 200 && r.outcome === "existing", `duplicate → 200 existing (got ${r.status}/${r.outcome})`);

  mode.supa = 500; // supabase failure, no webhook configured
  r = await call({ email: "fail@reader.com", source: "/free", consent: true });
  assert(r.status === 503 && r.outcome === "error", `persistence failure → 503 error, NOT success (got ${r.status}/${r.outcome})`);

  mode.supa = 201;
  r = await call({ email: "not-an-email", source: "/free", consent: true });
  assert(r.status === 400 && r.outcome === "invalid", `invalid email → 400 invalid (got ${r.status}/${r.outcome})`);

  r = await call({}, true);
  assert(r.status === 400 && r.outcome === "invalid", `malformed JSON → 400 invalid (got ${r.status}/${r.outcome})`);

  mode.blocked = true;
  r = await call({ email: "spammer@reader.com", source: "/free", consent: true });
  assert(r.status === 429 && r.outcome === "rate_limited", `over rate limit → 429 rate_limited (got ${r.status}/${r.outcome})`);

  global.fetch = realFetch;
  console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll subscribe tests passed.");
  process.exit(failures ? 1 : 0);
})();
