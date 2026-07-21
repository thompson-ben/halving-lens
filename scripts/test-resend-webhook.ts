// Deterministic tests for the Resend webhook (PR4): Svix signature verification
// + event parsing. Both are pure — no network, no DB. Run: npm run test-resend-webhook

import { createHmac } from "crypto";
import { verifySvixSignature, parseResendEvent } from "../src/lib/resendWebhook";

let failures = 0;
const assert = (c: boolean, m: string) => { if (!c) failures++; console.log(`${c ? "PASS" : "FAIL"}: ${m}`); };

// Build a valid Svix signature the same way Resend does, so we can verify our
// verifier end-to-end without a live webhook.
const SECRET_B64 = Buffer.from("super-secret-signing-key-1234567890").toString("base64");
const SECRET = `whsec_${SECRET_B64}`;
const NOW = Date.parse("2026-07-20T12:00:00Z");
const nowSec = Math.floor(NOW / 1000);

function sign(id: string, ts: number, body: string): string {
  const key = Buffer.from(SECRET_B64, "base64");
  const sig = createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  return `v1,${sig}`;
}

const id = "msg_2abc";
const body = JSON.stringify({ type: "email.delivered", created_at: "2026-07-20T11:59:00Z", data: { email_id: "re_123", to: ["Reader@Example.com"] } });
const goodSig = sign(id, nowSec, body);

// ── Signature verification ───────────────────────────────────────────────────
assert(verifySvixSignature({ id, timestamp: String(nowSec), signature: goodSig, body, secret: SECRET, now: NOW }).ok, "valid Svix signature verifies");
assert(!verifySvixSignature({ id, timestamp: String(nowSec), signature: goodSig, body: body + "x", secret: SECRET, now: NOW }).ok, "tampered body fails");
assert(!verifySvixSignature({ id: id + "x", timestamp: String(nowSec), signature: goodSig, body, secret: SECRET, now: NOW }).ok, "tampered id fails");
assert(verifySvixSignature({ id, timestamp: String(nowSec), signature: goodSig, body, secret: SECRET, now: NOW, toleranceSec: 300 }).reason === null, "valid signature has no failure reason");
assert(verifySvixSignature({ id, timestamp: String(nowSec - 3600), signature: sign(id, nowSec - 3600, body), body, secret: SECRET, now: NOW }).reason === "timestamp_out_of_tolerance", "old timestamp rejected (replay protection)");
assert(verifySvixSignature({ id, timestamp: String(nowSec), signature: goodSig, body, secret: "", now: NOW }).reason === "missing_fields", "missing secret rejected");
assert(!verifySvixSignature({ id, timestamp: String(nowSec), signature: sign(id, nowSec, body), body, secret: `whsec_${Buffer.from("different-key").toString("base64")}`, now: NOW }).ok, "wrong secret fails");
// Multiple signatures in the header — any valid one passes (Svix key rotation).
assert(verifySvixSignature({ id, timestamp: String(nowSec), signature: `v1,AAAA ${goodSig}`, body, secret: SECRET, now: NOW }).ok, "matches any signature in a space-delimited list");
// Secret without the whsec_ prefix is accepted (raw base64).
assert(verifySvixSignature({ id, timestamp: String(nowSec), signature: goodSig, body, secret: SECRET_B64, now: NOW }).ok, "bare base64 secret (no whsec_ prefix) also works");

// ── Event parsing ────────────────────────────────────────────────────────────
const delivered = parseResendEvent(JSON.parse(body), id);
assert(delivered?.category === "delivered" && delivered.type === "email.delivered", "email.delivered → category delivered");
assert(delivered?.email === "reader@example.com", "recipient is lowercased (hashing happens in the store, not here)");
assert(delivered?.providerMessageId === "re_123", "provider message id captured for joins to email_sends");
assert(delivered?.eventId === id, "Svix id carried as the idempotency key");

const bounced = parseResendEvent({ type: "email.bounced", created_at: "2026-07-20T11:00:00Z", data: { email_id: "re_9", to: "x@y.com", tags: [{ name: "campaign", value: "daily-2026-07-20" }] } }, "msg_b");
assert(bounced?.category === "bounced", "email.bounced → category bounced");
assert(bounced?.campaign === "daily-2026-07-20", "campaign extracted from message tags");

const complained = parseResendEvent({ type: "email.complained", data: { to: ["a@b.com"] } }, "msg_c");
assert(complained?.category === "complained" && complained.occurredAt === null, "email.complained parsed; missing created_at → null occurredAt");

assert(parseResendEvent({ type: "email.unknown_future_type", data: {} }, "msg_u") === null, "unknown event type → null (route 200-acks and skips)");
assert(parseResendEvent({ data: {} }, "msg_n") === null, "payload with no type → null");
assert(parseResendEvent(null, "msg_z") === null, "null payload → null (no throw)");

console.log(failures ? `\n${failures} FAILURE(S)` : "\nAll resend-webhook tests passed.");
process.exit(failures ? 1 : 0);
