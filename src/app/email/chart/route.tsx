import { emailHeroImage } from "@/lib/emailHeroImage";

// Bare, un-dated hero image — prerendered static at build. Used by the web
// Weekly Report preview. Emails use the dated /email/chart/[d] path instead so a
// per-day URL busts email-proxy caches while still hitting a prebuilt asset.
export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET() {
  return emailHeroImage();
}
