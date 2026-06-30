"use client";

// Fires the conversion event to external ad/analytics platforms on a successful
// email signup — Meta Pixel "Lead" + GA4 "sign_up". No-ops if the tags aren't
// loaded (env ids unset). Internal first-party tracking stays in track.ts; this
// is purely the marketing-platform side so Meta/Google can optimise on the
// conversion. Attribution (utm/ref) is passed through for context.

interface FbqFn { (...args: unknown[]): void; }
interface Win {
  fbq?: FbqFn;
  gtag?: (...args: unknown[]) => void;
}

export function fireLead(props: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as Win;
  try {
    w.fbq?.("track", "Lead", { content_name: "daily_research_signup" });
  } catch {
    /* ignore */
  }
  try {
    w.gtag?.("event", "sign_up", { method: "email", ...props });
  } catch {
    /* ignore */
  }
}
