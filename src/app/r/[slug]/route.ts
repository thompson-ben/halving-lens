import { NextResponse } from "next/server";
import { sbInsert } from "@/lib/supabase";
import { isBot } from "@/lib/botCheck";
import { SITE_URL } from "@/lib/site";
import { pathForCanonicalSlug, isReservedSlug } from "@/lib/shareLinks";
import { getCampaign } from "@/lib/shareCampaigns";

// Branded short-link redirect. Every shared HalvingLens URL routes through here:
//   1. resolve the slug (campaign → canonical page → reversible path encoding)
//   2. record the hit (QR scan / link open), bots excluded
//   3. preserve + inject attribution
//   4. redirect immediately to the destination — invisible to the visitor.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const METHODS = new Set(["qr", "link", "copy", "native", "x", "linkedin", "email"]);
// Attribution params we always forward from the incoming link to the destination.
const FORWARD = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "campaign_id", "adset_id", "ad_id", "ref"];
// Friendly aliases whose content deserves a specific type in analytics.
const ALIAS_TYPE: Record<string, string> = { brief: "brief", weekly: "weekly", home: "page", research: "page", findings: "page" };

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const slug = (params.slug || "").slice(0, 80);
  const url = new URL(req.url);
  const rawMethod = url.searchParams.get("s") || "link";
  const method = METHODS.has(rawMethod) ? rawMethod : "link";

  // 1. Resolve the slug. Campaigns (DB) win, then canonical/finding/encoded.
  // Reserved slugs can never be campaigns (creation forbids it), so we skip the
  // DB round-trip for them — canonical/finding/QR redirects stay fast.
  const campaign = isReservedSlug(slug) ? null : await getCampaign(slug);
  let destPath = "/";
  let kind = "unknown";
  let contentType: string | null = null;
  let contentId: string | null = null;

  if (campaign && !campaign.archived) {
    destPath = campaign.destination_path;
    kind = "campaign";
  } else {
    const canon = pathForCanonicalSlug(slug);
    if (canon) {
      destPath = canon;
      if (/^hl-r\d+$/i.test(slug)) {
        kind = "finding";
        contentType = "finding";
        contentId = slug.toUpperCase();
      } else if (slug.startsWith("~")) {
        kind = "encoded";
        contentType = "page";
      } else {
        kind = "canonical";
        contentType = ALIAS_TYPE[slug.toLowerCase()] ?? "page";
      }
    }
  }

  // 2. Record the hit (fail-open; bots excluded so scan counts stay honest).
  if (!isBot(req.headers.get("user-agent"))) {
    await sbInsert("link_hits", {
      slug,
      kind,
      destination: destPath,
      method,
      campaign_slug: campaign ? campaign.slug : null,
      content_type: contentType,
      content_id: contentId,
      referrer: (req.headers.get("referer") || "").slice(0, 200) || null,
      ua: (req.headers.get("user-agent") || "").slice(0, 200) || null,
    });
  }

  // 3. Preserve + inject attribution onto the destination.
  const out = new URLSearchParams();
  for (const k of FORWARD) {
    const v = url.searchParams.get(k);
    if (v) out.set(k, v.slice(0, 120));
  }
  if (campaign) {
    const defaults: Record<string, string | null> = {
      utm_source: campaign.utm_source,
      utm_medium: campaign.utm_medium,
      utm_campaign: campaign.utm_campaign,
      utm_content: campaign.utm_content,
      utm_term: campaign.utm_term,
    };
    for (const [k, v] of Object.entries(defaults)) if (v && !out.has(k)) out.set(k, v);
    out.set("hlc", campaign.slug); // campaign marker for first-touch attribution
  }
  out.set("hlr", slug); // share-link marker (share-to-visit / share-to-signup)

  // 4. Redirect. Always same-site (pathForCanonicalSlug already guards this).
  const target = new URL(destPath.startsWith("/") ? destPath : `/${destPath}`, SITE_URL);
  const existing = new URLSearchParams(target.search);
  for (const [k, v] of out) existing.set(k, v);
  target.search = existing.toString();

  return NextResponse.redirect(target.toString(), 302);
}
