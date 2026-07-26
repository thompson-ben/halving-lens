// The single source of truth for the analytics event taxonomy (PR136).
//
// Both sides of the pipeline import from here:
//   - the client tracker (src/lib/track.ts) types every track() call against
//     TrackedEvent, so an unknown name is a COMPILE error, and
//   - the collection API (src/app/api/track/route.ts) validates incoming
//     names with isTrackedEvent(), so the two can never drift apart again.
//
// History: the API previously kept its own hard-coded allowlist. Twenty-six
// event names fired by the app were missing from it, so those events were
// silently rejected with HTTP 400 for weeks — including the entire
// subscription funnel. Keep this file the only place an event name is spelled
// out; scripts/test-analytics-events.ts guards the contract in CI.
//
// Rules for adding an event:
//   - only with a real call site (no speculative names),
//   - snake_case, understandable without this file open,
//   - add it to the group it belongs to, with a comment if non-obvious.

// ── Core visitor signals ────────────────────────────────────────────────────
const CORE = [
  "page_view",
  "engagement", // time-on-page + scroll depth, fired on leave
  "section_view",
  "section_click",
  "section_dwell", // accumulated visible time per tracked section
] as const;

// ── Subscription funnel ─────────────────────────────────────────────────────
// The canonical conversion event is `signup` — fired ONCE per confirmed new
// subscriber (see src/lib/subscription.ts). `subscription_success` was removed
// in PR136: it duplicated `signup` on the same action and would have
// double-counted conversions.
const FUNNEL = [
  "nav_subscribe_impression", // header/mobile-nav CTA seen
  "nav_subscribe_click",
  "home_hero_view",
  "landing_view", // /free + /start
  "landing_cta",
  "subscription_submit_attempt", // form submitted, passed client validation
  "signup", // canonical conversion — confirmed NEW subscriber only
  "subscription_existing", // recognised returning subscriber
  "subscription_failure", // with props.category: validation|rate_limit|server|network
] as const;

// ── Internal navigation / journeys ──────────────────────────────────────────
const NAVIGATION = [
  "evidence_card_click", // State of Bitcoin evidence sweep + ETF card
  "week_signal_click", // Week in Context signal rows
  "snapshot_strip_click", // SnapshotStrip → /state-of-bitcoin
  "snapshot_research_click", // SOB research corner
  "snapshot_range_click", // SOB historical-range card
  "reference_price_row_clicked",
  "mining_cost_related_metric_clicked",
  "mining_cost_methodology_opened",
  // Pre-registered for the approved Discovery & Return roadmap. Call sites
  // arrive with their PRs; listed now so those PRs ship pre-instrumented.
  "journey_next_impression", // PR137 — "Continue your journey" seen
  "journey_next_click", // PR137 — with props from/to
  "youtube_click", // outbound YouTube link/card clicked
  "search_impression", // PR139 — search surface opened/focused
  "search_query", // PR139 — a query was run ("search use")
  "search_result_click", // PR139 — a result was followed
] as const;

// ── On-page tools & content interactions ────────────────────────────────────
const CONTENT = [
  "research_search",
  "research_filter",
  "research_share",
  "findings_search",
  "findings_filter",
  "findings_sort",
  "dca_change",
  "timeline_range",
  "copy_summary",
  "dashboard_view",
  "favourite_toggle",
  "profile_request",
  "profile_signin",
  "feature_vote",
  "feedback",
  "presenter_mode", // founder recording mode on public pages
] as const;

// ── Share & copy system ─────────────────────────────────────────────────────
const SHARE = [
  "share_open",
  "share", // method in props: copy|native|x|linkedin|email|qr
  "qr_view",
  "campaign_create",
  "share_image",
  "copy_image",
  "brief_share",
  "referral_copy",
  "copy_post",
  "copy_thread",
  "copy_instagram",
  "copy_linkedin",
  "copy_email",
  "copy_x",
  "copy_carousel",
  "copy_link",
  "copy_citation",
  "content_download_card",
  "content_download_zip",
  "content_share_card",
  "content_share_all",
] as const;

// ── Founder studios (admin-path only) ───────────────────────────────────────
// Fired from /admin/content tools. The API's internal-path filter drops all
// /admin traffic before storage, so these are never recorded — they are listed
// only so the studio components typecheck against the shared taxonomy.
const FOUNDER_STUDIO = [
  "content_pack_switch",
  "content_pack_posted",
  "reel_copy_full",
  "reel_copy_title",
  "reel_copy_hook",
  "reel_copy_voiceover",
  "reel_copy_storyboard",
  "reel_copy_overlays",
  "reel_copy_cta",
  "reel_copy_caption",
] as const;

export const TRACKED_EVENTS = [
  ...CORE,
  ...FUNNEL,
  ...NAVIGATION,
  ...CONTENT,
  ...SHARE,
  ...FOUNDER_STUDIO,
] as const;

export type TrackedEvent = (typeof TRACKED_EVENTS)[number];

const EVENT_SET: ReadonlySet<string> = new Set(TRACKED_EVENTS);

export function isTrackedEvent(name: string): name is TrackedEvent {
  return EVENT_SET.has(name);
}
