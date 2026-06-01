"use client";

// Lightweight client tracker. Anonymous per-session id in sessionStorage (no
// cookies, no PII). Fire-and-forget POST to /api/track via sendBeacon when
// available (survives navigation), else fetch keepalive.

const SESSION_KEY = "hl.sid";
const VISITOR_KEY = "hl.seen"; // localStorage: have we seen this visitor before?

export function sessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

const VISITOR_ID_KEY = "hl.vid"; // localStorage: stable anonymous visitor id

// A stable, anonymous per-device id (random — not a user id, no PII). Persists
// across sessions so feedback can be grouped per visitor. Empty if unavailable.
export function visitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

// Coarse device class from UA + viewport — for segmenting feedback, not tracking.
export function deviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  try {
    const ua = navigator.userAgent;
    const w = window.innerWidth;
    if (/iPad|Tablet/i.test(ua)) return "tablet";
    if (/Mobi|Android|iPhone|iPod/i.test(ua) || w < 640) return "mobile";
    if (w < 1024) return "tablet";
    return "desktop";
  } catch {
    return "desktop";
  }
}

// True only for a visitor's very first session (returning-visitor signal).
function isNewVisitor(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(VISITOR_KEY)) return false;
    localStorage.setItem(VISITOR_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

const OPTOUT_KEY = "hl.notrack"; // localStorage: exclude this browser from analytics

// True if this browser has opted out (e.g. you, while testing). Honours a
// ?notrack=1 / ?notrack=0 query param to toggle, so you can set it from a link.
export function isOptedOut(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("notrack");
    if (q === "1") localStorage.setItem(OPTOUT_KEY, "1");
    if (q === "0") localStorage.removeItem(OPTOUT_KEY);
    return localStorage.getItem(OPTOUT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setOptOut(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) localStorage.setItem(OPTOUT_KEY, "1");
    else localStorage.removeItem(OPTOUT_KEY);
  } catch {
    /* ignore */
  }
}

export function track(
  name: string,
  props: Record<string, unknown> = {},
  opts: { isNew?: boolean } = {},
): void {
  if (typeof window === "undefined") return;
  if (isOptedOut()) return; // don't count opted-out browsers (e.g. your own testing)
  const payload = JSON.stringify({
    name,
    path: window.location.pathname,
    props,
    sessionId: sessionId(),
    isNew: opts.isNew ?? false,
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    } else {
      void fetch("/api/track", { method: "POST", body: payload, keepalive: true, headers: { "Content-Type": "application/json" } });
    }
  } catch {
    /* analytics must never break the app */
  }
}

// Page view — also reports whether this is the visitor's first-ever session.
export function trackPageView(): void {
  if (isOptedOut()) return; // skip before touching the new-visitor flag
  track("page_view", {}, { isNew: isNewVisitor() });
}
