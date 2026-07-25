import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { SOURCE } from "@/lib/btcData";
import { METRICS } from "@/lib/metrics";
import { STORED_BRIEFS } from "@/lib/data/briefs";
import { allEditions } from "@/lib/research";
import { allWeeklies } from "@/lib/weekly";
import { allFindings } from "@/lib/findings";
import { allBriefs } from "@/lib/evidenceBriefs";
import { allNotes } from "@/lib/researchNotes";

// Public, indexable, canonical, 200-status routes only (PR131). Excluded on
// purpose: /admin/* and /api/* (robots-disallowed), noindex pages (/start,
// /free, /dashboard*, /profile*, /founders, /testimonial, /alerts,
// /derivatives, print views), and /downside-scenarios + /snapshot, which
// 308-redirect — a sitemap must never advertise a redirecting URL.
const STATIC_PATHS = [
  "/",
  "/journal",
  "/journal/archive",
  "/state-of-bitcoin",
  "/cycles",
  "/accumulation",
  "/market-health",
  "/similar-moments",
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
  // Truthful lastModified only (PR131). The site deploys daily, so stamping
  // build time would mark every URL "modified" every day and teach crawlers to
  // ignore the signal. Instead:
  //   - live-data pages    → the data snapshot's fetchedAt (content genuinely
  //                          changes when the sync runs, and only then)
  //   - evergreen pages    → a manually-bumped "last reviewed" date
  //   - archived content   → the item's own publication/generation date
  //   - no truthful date   → omit lastModified entirely
  const snapshotAt = SOURCE.fetchedAt ? new Date(SOURCE.fetchedAt) : undefined;

  // Bump only when these pages' content actually changes.
  const EVERGREEN = new Set(["/about", "/methodology", "/privacy", "/terms", "/learn", "/halving"]);
  const evergreenLastMod = new Date("2026-07-21");

  const lastMod = (d: Date | undefined) => (d ? { lastModified: d } : {});

  // Latest research publication date — the truthful "last changed" for pages
  // derived from the research corpus (/research/myths, /research/timeline).
  const researchDates = [
    ...allFindings().map((f) => f.datePublished),
    ...allBriefs().map((b) => b.datePublished),
    ...allNotes().map((n) => n.datePublished),
  ]
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime());
  const latestResearchAt = researchDates[0];

  const staticEntries = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    ...lastMod(EVERGREEN.has(path) ? evergreenLastMod : snapshotAt),
    changeFrequency: (path === "/" || path === "/brief" ? "daily" : "weekly") as
      | "daily"
      | "weekly",
    priority: path === "/" ? 1 : path === "/brief" ? 0.9 : 0.7,
  }));

  const mythsEntry = {
    url: `${SITE_URL}/research/myths`,
    ...lastMod(latestResearchAt),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  };

  const timelineEntry = {
    url: `${SITE_URL}/research/timeline`,
    ...lastMod(latestResearchAt),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  };

  const productionCostEntry = {
    url: `${SITE_URL}/metrics/cost-of-production`,
    ...lastMod(snapshotAt),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  };

  const metricEntries = METRICS.map((m) => ({
    url: `${SITE_URL}/metrics/${m.slug}`,
    ...lastMod(snapshotAt),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const briefEntries = STORED_BRIEFS.map((b) => ({
    url: `${SITE_URL}/brief/${b.slug}`,
    ...lastMod(b.generatedAt ? new Date(b.generatedAt) : undefined),
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
    lastModified: new Date(f.lastUpdated ?? f.datePublished),
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
    timelineEntry,
    productionCostEntry,
    ...metricEntries,
    ...briefEntries,
    ...researchEntries,
    ...weeklyEntries,
    ...findingEntries,
    ...evidenceBriefEntries,
    ...researchNoteEntries,
  ];
}
