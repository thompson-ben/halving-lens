import { emailHeroImage, heroDateSlugs } from "@/lib/emailHeroImage";

// Per-day hero image for the daily/weekly emails: /email/chart/2026-07-04.
// A PATH segment (not a ?query) + generateStaticParams makes each day a prebuilt
// STATIC asset — the same pattern as the research-finding card images, which
// render reliably behind Apple/Gmail image proxies. The [d] value is only a
// cache-buster (the image content comes from the committed snapshot); it's never
// read here. The two-week window guarantees the send-day's date is prebuilt on
// the previous day's deployment (the one live when the morning email is sent).
export const runtime = "nodejs";
export const dynamic = "force-static";
export const dynamicParams = true; // out-of-window dates still render (rare)

export function generateStaticParams() {
  return heroDateSlugs();
}

export function GET() {
  return emailHeroImage();
}
