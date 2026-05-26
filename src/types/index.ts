export type ContentStatus =
  | "new"
  | "shortlisted"
  | "permission_requested"
  | "approved"
  | "rejected"
  | "posted";

export type RightsStatus = "unknown" | "requested" | "granted" | "denied";

export type Platform =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "twitter"
  | "rss"
  | "auction"
  | "manual";

export const CONTENT_STATUSES: ContentStatus[] = [
  "new",
  "shortlisted",
  "permission_requested",
  "approved",
  "rejected",
  "posted",
];

export const PLATFORMS: Platform[] = [
  "instagram",
  "tiktok",
  "youtube",
  "twitter",
  "rss",
  "auction",
  "manual",
];

// Subset surfaced in the IG-first UI. The other connectors stay wired up on
// the backend so we can flip them on without a code change, but we don't
// clutter the filter chips with them.
export const PRIMARY_PLATFORMS: Platform[] = ["instagram", "manual"];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube Shorts",
  twitter: "X / Twitter",
  rss: "RSS / Blogs",
  auction: "Auction Sites",
  manual: "Manual Import",
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  new: "New",
  shortlisted: "Shortlisted",
  permission_requested: "Permission Requested",
  approved: "Approved",
  rejected: "Rejected",
  posted: "Posted",
};
