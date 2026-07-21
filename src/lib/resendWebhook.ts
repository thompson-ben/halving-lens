// Pure verification + parsing for Resend webhooks. Resend signs webhooks with
// Svix, so the signature scheme here is the standard Svix HMAC:
//
//   signedContent = `${svix-id}.${svix-timestamp}.${rawBody}`
//   expected      = base64( HMAC_SHA256( base64decode(secret without "whsec_"), signedContent ) )
//   svix-signature = space-separated list of `v1,<base64sig>` — match ANY entry
//
// Both functions are pure (no I/O, no env, no clock unless injected) so they are
// unit-tested directly. The route handler wires them to the request + the store.

import { createHmac, timingSafeEqual } from "crypto";

export interface SvixVerifyResult {
  ok: boolean;
  reason: string | null;
}

function safeEqB64(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

// Verify a Svix-signed webhook. `now`/`toleranceSec` are injectable for testing
// and replay protection (default ±5 min).
export function verifySvixSignature(opts: {
  id: string;
  timestamp: string;
  signature: string;
  body: string;
  secret: string;
  now?: number;
  toleranceSec?: number;
}): SvixVerifyResult {
  const { id, timestamp, signature, body, secret } = opts;
  if (!id || !timestamp || !signature || !secret) return { ok: false, reason: "missing_fields" };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad_timestamp" };
  const nowSec = Math.floor((opts.now ?? Date.now()) / 1000);
  const tol = opts.toleranceSec ?? 300;
  if (Math.abs(nowSec - ts) > tol) return { ok: false, reason: "timestamp_out_of_tolerance" };

  // The secret is `whsec_<base64>`; the HMAC key is the base64-decoded remainder.
  const raw = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    return { ok: false, reason: "bad_secret" };
  }
  if (key.length === 0) return { ok: false, reason: "bad_secret" };

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");

  // Header is a space-delimited list of "<version>,<signature>" pairs.
  for (const part of signature.split(" ")) {
    const comma = part.indexOf(",");
    const sig = comma >= 0 ? part.slice(comma + 1) : part;
    if (sig && safeEqB64(sig, expected)) return { ok: true, reason: null };
  }
  return { ok: false, reason: "no_matching_signature" };
}

// ── Event parsing ────────────────────────────────────────────────────────────

export type EmailEventCategory =
  | "sent"
  | "delivered"
  | "delayed"
  | "bounced"
  | "complained"
  | "opened"
  | "clicked"
  | "other";

const TYPE_TO_CATEGORY: Record<string, EmailEventCategory> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.opened": "opened",
  "email.clicked": "clicked",
};

export interface NormalizedEmailEvent {
  eventId: string; // Svix id (idempotency key)
  type: string; // raw Resend type
  category: EmailEventCategory;
  email: string | null; // raw, lowercased — hashed by the store before persistence
  providerMessageId: string | null;
  campaign: string | null;
  occurredAt: string | null; // ISO
}

interface ResendPayload {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    subject?: string;
    tags?: Array<{ name?: string; value?: string }> | Record<string, string>;
  };
}

function firstRecipient(to: string[] | string | undefined): string | null {
  if (!to) return null;
  const raw = Array.isArray(to) ? to[0] : to;
  return raw ? raw.trim().toLowerCase() : null;
}

type Tags = NonNullable<NonNullable<ResendPayload["data"]>["tags"]>;

// Campaign is carried on the message tags when the sender sets them (we tag
// sends with { name: "campaign", value: "daily-2026-07-20" } going forward).
function campaignFromTags(tags: Tags | undefined): string | null {
  if (!tags) return null;
  if (Array.isArray(tags)) {
    const t = tags.find((x) => x?.name === "campaign");
    return t?.value ?? null;
  }
  return typeof tags.campaign === "string" ? tags.campaign : null;
}

// Parse a Resend payload into a normalized event. Returns null for payloads we
// don't handle (unknown/absent type) so the route can 200-ack and move on.
export function parseResendEvent(payload: unknown, eventId: string): NormalizedEmailEvent | null {
  const p = (payload ?? {}) as ResendPayload;
  if (!p.type || typeof p.type !== "string") return null;
  const category = TYPE_TO_CATEGORY[p.type];
  if (!category) return null;

  return {
    eventId,
    type: p.type,
    category,
    email: firstRecipient(p.data?.to),
    providerMessageId: p.data?.email_id ?? null,
    campaign: campaignFromTags(p.data?.tags),
    occurredAt: p.created_at ?? null,
  };
}
