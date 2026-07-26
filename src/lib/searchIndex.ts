// Site search index (PR139) — a compact, server-built list of everything the
// TopBar search can jump to. Built once per server process from the same
// sources the site already renders (nav, metric library, research corpus), so
// it can never drift from what actually exists. Titles and paths only — a few
// kilobytes serialised into the layout, no client data fetching, no backend
// search infrastructure.

import { NAV_SECTIONS } from "@/components/navItems";
import { METRICS } from "./metrics";
import { allFindings } from "./findings";
import { allWeeklies } from "./weekly";

export interface SearchEntry {
  title: string;
  path: string;
  /** Short group label shown beside the result. */
  group: string;
  /** Extra match terms (aliases, tickers) — matched, never displayed. */
  keywords?: string;
}

// Hand-curated entries for pages that aren't in the nav or any corpus, plus
// alias keywords for what people actually type.
const EXTRAS: SearchEntry[] = [
  { title: "Estimated Mining Cost", path: "/metrics/estimated-mining-cost", group: "Metric", keywords: "cost of production mining cost electricity" },
  { title: "Reference Prices", path: "/state-of-bitcoin", group: "The State of Bitcoin", keywords: "realised realized price 200 day moving average mining cost four reference prices" },
  { title: "Research myths", path: "/research/myths", group: "Research", keywords: "myth debunk" },
  { title: "Research timeline", path: "/research/timeline", group: "Research" },
  { title: "Evidence briefs", path: "/research/briefs", group: "Research" },
  { title: "Research notes", path: "/research/notes", group: "Research" },
  { title: "Daily brief archive", path: "/brief/archive", group: "Daily brief" },
  { title: "Weekly archive", path: "/weekly/archive", group: "Weekly Research" },
  { title: "The Journal archive", path: "/journal/archive", group: "The Journal" },
  { title: "About HalvingLens", path: "/about", group: "Publication" },
  { title: "Methodology", path: "/methodology", group: "Publication", keywords: "how it works data sources" },
];

let cache: SearchEntry[] | null = null;

export function searchIndex(): SearchEntry[] {
  if (cache) return cache;
  const out: SearchEntry[] = [];
  const seen = new Set<string>();
  const add = (e: SearchEntry) => {
    if (seen.has(e.path)) return;
    seen.add(e.path);
    out.push(e);
  };

  // Navigation (skip coming-soon stubs — search should never dead-end).
  for (const section of NAV_SECTIONS) {
    if (section.label === "Coming soon") continue;
    for (const item of section.items) add({ title: item.label, path: item.href, group: section.label });
  }

  for (const e of EXTRAS) add(e);

  // Metric library — names people type into a "jump to metric" box.
  for (const m of METRICS) {
    add({ title: m.name, path: `/metrics/${m.slug}`, group: "Metric", keywords: `${m.short} ${m.slug.replace(/-/g, " ")}` });
  }

  // Research findings (titled, high-value) and weekly editions (recent 12 —
  // older editions remain reachable via the archives above).
  for (const f of allFindings()) {
    add({ title: f.title, path: `/research/findings/${f.slug}`, group: "Research finding", keywords: f.slug });
  }
  for (const w of allWeeklies().slice(0, 12)) {
    add({ title: `Weekly Research — ${w.slug}`, path: `/weekly/${w.slug}`, group: "Weekly Research" });
  }

  cache = out;
  return cache;
}
