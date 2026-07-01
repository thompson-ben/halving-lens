// Server-side HalvingLens Profile helpers. Reads the signed session cookie to
// identify the current profile, and reads/writes the per-profile state JSONB
// (saved research, reading history, streak, badges) in Supabase. One identity,
// one row — clean and scalable.

import { cookies } from "next/headers";
import { sbSelect, sbCount, sbUpsert } from "./supabase";
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
