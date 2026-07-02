"use client";

// First-touch marketing attribution. Captures UTM + referral params the first
// time a visitor lands, persists them for the whole journey, and attaches them
// to every signup — so conversions are attributed to the campaign that brought
// the visitor in, even if they subscribe later from a different page.
//
// Standard convention (see docs in PM brief):
//   utm_source · utm_medium · utm_campaign · utm_content · utm_term · ref

const KEY = "hl.attr";
// Full attribution surface: standard UTMs, Meta ids, referral code, and the
// HalvingLens short-link markers (hlr = share-link slug, hlc = founder campaign)
// injected by the /r/<slug> redirect. First-touch wins and persists through
// signup, so every subscriber traces back to the campaign / ad / share that
// brought them in.
const FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "campaign_id",
  "adset_id",
  "ad_id",
  "ref",
  "hlr",
  "hlc",
] as const;

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(KEY)) return; // first-touch wins — never overwrite
    const p = new URLSearchParams(window.location.search);
    const o: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = p.get(f);
      if (v) o[f] = v.slice(0, 80);
    }
    if (Object.keys(o).length) {
      o.landing = window.location.pathname.slice(0, 80);
      const r = document.referrer || "";
      if (r) o.referrer = r.slice(0, 120);
      localStorage.setItem(KEY, JSON.stringify(o));
    }
  } catch {
    /* ignore */
  }
}

export function getAttribution(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
