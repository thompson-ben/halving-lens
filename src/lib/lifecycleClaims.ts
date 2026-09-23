// Cross-channel at-most-once for the Pro introduction (founder review,
// 23 Sep 2026). The day-18 onboarding job and the one-time announcement run
// as DIFFERENT workflows and can execute concurrently, so a read-then-send
// check on lifecycle_sends is not sufficient on its own. This ports the
// established delivery safeguards (pro_waitlist_emails, PR #226) to the
// shared "pro_intro" key — scoped to cross-channel steps only; the rest of
// the onboarding drip keeps its single-job record-on-success model.
//
//  · CLAIM FIRST: a conflict-aware insert against the EXISTING unique index
//    on lower(email)+step. The database arbitrates concurrent claims —
//    whichever job loses the race gets 409 and skips WITHOUT sending.
//  · Deterministic provider Idempotency-Key on every send (channel-
//    independent), so even a retried delivery of the same logical send
//    cannot double-send at the provider within its retention window.
//  · Outcomes mirror the established model: provider acceptance → status
//    'sent'; DEFINITIVE rejection (4xx) → the claim is released so a later
//    run may retry safely; AMBIGUOUS outcome (network failure/timeout/5xx —
//    the provider may have accepted) → the claim is RETAINED as 'ambiguous'
//    for manual reconciliation, never released, never blindly retried.
//  · Rows read as blockers REGARDLESS of status: a pending or ambiguous
//    claim suppresses both channels (at-most-once bias), and both dry-runs
//    report every pro_intro row with status != 'sent' as uncertain.
//
// Requires the rev-2 lifecycle_sends migration (status column — legacy rows
// default 'sent'). Until it is applied, claims fail closed: NOTHING sends
// and the run reports the store as unavailable — a missing migration can
// delay the introduction but can never duplicate it.

import { createHash } from "crypto";
import { sbUpdate, sbDelete, sbSelect } from "./supabase";

export const PRO_INTRO_STEP = "pro_intro";

export type LifecycleClaim = "claimed" | "already" | "unavailable";

const rowFilter = (email: string) => `email=eq.${encodeURIComponent(email.toLowerCase())}&step=eq.${PRO_INTRO_STEP}`;

/** Atomically claim the one-per-address Pro introduction. */
export async function claimProIntro(email: string): Promise<LifecycleClaim> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "unavailable";
  try {
    const res = await fetch(`${url}/rest/v1/lifecycle_sends`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ email: email.toLowerCase(), step: PRO_INTRO_STEP, status: "pending" }),
    });
    if (res.status === 409) return "already"; // the other channel (or an earlier run) holds it
    if (res.ok) return "claimed";
    return "unavailable"; // schema not migrated / store down — fail closed, nothing sends
  } catch {
    return "unavailable";
  }
}

/** Provider acceptance: the claim becomes the permanent send record. */
export async function markProIntroSent(email: string): Promise<boolean> {
  return sbUpdate("lifecycle_sends", rowFilter(email), { status: "sent" });
}

/** Ambiguous provider outcome: RETAIN the claim for manual reconciliation. */
export async function retainProIntroAmbiguous(email: string): Promise<boolean> {
  return sbUpdate("lifecycle_sends", rowFilter(email), { status: "ambiguous" });
}

/** Definitive provider rejection: release the claim so a later run retries. */
export async function releaseProIntroClaim(email: string): Promise<boolean> {
  return sbDelete("lifecycle_sends", rowFilter(email));
}

/** Deterministic, channel-independent provider idempotency key for the one
 *  logical Pro introduction per address — stable across processes and
 *  retries, carrying no readable address. */
export function proIntroIdempotencyKey(email: string): string {
  return `lifecycle/${PRO_INTRO_STEP}/${createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32)}`;
}

/** Every pro_intro claim whose send is NOT provider-confirmed (pending =
 *  e.g. a crash after claiming; ambiguous = unknown provider outcome).
 *  null = unreadable (report loudly; sends must not proceed blind). */
export async function uncertainProIntroClaims(): Promise<{ email: string; status: string; sent_at: string }[] | null> {
  return sbSelect<{ email: string; status: string; sent_at: string }[]>(
    `lifecycle_sends?select=email,status,sent_at&step=eq.${PRO_INTRO_STEP}&status=neq.sent&limit=1000`,
  );
}
