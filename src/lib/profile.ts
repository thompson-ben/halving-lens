// Server-side HalvingLens Profile helpers. Reads the signed session cookie to
// identify the current profile, and reads/writes the per-profile state JSONB
// (saved research, reading history, streak, badges) in Supabase. One identity,
// one row — clean and scalable.

import { cookies } from "next/headers";
import { sbSelect, sbCount, sbUpsert, sbUpdate } from "./supabase";
import { readProfileToken } from "./profileToken";
import { emailHash } from "./emailTracking";
import { referralCode } from "./referral";

export const PROFILE_COOKIE = "hl_profile";

// The earliest members get a permanent "Early Supporter" badge — never awarded
// again once the window closes. Configurable via env.
export const EARLY_SUPPORTER_LIMIT = Number(process.env.EARLY_SUPPORTER_LIMIT) || 100;

export function isFounderEmail(email: string): boolean {
  const f = (process.env.FOUNDER_EMAIL || "").trim().toLowerCase();
  return !!f && email.trim().toLowerCase() === f;
}

export interface MemberIdentity {
  memberNo: number | null; // permanent sequential number (by signup order)
  isFounder: boolean;
  isEarlySupporter: boolean;
}

// Derives the permanent member number from signup order (count of profiles
// created at or before this one) — stable without a schema migration, since
// created_at never changes and only earlier members are counted.
export async function memberIdentity(email: string): Promise<MemberIdentity> {
  const e = email.trim().toLowerCase();
  const founder = isFounderEmail(e);
  const rows = await sbSelect<{ created_at: string }[]>(
    `profiles?select=created_at&email=eq.${encodeURIComponent(e)}&limit=1`,
  );
  const createdAt = rows?.[0]?.created_at ?? null;
  const memberNo = createdAt ? await sbCount("profiles", `created_at=lte.${encodeURIComponent(createdAt)}`) : null;
  return {
    memberNo,
    isFounder: founder,
    isEarlySupporter: memberNo != null && memberNo <= EARLY_SUPPORTER_LIMIT,
  };
}

export interface ProfileState {
  saved?: { kind: string; title: string; href: string; ts: number }[];
  recent?: { kind: string; title: string; href: string; ts: number }[];
  streakDays?: string[]; // ISO dates visited
  badges?: string[]; // earned badge ids (permanent once earned)
  hideFromHall?: boolean; // opt out of the public Hall of Founders
  hallName?: string; // deprecated — superseded by the profiles.display_name column; still read as a fallback
  youtubeSubscribed?: boolean; // self-attested "I subscribed to the YouTube channel"
  entitlements?: string[]; // granted entitlements (premium, beta, …) — see entitlements.ts
  updatedAt?: number;
}

export interface Profile {
  email: string;
  hash: string; // privacy-safe id, shared with email-engagement events
  referralCode: string;
}

// The currently signed-in profile, or null. Cookie-based, stateless.
export function currentProfile(): Profile | null {
  const token = cookies().get(PROFILE_COOKIE)?.value;
  const email = readProfileToken(token);
  if (!email) return null;
  return { email, hash: emailHash(email), referralCode: referralCode(email) };
}

export async function getProfileState(email: string): Promise<ProfileState> {
  const rows = await sbSelect<{ state: ProfileState | null }[]>(
    `profiles?select=state&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`,
  );
  return (rows && rows[0]?.state) || {};
}

// Upsert the profile row (idempotent) — used on sign-in and on state writes.
export async function upsertProfile(email: string, state?: ProfileState): Promise<boolean> {
  const row: Record<string, unknown> = {
    email: email.trim().toLowerCase(),
    referral_code: referralCode(email),
  };
  if (state) row.state = { ...state, updatedAt: Date.now() };
  return sbUpsert("profiles", row, "email");
}

// ── Display name ──────────────────────────────────────────────────────────────
// An optional, case-insensitively-unique public name. When set it replaces the
// anonymous "Investor A1B2" handle on the leaderboard, Hall of Founders and the
// weekly round-up. Uniqueness is enforced at the database level (a partial unique
// index on lower(display_name)); the checks here give friendly errors first.

