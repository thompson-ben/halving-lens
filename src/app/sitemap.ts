import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { METRICS } from "@/lib/metrics";
import { STORED_BRIEFS } from "@/lib/data/briefs";
import { allEditions } from "@/lib/research";
import { allWeeklies } from "@/lib/weekly";
import { allFindings } from "@/lib/findings";
import { allBriefs } from "@/lib/evidenceBriefs";
import { allNotes } from "@/lib/researchNotes";

// Public routes only — admin/metrics is excluded (noindex), and /start is
// intentionally left out (paid-ad landing, kept out of organic discovery).
const STATIC_PATHS = [
  "/",
  "/state-of-bitcoin",
  "/cycles",
  "/accumulation",
  "/market-health",
  "/similar-moments",
  "/downside-scenarios",
  "/historical-price-paths",
  "/brief",
  "/brief/archive",
  "/research",
  "/research/findings",
  "/research/briefs",
  "/research/notes",
  "/weekly",
  "/weekly/archive",
  "/sentiment",
  "/replay",
  "/metrics",
  "/learn",
  "/about",
  "/methodology",
  "/privacy",
  "/terms",
  "/price",
  "/etf",
  "/halving",
  "/miners",
  "/onchain",
  "/hodl-waves",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Evergreen / informational / legal pages don't change with the daily data
  // refresh, so their lastModified must NOT churn on every deploy (P3.6). Give
  // them a stable "last reviewed" date; bump it only when their content changes.
  const EVERGREEN = new Set(["/about", "/methodology", "/privacy", "/terms", "/learn", "/halving"]);
  const evergreenLastMod = new Date("2026-07-21");

  const staticEntries = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: EVERGREEN.has(path) ? evergreenLastMod : now,
    changeFrequency: (path === "/" || path === "/brief" ? "daily" : "weekly") as
      | "daily"
      | "weekly",
    priority: path === "/" ? 1 : path === "/brief" ? 0.9 : 0.7,
  }));

  const mythsEntry = {
    url: `${SITE_URL}/research/myths`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  };

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

  const researchEntries = allEditions().map((e) => ({
    url: `${SITE_URL}/research/${e.edition}`,
    lastModified: new Date(e.slug),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const weeklyEntries = allWeeklies().map((w) => ({
    url: `${SITE_URL}/weekly/${w.slug}`,
    lastModified: new Date(w.generatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const findingEntries = allFindings().map((f) => ({
    url: `${SITE_URL}/research/findings/${f.slug}`,
    lastModified: new Date(f.datePublished),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const evidenceBriefEntries = allBriefs().map((b) => ({
    url: `${SITE_URL}/research/briefs/${b.slug}`,
    lastModified: new Date(b.datePublished),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const researchNoteEntries = allNotes().map((n) => ({
    url: `${SITE_URL}/research/notes/${n.slug}`,
    lastModified: new Date(n.datePublished),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...staticEntries,
    mythsEntry,
    ...metricEntries,
    ...briefEntries,
    ...researchEntries,
    ...weeklyEntries,
    ...findingEntries,
    ...evidenceBriefEntries,
    ...researchNoteEntries,
  ];
}
