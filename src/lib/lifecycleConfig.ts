// Lifecycle engine configuration — the few knobs that shape the onboarding
// journey, kept dependency-free so both the engine and the email templates can
// import them without cycles. Nothing about the sequence is hardcoded elsewhere.

// When the lifecycle programme "went live". Existing subscribers (who joined
// before onboarding existed) are enrolled from this date, so they experience the
// sequence from the start rather than having every email fire at once. Override
// with LIFECYCLE_LAUNCH=YYYY-MM-DD.
export const LIFECYCLE_LAUNCH = process.env.LIFECYCLE_LAUNCH || "2026-07-06";

// The HalvingLens YouTube channel. Empty until it exists — the YouTube email and
// links adapt gracefully (point at the channel search / omit the video) rather
// than linking somewhere broken. Set LIFECYCLE_YOUTUBE_URL when the channel is live.
export const YOUTUBE_URL = process.env.LIFECYCLE_YOUTUBE_URL || "";
export const YOUTUBE_LIVE = YOUTUBE_URL.length > 0;

// How many days after a step becomes due we'll still send it. This bounds
// catch-up (a missed cron day still delivers) AND prevents a newly-inserted
// early step from back-blasting long-standing members: if a subscriber is
// already well past a step's due date, that step is skipped rather than fired.
export const LIFECYCLE_CATCHUP_DAYS = Number(process.env.LIFECYCLE_CATCHUP_DAYS) || 30;

// When the onboarding Pro introduction (step pro_intro) becomes eligible.
// Founder alignment rule: the boundary tracks ACTUAL migration readiness,
// never the original plan. Readiness was confirmed 26 Sep (rev-2 verified:
// 2,272 legacy rows all 'sent'; zero pro_intro rows — no send ever
// occurred while paused), so the boundary is 2026-09-27, the first clean
// UTC day after confirmation: due dates from 23–26 Sep are PERMANENTLY
// skipped, never caught up. Any future slip: bump again BEFORE the next
// daily run. UTC ELIGIBILITY BOUNDARY:
// the step fires only for subscribers whose due date (enrolment anchor,
// floored to its UTC day, + 18 days) falls ON OR AFTER
// PRO_INTRO_FROM 00:00:00 UTC. Anyone whose day-18 due date predates that
// instant is permanently skipped — stricter than the general catch-up
// window, so activation produces NO retrospective batch; in-flight
// subscribers who reach day 18 afterwards get it as ordinary drip.
// LIFECYCLE_PRO_INTRO_FROM overrides (used if the merge slips past this date).
export const PRO_INTRO_FROM = process.env.LIFECYCLE_PRO_INTRO_FROM || "2026-09-27";

// The one-time existing-subscriber Pro announcement's campaign id — shared by
// the dispatch script (send tracking) and the checkpoint report (click
// queries) so the two can never drift.
export const PRO_ANNOUNCEMENT_CAMPAIGN = "pro-announcement-2026-09";
