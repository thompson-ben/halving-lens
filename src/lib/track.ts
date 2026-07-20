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
  opts: { isNew?: boolean; path?: string } = {},
): void {
  if (typeof window === "undefined") return;
  if (isOptedOut()) return; // don't count opted-out browsers (e.g. your own testing)
  // Stamp the stable anonymous visitor id on every event. Together with the
  // per-session id + timestamps this is what lets us later reconstruct visitor
  // journeys, link a visitor's sessions (returning behaviour) and map a signup
  // back to the journey that produced it. It is a random per-device id — never a
  // user id or PII — and is already disclosed in the privacy note. Stored inside
  // `props` so no schema/migration is needed and the live tracker can't break.
  const vid = visitorId();
  const enrichedProps = vid ? { ...props, visitorId: vid } : props;
  const payload = JSON.stringify({
    name,
    path: opts.path ?? window.location.pathname,
    props: enrichedProps,
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

const ENTRY_KEY = "hl.entry"; // sessionStorage: has this session recorded its entry context yet?

// Acquisition context for the SESSION ENTRY only — the external referrer and any
// UTM params on the landing URL — so each journey can later be attributed to how
// it began (channel / campaign). Captured once per session; internal hops add no
// acquisition signal (the landing page, exit page and page-to-page transitions
// are all derived later from the ordered page_view sequence, not re-collected
// here). Deliberately lightweight — only fields that power a planned metric.
function entryContext(): Record<string, unknown> {
  try {
    if (sessionStorage.getItem(ENTRY_KEY)) return {};
    sessionStorage.setItem(ENTRY_KEY, "1");
    const out: Record<string, unknown> = { entry: true };
    // External referrer only — a same-origin referrer is just the previous page,
    // which the page_view sequence already captures.
    const ref = document.referrer || "";
    if (ref && !ref.startsWith(window.location.origin)) out.referrer = ref.slice(0, 300);
    const q = new URLSearchParams(window.location.search);
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
      const v = q.get(k);
      if (v) out[k] = v.slice(0, 120);
    }
    return out;
  } catch {
    return {};
  }
}

// Page view — reports whether this is the visitor's first-ever session (returning
// signal) and, on the session's entry page only, the acquisition context above.
export function trackPageView(): void {
  if (isOptedOut()) return; // skip before touching the new-visitor flag
  track("page_view", entryContext(), { isNew: isNewVisitor() });
}

// Engagement for a page: time on page (seconds) + max scroll depth (%). Fired
// once per page when the visitor leaves it. Path is passed explicitly because by
// the time this fires the URL may already point at the next page.
export function trackEngagement(seconds: number, scrollPct: number, path: string): void {
  if (isOptedOut()) return;
  if (seconds < 2) return; // ignore instant bounces — no meaningful dwell
  track("engagement", { seconds, scrollPct: Math.min(100, Math.max(0, Math.round(scrollPct))) }, { path });
}
