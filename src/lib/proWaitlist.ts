// Pro early-access waitlist — the client-side decision contract (CD2).
//
// Mirrors the subscription decision discipline (src/lib/subscription.ts):
// the UI shows success ONLY when the server confirms the interest was
// DURABLY captured, and exactly one analytics event fires per outcome. The
// pro_waitlist table remains the authoritative demand count — the event is
// a convenience signal, never the measure.
//
// Deliberately separate from the Daily Brief machinery: expressing "tell me
// when something meaningful changes" is first-class Pro intent, not a
// newsletter subscription.

// Canonical Pro-interest sources (the API's allowlist derives from these).
// The Daily Brief's Member-footer invitation carries its source in a
// non-personal query param on the existing landing destination, so waitlist
// joins segment cleanly by where the intent came from.
export const PRO_SOURCE_DASHBOARD = "/cycle-dashboard#pro-early-access";
export const PRO_SOURCE_BRIEF_FOOTER = "brief-footer";
export const PRO_SOURCE_PARAM = "pro";

export type ProWaitlistOutcome = "created" | "existing" | "invalid" | "rate_limited" | "error";

export interface ProWaitlistResponseBody {
  ok?: boolean;
  outcome?: string;
  error?: string;
}

export type ProUiState = "success" | "existing" | "invalid" | "rate_limited" | "error";

export interface ProWaitlistDecision {
  state: ProUiState;
  message: string;
  /** Fire the `pro_waitlist_join` event — confirmed NEW capture only. */
  fireJoin: boolean;
  retryable: boolean;
}

const MESSAGES = {
  success: "You're on the early-access list — we'll email you when Pro opens.",
  existing: "You're already on the early-access list.",
  invalid: "Please enter a valid email address.",
  rate_limited: "Too many attempts. Please try again shortly.",
  error: "Something went wrong saving your place. Please try again.",
} as const;

export function decideProWaitlist(
  status: number | null,
  body: ProWaitlistResponseBody | null,
): ProWaitlistDecision {
  if (status === 200 && body?.ok === true && body.outcome === "created") {
    return { state: "success", message: MESSAGES.success, fireJoin: true, retryable: false };
  }
  if (status === 200 && body?.ok === true && body.outcome === "existing") {
    return { state: "existing", message: MESSAGES.existing, fireJoin: false, retryable: false };
  }
  if (status === 400) return { state: "invalid", message: body?.error ?? MESSAGES.invalid, fireJoin: false, retryable: false };
  if (status === 429) return { state: "rate_limited", message: MESSAGES.rate_limited, fireJoin: false, retryable: true };
  // 503, unknown statuses and network failures (null) are all retryable —
  // and never success: an unconfirmed capture must not read as captured.
  return { state: "error", message: MESSAGES.error, fireJoin: false, retryable: true };
}
