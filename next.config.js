/** @type {import('next').NextConfig} */

// Site-wide security headers. Five are ENFORCED (clickjacking, MIME-sniffing,
// referrer leakage, HTTPS pinning, feature lock-down) and, as of this change,
// the Content-Security-Policy is ENFORCING too (promoted from report-only).
//
// The policy allow-lists exactly what the codebase can load and nothing more:
//   • First-party ('self') for scripts, styles, fonts, XHR/fetch.
//   • 'unsafe-inline' — Next.js App Router hydration + the pre-paint chrome
//     script (layout.tsx) are inline; 'unsafe-eval' is kept from the verified
//     report-only policy to avoid introducing an unverified change.
//   • The three env-gated marketing vendors in src/components/MarketingScripts
//     (Meta Pixel, GA4 / Google Tag Manager, Microsoft Clarity) — their script
//     and any cookie-sync iframe hosts. If their NEXT_PUBLIC_* ids are unset the
//     tags never render, so these entries are simply inert.
//   • Vercel analytics/speed-insights are served same-origin from /_vercel, so
//     'self' already covers them; their beacons ride connect-src https:.
//   • img-src / connect-src keep `https:` so any first- or third-party image
//     beacon or fetch over HTTPS works (blocks only plaintext http).
//
// If a future integration adds a new external origin, add it here (and, while
// validating, you can temporarily switch the header key back to
// `Content-Security-Policy-Report-Only` to log without blocking).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://connect.facebook.net https://www.clarity.ms https://*.clarity.ms",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-src 'self' https://www.facebook.com https://td.doubleclick.net",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  // Pin HTTPS for two years, incl. subdomains (preload-list eligible).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Stop browsers guessing content types (MIME-sniffing XSS vector).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: only same-origin may frame our pages.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Don't leak full URLs (with query strings) to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Turn off powerful features we don't use.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // Enforcing — the allow-list above covers everything the app can load.
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      // "Snapshot" was renamed to "The State of Bitcoin". Permanent (308) so the
      // old URL keeps its SEO equity and never breaks; query strings (e.g.
      // ?presenter=true) are preserved automatically.
      { source: "/snapshot", destination: "/state-of-bitcoin", permanent: true },
      // "Downside scenarios" grew into the two-sided "Historical Price Paths".
      // Permanent redirect preserves the old URL's SEO equity.
      { source: "/downside-scenarios", destination: "/historical-price-paths", permanent: true },
    ];
  },
};

module.exports = nextConfig;
