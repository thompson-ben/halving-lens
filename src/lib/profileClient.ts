"use client";

import { exportLocalState, mergeLocalState } from "./personalize";

// Client-side profile helpers: identity check (cached), and a once-per-session
// sync that links email↔web identity (for true WAES) and merges the local
// dashboard state with the signed-in profile across devices.

export interface MeResult {
  signedIn: boolean;
  email?: string;
  referralCode?: string;
}

let cached: MeResult | null = null;

export async function getProfile(): Promise<MeResult> {
  if (cached) return cached;
  try {
    const r = await fetch("/api/profile/me", { cache: "no-store" });
    cached = (await r.json()) as MeResult;
  } catch {
    cached = { signedIn: false };
  }
  return cached;
}

// Push the merged local state up to the profile.
export async function pushLocalToServer(): Promise<void> {
  try {
    await fetch("/api/profile/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(exportLocalState()),
    });
  } catch {
    /* ignore */
  }
}

// Run once per page session when signed in: record the visit (true WAES) and
// reconcile local ⇄ profile state.
export async function syncProfile(): Promise<void> {
  const me = await getProfile();
  if (!me.signedIn) return;
  try {
    if (!sessionStorage.getItem("hl.pinged")) {
      sessionStorage.setItem("hl.pinged", "1");
      void fetch("/api/profile/ping", { method: "POST" });
    }
    if (sessionStorage.getItem("hl.synced")) return;
    sessionStorage.setItem("hl.synced", "1");
    const r = await fetch("/api/profile/state", { cache: "no-store" });
    const j = await r.json();
    if (j?.state) mergeLocalState(j.state);
    await pushLocalToServer();
  } catch {
    /* ignore */
  }
}
