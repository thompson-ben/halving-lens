// Server-side HalvingLens Profile helpers. Reads the signed session cookie to
// identify the current profile, and reads/writes the per-profile state JSONB
// (saved research, reading history, streak, badges) in Supabase. One identity,
// one row — clean and scalable.

import { cookies } from "next/headers";
import { sbSelect, sbUpsert } from "./supabase";
import { readProfileToken } from "./profileToken";
import { emailHash } from "./emailTracking";
import { referralCode } from "./referral";

export const PROFILE_COOKIE = "hl_profile";

export interface ProfileState {
  saved?: { kind: string; title: string; href: string; ts: number }[];
  recent?: { kind: string; title: string; href: string; ts: number }[];
  streakDays?: string[]; // ISO dates visited
  badges?: string[]; // earned badge ids (permanent once earned)
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
