// Real engagement signals for the Research Findings library — built entirely
// from first-party analytics events already collected (no fabricated numbers).
//   • "Most read"   = page_view events on /research/findings/<slug>
//   • "Most shared" = copy/share events that carry props.finding (the HL-R id)
// Server-only (reads Supabase). Returns an empty map when analytics isn't
// configured, so rankings gracefully fall back to "Newest".

import { sbSelect } from "./supabase";

export interface FindingEngagement {
  views: number;
  shares: number;
}

const SHARE_EVENTS = [
  "copy_x",
  "copy_link",
  "copy_citation",
  "copy_carousel",
  "copy_instagram",
  "copy_linkedin",
  "copy_email",
  "share_image",
];

export async function findingEngagement(): Promise<Record<string, FindingEngagement>> {
  const out: Record<string, FindingEngagement> = {};
  const bump = (slug: string, key: keyof FindingEngagement) => {
    const s = slug.toLowerCase();
    (out[s] ??= { views: 0, shares: 0 })[key] += 1;
  };

  // Most read — page views whose path is a finding note.
  const views = await sbSelect<{ path: string | null }[]>(
    "events?select=path&name=eq.page_view&limit=50000",
  );
  for (const r of views ?? []) {
    const m = r.path?.match(/^\/research\/findings\/([a-z0-9-]+)\/?$/i);
    if (m) bump(m[1], "views");
  }

  // Most shared — share/copy events tagged with the finding id (e.g. "HL-R001").
  const shares = await sbSelect<{ props: Record<string, unknown> | null }[]>(
    `events?select=props&name=in.(${SHARE_EVENTS.join(",")})&limit=50000`,
  );
  for (const r of shares ?? []) {
    const f = r.props?.finding;
    if (typeof f === "string" && /^hl-r\d+$/i.test(f)) bump(f, "shares");
  }

  return out;
}
