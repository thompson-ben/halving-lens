// Testimonials (P6.2): collection → storage → admin approval → site use.
// Privacy-first (attribution is a salted hash, never the raw email) and
// approval-gated (nothing is publishable until a human approves it).

import { sbInsert, sbSelect, sbUpdate, supabaseConfigured } from "./supabase";

export type TestimonialStatus = "pending" | "approved" | "rejected";

export interface Testimonial {
  id: number;
  quote: string;
  displayName: string;
  role: string | null;
  createdAt: string;
  source: string | null;
}

export interface TestimonialInput {
  quote?: string;
  displayName?: string;
  role?: string;
  consent?: boolean;
}

export const QUOTE_MIN = 10;
export const QUOTE_MAX = 280;
export const NAME_MAX = 50;
export const ROLE_MAX = 60;

export interface CleanResult {
  ok: boolean;
  error?: string;
  value?: { quote: string; displayName: string; role: string | null };
}

// Pure validation — used by the API and unit-tested. Consent to publish is
// REQUIRED (we never publish a quote the person didn't agree to share).
export function cleanTestimonial(input: TestimonialInput): CleanResult {
  const quote = (input.quote ?? "").trim().replace(/\s+/g, " ");
  const displayName = (input.displayName ?? "").trim();
  const role = (input.role ?? "").trim();

  if (input.consent !== true) return { ok: false, error: "Please tick the box to allow publishing your words." };
  if (quote.length < QUOTE_MIN) return { ok: false, error: "Please share a little more." };
  if (quote.length > QUOTE_MAX) return { ok: false, error: `Please keep it under ${QUOTE_MAX} characters.` };
  if (!displayName) return { ok: false, error: "Please add a display name." };
  if (displayName.length > NAME_MAX) return { ok: false, error: "That display name is too long." };
  if (role.length > ROLE_MAX) return { ok: false, error: "That role/description is too long." };

  return { ok: true, value: { quote, displayName, role: role || null } };
}

// Store a new submission as PENDING (never auto-published). `sub` is an optional
// salted email hash for attribution — never the raw address.
export async function submitTestimonial(v: { quote: string; displayName: string; role: string | null }, opts: { sub?: string | null; source?: string } = {}): Promise<boolean> {
  return sbInsert("testimonials", {
    quote: v.quote,
    display_name: v.displayName,
    role: v.role,
    sub: opts.sub ?? null,
    source: opts.source ?? "site",
    status: "pending",
  });
}

interface Row {
  id: number;
  quote: string;
  display_name: string;
  role: string | null;
  created_at: string;
  source: string | null;
}

function toTestimonial(r: Row): Testimonial {
  return { id: r.id, quote: r.quote, displayName: r.display_name, role: r.role, createdAt: r.created_at, source: r.source };
}

// Approved testimonials for public display (never exposes email/hash).
export async function approvedTestimonials(limit = 12): Promise<Testimonial[]> {
  if (!supabaseConfigured) return [];
  const rows = await sbSelect<Row[]>(`testimonials?select=id,quote,display_name,role,created_at,source&status=eq.approved&order=created_at.desc&limit=${limit}`);
  return (rows ?? []).map(toTestimonial);
}

// Pending queue for the admin moderation section.
export async function pendingTestimonials(limit = 100): Promise<Testimonial[]> {
  if (!supabaseConfigured) return [];
  const rows = await sbSelect<Row[]>(`testimonials?select=id,quote,display_name,role,created_at,source&status=eq.pending&order=created_at.desc&limit=${limit}`);
  return (rows ?? []).map(toTestimonial);
}

// Admin action: approve / reject a single submission.
export async function setTestimonialStatus(id: number, status: TestimonialStatus, now: number = Date.now()): Promise<boolean> {
  if (!Number.isInteger(id)) return false;
  return sbUpdate("testimonials", `id=eq.${id}`, { status, reviewed_at: new Date(now).toISOString() });
}