export const DISPLAY_NAME_MIN = 2;
export const DISPLAY_NAME_MAX = 24;

// Names that would let someone impersonate the system or the anonymous handles.
const RESERVED_NAMES = new Set([
  "admin", "administrator", "halvinglens", "halving lens", "moderator", "mod",
  "support", "help", "official", "team", "staff", "root", "system", "null",
  "undefined", "you", "me", "anonymous", "founder", "halvinglens research",
]);
// Reject anything shaped like the auto-generated system labels.
const SYSTEM_SHAPED = [/^member\s*#?\s*\d+$/i, /^investor\s+[a-z0-9]{4}$/i];

// Collapse whitespace and trim — the canonical form we validate and store.
export function normalizeDisplayName(raw: string): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

// Validate a candidate name. Returns the normalized value or a user-facing error.
export function validateDisplayName(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = normalizeDisplayName(raw);
  if (value.length < DISPLAY_NAME_MIN) return { ok: false, error: `Use at least ${DISPLAY_NAME_MIN} characters.` };
  if (value.length > DISPLAY_NAME_MAX) return { ok: false, error: `Keep it to ${DISPLAY_NAME_MAX} characters or fewer.` };
  // Letters, numbers and spaces, plus . _ - inside; must start and end alphanumeric.
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]*[A-Za-z0-9]$/.test(value)) {
    return { ok: false, error: "Use letters, numbers, spaces and . _ - only, starting and ending with a letter or number." };
  }
  const lower = value.toLowerCase();
  if (RESERVED_NAMES.has(lower) || SYSTEM_SHAPED.some((re) => re.test(value))) {
    return { ok: false, error: "That name isn't available." };
  }
  return { ok: true, value };
}

// The current member's display name, or null.
export async function getDisplayName(email: string): Promise<string | null> {
  const rows = await sbSelect<{ display_name: string | null }[]>(
    `profiles?select=display_name&email=eq.${encodeURIComponent(email.toLowerCase())}&limit=1`,
  );
  return rows?.[0]?.display_name ?? null;
}

// referral_code → display name, for every member who has set one. Lets the
// leaderboard / Hall / round-up resolve names in a single query.
export async function displayNamesByCode(): Promise<Map<string, string>> {
  const rows = await sbSelect<{ referral_code: string | null; display_name: string | null }[]>(
    "profiles?select=referral_code,display_name&display_name=not.is.null&limit=50000",
  );
  const map = new Map<string, string>();
  for (const r of rows ?? []) {
    if (r.referral_code && r.display_name) map.set(r.referral_code, r.display_name);
  }
  return map;
}

// Set (or clear, with an empty string) the current member's display name.
// Case-insensitively unique: rejects a name already held by someone else, with
// the DB unique index as the race-safe backstop.
export async function setDisplayName(
  email: string,
  raw: string,
): Promise<{ ok: boolean; error?: string; displayName: string | null }> {
  const me = email.trim().toLowerCase();

  // Empty ⇒ clear the name.
  if (normalizeDisplayName(raw) === "") {
    const ok = await sbUpdate("profiles", `email=eq.${encodeURIComponent(me)}`, { display_name: null });
    return ok ? { ok: true, displayName: null } : { ok: false, error: "Couldn't update your name — try again.", displayName: null };
  }

  const check = validateDisplayName(raw);
  if (!check.ok) return { ok: false, error: check.error, displayName: null };
  const value = check.value;
  const lower = value.toLowerCase();

  // Best-effort availability check (the DB unique index is the real guarantee).
  // Compared in memory to avoid ilike-escaping of _ and % in names.
  const named = await sbSelect<{ email: string; display_name: string | null }[]>(
    "profiles?select=email,display_name&display_name=not.is.null&limit=50000",
  );
  const clash = (named ?? []).some((r) => r.display_name?.toLowerCase() === lower && r.email.toLowerCase() !== me);
  if (clash) return { ok: false, error: "That name is already taken — try another.", displayName: null };

  const ok = await sbUpdate("profiles", `email=eq.${encodeURIComponent(me)}`, { display_name: value });
  if (!ok) return { ok: false, error: "That name may have just been taken — try another.", displayName: null };
  return { ok: true, displayName: value };
}
