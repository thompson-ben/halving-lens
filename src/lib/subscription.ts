// Shared subscription contract + the PURE decision function that turns a
// /api/subscribe response into (a) what the UI shows and (b) which analytics /
// conversion events may fire. Client-safe (no server-only imports) and total —
// a network failure (status === null) or an unexpected 2xx with no known outcome
// maps to a retryable error, NEVER to success. This is the single guarantee
// behind P0: a success state and a conversion event only happen after the server
// confirms the subscriber was durably captured.

export type SubscribeOutcome = "created" | "existing" | "invalid" | "rate_limited" | "error";

export interface SubscribeResponseBody {
  ok: boolean;
  outcome?: SubscribeOutcome;
  error?: string;
}

export type UiState = "success" | "existing" | "invalid" | "rate_limited" | "error";
export type FailureCategory = "network" | "validation" | "rate_limit" | "server";
// `signup` is the canonical conversion event (consumed by the analytics and
// Founder Intelligence dashboards). PR136 removed the former
// `subscription_success` alias, which fired ALONGSIDE `signup` on the same
// successful submit and would have double-counted conversions once accepted.
export type SubscriptionAnalyticsEvent = "signup" | "subscription_existing" | "subscription_failure";

export interface UiDecision {
  state: UiState;
  message: string;
  /** Meta Lead + GA4 sign_up + the canonical `signup` conversion event. TRUE only for a confirmed NEW subscriber. */
  fireConversion: boolean;
  analyticsEvent: SubscriptionAnalyticsEvent;
  failureCategory?: FailureCategory;
  /** Whether offering an immediate retry makes sense (transient failures only). */
  retryable: boolean;
}

const MESSAGES = {
  success: "You’re subscribed — check your inbox for a welcome email.",
  existing: "You’re already subscribed — the daily brief lands in your inbox each morning.",
  invalid: "Please enter a valid email address.",
  rate_limited: "Too many attempts. Please try again in a few minutes.",
  server: "Something went wrong on our end and your email wasn’t saved. Please try again.",
  network: "We couldn’t reach the server. Check your connection and try again.",
} as const;

// status === null means the request never completed (network error / timeout).
export function decideFromResponse(status: number | null, body: SubscribeResponseBody | null): UiDecision {
  if (status === null) {
    return { state: "error", message: MESSAGES.network, fireConversion: false, analyticsEvent: "subscription_failure", failureCategory: "network", retryable: true };
  }

  const outcome = body?.outcome;
  const is2xx = status >= 200 && status < 300;

  if (is2xx && outcome === "created") {
    return { state: "success", message: MESSAGES.success, fireConversion: true, analyticsEvent: "signup", retryable: false };
  }
  if (is2xx && outcome === "existing") {
    return { state: "existing", message: MESSAGES.existing, fireConversion: false, analyticsEvent: "subscription_existing", retryable: false };
  }
  if (status === 400 || outcome === "invalid") {
    return { state: "invalid", message: MESSAGES.invalid, fireConversion: false, analyticsEvent: "subscription_failure", failureCategory: "validation", retryable: false };
  }
  if (status === 429 || outcome === "rate_limited") {
    return { state: "rate_limited", message: MESSAGES.rate_limited, fireConversion: false, analyticsEvent: "subscription_failure", failureCategory: "rate_limit", retryable: true };
  }

  // Everything else — 5xx, or a 2xx with a missing/unknown outcome — is treated
  // as a server failure. We NEVER assume success from an ambiguous response.
  return { state: "error", message: MESSAGES.server, fireConversion: false, analyticsEvent: "subscription_failure", failureCategory: "server", retryable: true };
}
