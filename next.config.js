/** @type {import('next').NextConfig} */

// Site-wide security headers. The five below are ENFORCED immediately — they're
// safe and high-value (clickjacking, MIME-sniffing, referrer leakage, HTTPS
// pinning, feature lock-down).
//
// Content-Security-Policy ships REPORT-ONLY first: it logs violations to the
// browser console without blocking anything, so we can confirm it doesn't break
// the app (Next.js inline hydration, Recharts inline styles, next/og, Vercel
// analytics served from /_vercel) before promoting it to an enforcing
// `Content-Security-Policy`. Flip the header key once the console is clean.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
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
  // See note above — report-only until verified, then promote to enforcing.
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
