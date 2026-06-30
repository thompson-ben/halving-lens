import { createHmac } from "crypto";
import { unsubToken } from "./emailToken";
import { absoluteUrl } from "./site";

// Per-recipient email open/click instrumentation. We never store the raw address
// in the analytics store — only a stable salted hash — so engagement can be
// attributed to a subscriber without holding PII in the events table.
//
// Opens are tracked with a 1×1 pixel (inherently "estimated" — Apple Mail
// Privacy Protection and image proxies inflate them). Clicks are tracked with a
// signed redirect and are "confirmed" engagement.

const SECRET =
  process.env.EMAIL_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.ANALYTICS_DASHBOARD_KEY ||
  "halvinglens-dev-secret";

// Stable, privacy-safe per-subscriber analytics id (a hash, never the address).
export function emailHash(email: string): string {
  return createHmac("sha256", SECRET).update("eng:" + email.trim().toLowerCase()).digest("hex").slice(0, 16);
}

export interface EmailTracking {
  openPixel: string; // ready-to-embed <img> html (empty when disabled)
  link: (targetUrl: string, cta: string) => string; // wrap a CTA href for click tracking
}

// Build a tracking context for one recipient + campaign. `campaign` identifies
// the specific email, e.g. "daily-2026-06-30", "weekly-2026-W27", "welcome".
export function emailTracking(email: string, campaign: string): EmailTracking {
  const base = `e=${encodeURIComponent(email)}&t=${unsubToken(email)}&c=${encodeURIComponent(campaign)}`;
  return {
    openPixel: `<img src="${absoluteUrl(`/api/email/open?${base}`)}" width="1" height="1" alt="" style="display:none!important;width:1px;height:1px;max-height:0;max-width:0;overflow:hidden;" />`,
    link: (targetUrl: string, cta: string) =>
      absoluteUrl(`/api/email/click?${base}&cta=${encodeURIComponent(cta)}&u=${encodeURIComponent(targetUrl)}`),
  };
}

// No-op context for previews / admin views / when tracking isn't wanted.
export const NO_EMAIL_TRACKING: EmailTracking = {
  openPixel: "",
  link: (targetUrl: string) => targetUrl,
};
