// Server-side PURE core for /api/subscribe. Kept separate from the route so the
// outcome logic is unit-testable without HTTP. No I/O here — the route performs
// the actual store writes and passes their results in.

import type { SubscribeOutcome } from "./subscription";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string | undefined | null): string {
  return (raw ?? "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

// Result of attempting the primary durable store (Supabase).
export type StoreResult = "created" | "duplicate" | "unavailable";

export interface ResolvedOutcome {
  outcome: SubscribeOutcome;
  status: number; // HTTP status the route should return
  ok: boolean; // convenience for the JSON body
  sendWelcome: boolean; // only a confirmed NEW Supabase subscriber
}

// Decide the outcome from the durable-store results. The rule (approved):
// a success/`created` outcome is only returned when the subscriber was durably
// persisted — Supabase created, Supabase duplicate (already persisted), or an
// approved webhook fallback that confirmed capture. If nothing durably captured
// the signup, return a RETRYABLE error (503) — logging alone is not success.
export function resolveOutcome(supa: StoreResult, webhookConfigured: boolean, webhookOk: boolean): ResolvedOutcome {
  if (supa === "created") return { outcome: "created", status: 200, ok: true, sendWelcome: true };
  if (supa === "duplicate") return { outcome: "existing", status: 200, ok: true, sendWelcome: false };
  // Supabase unavailable → did an approved durable fallback capture it?
  if (webhookConfigured && webhookOk) return { outcome: "created", status: 200, ok: true, sendWelcome: false };
  return { outcome: "error", status: 503, ok: false, sendWelcome: false };
}
