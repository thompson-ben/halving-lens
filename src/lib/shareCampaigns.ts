// Founder share campaigns — server-only CRUD over share_campaigns. A campaign is
// an intentional, named short link (/r/norfolk-networking) with its own
// attribution and analytics, redirecting to a canonical destination page.

import { sbSelect, sbInsert } from "./supabase";
import { isReservedSlug } from "./shareLinks";

export interface ShareCampaign {
  id: number;
  slug: string;
  name: string;
  destination_path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  notes: string | null;
  created_by: string | null;
  archived: boolean;
  created_at: string;
}

// Normalise a free-text name into a safe, stable slug.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export type SlugError = "empty" | "reserved" | "taken" | "invalid";

// Validate a desired campaign slug. Returns null if OK, else a reason.
export async function validateCampaignSlug(slug: string): Promise<SlugError | null> {
  if (!slug || slug.length < 2) return "empty";
  if (!/^[a-z0-9-]+$/.test(slug)) return "invalid";
  if (isReservedSlug(slug)) return "reserved";
  const existing = await getCampaign(slug);
  return existing ? "taken" : null;
}

export async function getCampaign(slug: string): Promise<ShareCampaign | null> {
  const rows = await sbSelect<ShareCampaign[]>(
    `share_campaigns?slug=eq.${encodeURIComponent(slug.toLowerCase())}&limit=1`,
  );
  return rows && rows.length ? rows[0] : null;
}

export async function listCampaigns(): Promise<ShareCampaign[]> {
  const rows = await sbSelect<ShareCampaign[]>(
    "share_campaigns?order=created_at.desc&limit=500",
  );
  return rows ?? [];
}

export interface CreateCampaignInput {
  name: string;
  slug?: string;
  destination_path: string;
  createdBy?: string | null;
  notes?: string | null;
  utm?: Partial<Pick<ShareCampaign, "utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term">>;
}

export type CreateResult = { ok: true; campaign: { slug: string; name: string; destination_path: string } } | { ok: false; error: SlugError | "store_failed" };

export async function createCampaign(input: CreateCampaignInput): Promise<CreateResult> {
  const slug = input.slug ? slugify(input.slug) : slugify(input.name);
  const err = await validateCampaignSlug(slug);
  if (err) return { ok: false, error: err };

  const dest = input.destination_path.startsWith("/") ? input.destination_path : `/${input.destination_path}`;
  const row = {
    slug,
    name: input.name.slice(0, 120),
    destination_path: dest.slice(0, 200),
    utm_source: input.utm?.utm_source ?? "offline",
    utm_medium: input.utm?.utm_medium ?? "share",
    utm_campaign: input.utm?.utm_campaign ?? slug,
    utm_content: input.utm?.utm_content ?? null,
    utm_term: input.utm?.utm_term ?? null,
    notes: input.notes ?? null,
    created_by: input.createdBy ?? null,
  };
  const ok = await sbInsert("share_campaigns", row);
  if (!ok) return { ok: false, error: "store_failed" };
  return { ok: true, campaign: { slug, name: row.name, destination_path: row.destination_path } };
}
