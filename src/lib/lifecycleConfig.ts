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

// When the onboarding Pro introduction (step pro_intro) joined the sequence.
// The step NEVER fires for a subscriber whose due date falls before this —
// stricter than the general catch-up window — so inserting it triggers no
// retrospective batch to members already past that point in the sequence.
// In-flight subscribers who reach day 18 after this date get it as ordinary
// drip. Set to the deploy date at merge (LIFECYCLE_PRO_INTRO_FROM overrides).
export const PRO_INTRO_FROM = process.env.LIFECYCLE_PRO_INTRO_FROM || "2026-09-24";

// The one-time existing-subscriber Pro announcement's campaign id — shared by
// the dispatch script (send tracking) and the checkpoint report (click
// queries) so the two can never drift.
export const PRO_ANNOUNCEMENT_CAMPAIGN = "pro-announcement-2026-09";
