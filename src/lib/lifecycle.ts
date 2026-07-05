// Lifecycle engine — decides which onboarding email (if any) a subscriber is due
// for right now. Pure and dependency-light; the sequence lives in
// lifecycleEmails.ts and the sending in lifecycleSend.ts.
//
// Enrolment model:
//   anchor = max(signup_at, LIFECYCLE_LAUNCH)
// So brand-new subscribers drip from signup, while subscribers who joined before
// onboarding existed are enrolled from launch — they get the sequence from the
// start rather than every email at once. Progress is stored per step id in
// lifecycle_sends, so sends are idempotent and new steps can be added later
// without touching existing users' history.

import { LIFECYCLE_STEPS, type LifecycleStep } from "./lifecycleEmails";
import { LIFECYCLE_LAUNCH, LIFECYCLE_CATCHUP_DAYS } from "./lifecycleConfig";

const DAY = 86_400_000;

export function enrolAnchorMs(signupISO: string | null, nowMs: number): number {
  const launch = Date.parse(`${LIFECYCLE_LAUNCH}T00:00:00Z`);
  const signup = signupISO ? Date.parse(signupISO) : nowMs;
  return Math.max(Number.isFinite(signup) ? signup : nowMs, Number.isFinite(launch) ? launch : 0);
}

// Steps this subscriber is eligible for now: enabled, not already sent, past
// their due date, and within the catch-up window — the upper bound both bounds
// catch-up after a missed run AND stops a newly-inserted early step from
// back-blasting members who are already well past that point.
export function dueSteps(signupISO: string | null, sentIds: Set<string>, nowMs: number): LifecycleStep[] {
  const anchor = enrolAnchorMs(signupISO, nowMs);
  const catchup = LIFECYCLE_CATCHUP_DAYS * DAY;
  return LIFECYCLE_STEPS.filter((s) => (s.enabled ?? true) && !sentIds.has(s.id))
    .map((s) => ({ s, due: anchor + s.dayOffset * DAY }))
    .filter(({ due }) => nowMs >= due && nowMs <= due + catchup)
    .sort((a, b) => a.due - b.due)
    .map(({ s }) => s);
}

// At most one onboarding email per subscriber per run, so the sequence drips
// rather than arriving all at once.
export function nextStep(signupISO: string | null, sentIds: Set<string>, nowMs: number): LifecycleStep | null {
  return dueSteps(signupISO, sentIds, nowMs)[0] ?? null;
}

export { LIFECYCLE_STEPS };
export type { LifecycleStep };
