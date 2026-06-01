import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { METRICS } from "@/lib/metrics";
import { STORED_BRIEFS } from "@/lib/data/briefs";

// Public routes only — admin/metrics is intentionally excluded (noindex).
const STATIC_PATHS = [
  "/",
  "/cycles",
  "/downside-scenarios",
  "/brief",
  "/brief/archive",
  "/sentiment",
  "/replay",
  "/metrics",
  "/learn",
  "/price",
  "/etf",
  "/halving",
  "/miners",
  "/onchain",
  "/hodl-waves",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: (path === "/" || path === "/brief" ? "daily" : "weekly") as
      | "daily"
      | "weekly",
    priority: path === "/" ? 1 : path === "/brief" ? 0.9 : 0.7,
  }));

  const metricEntries = METRICS.map((m) => ({
    url: `${SITE_URL}/metrics/${m.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const briefEntries = STORED_BRIEFS.map((b) => ({
    url: `${SITE_URL}/brief/${b.slug}`,
    lastModified: b.generatedAt ? new Date(b.generatedAt) : now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticEntries, ...metricEntries, ...briefEntries];
}
