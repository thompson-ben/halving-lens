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

// Floor a timestamp to the start of its UTC day.
const floorToUtcDay = (ms: number): number => Math.floor(ms / DAY) * DAY;

export function enrolAnchorMs(signupISO: string | null, nowMs: number): number {
  const launch = Date.parse(`${LIFECYCLE_LAUNCH}T00:00:00Z`);
  const signupRaw = signupISO ? Date.parse(signupISO) : nowMs;
  // Anchor to the START of the signup day (UTC), not the exact moment — so
  // dayOffset counts whole calendar days. A member who subscribes at any hour
  // today receives the day-1 tour at the next daily send (~08:00 London
  // tomorrow), rather than waiting a further day when they happen to sign up
  // after the morning run. LIFECYCLE_LAUNCH is already midnight, so existing
  // subscribers (anchored to launch) are unaffected.
  const signup = floorToUtcDay(Number.isFinite(signupRaw) ? signupRaw : nowMs);
  return Math.max(signup, Number.isFinite(launch) ? launch : 0);
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
