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

export function track(
  name: string,
  props: Record<string, unknown> = {},
  opts: { isNew?: boolean } = {},
): void {
  if (typeof window === "undefined") return;
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
  track("page_view", {}, { isNew: isNewVisitor() });
}
