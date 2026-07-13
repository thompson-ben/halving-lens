// Fail-closed resolver for the HMAC signing secret used by the stateless auth
// tokens (magic-link session cookie + OTP hashing). If no real secret is
// configured we THROW in production rather than silently signing with a known
// development literal — otherwise anyone could forge a session cookie for any
// email (including the founder) and impersonate them. In development we keep a
// stable local fallback so the app still runs with no secrets set.
//
// Resolution order matches the historical behaviour so existing deployments that
// set any of these keep working: EMAIL_SECRET → SUPABASE_SERVICE_ROLE_KEY →
// ANALYTICS_DASHBOARD_KEY. Prefer setting a dedicated EMAIL_SECRET.

let warned = false;

export function signingSecret(): string {
  const configured =
    process.env.EMAIL_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.ANALYTICS_DASHBOARD_KEY ||
    "";
  if (configured) return configured;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No signing secret configured — set EMAIL_SECRET (or SUPABASE_SERVICE_ROLE_KEY). " +
        "Refusing to sign auth tokens with a known development secret in production.",
    );
  }

  if (!warned) {
    warned = true;
    console.warn("[signingSecret] using the development fallback secret — set EMAIL_SECRET before deploying.");
  }
  return "halvinglens-dev-secret";
}
