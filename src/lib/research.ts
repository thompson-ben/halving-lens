// Morning Research Library — the data layer over the permanent, git-frozen
// edition archive. Each edition is a self-contained snapshot of that day's
// Daily Research Brief, so a page opened years later shows the exact market
// conditions from that morning. Append-only; never edited by hand.

import { EDITIONS } from "./data/editions";

export interface EditionMarketHealth {
  label: string;
  value: string;
  color: string; // hex
  strength: number; // 1..3 (legacy visual meter; kept for older stored editions)
  metric?: string; // concrete reading, e.g. "15/100", "−$2.1B/wk", "+1.1%"
}

export interface Edition {
  edition: number; // monotonic edition number
  slug: string; // YYYY-MM-DD
  dateLabel: string; // "Sunday 28 June 2026"
  feature: { key: string; day: string; title: string };
  subject: string;
  take: string;
  contextScore: { score: number; label: string; stars: number };
  oneThing: string;
  confidence: { level: string; blurb: string; detail: string };
  marketHealth: EditionMarketHealth[];
  historicalContext: { match: string; similarity: number; body: string } | null;
  whyToday: string;
  analyst: { quote: string; body: string };
  watching: { signal: string; status: string }[];
  memory: string;
  heroNarrative: string;
  readMin: number;
  metrics: {
    price: number;
    fearGreed: number | null;
    accumulationScore: number;
    accumulationBand: string;
    accumulationPercentile: number;
    cycleDay: number;
    etf: string;
    sentiment: string;
  };
  search: string; // lowercased haystack for full-text search
  // Internal-only editorial-variety diagnostic: how fresh each rotated field read
  // versus the previous ~10 editions (0..100, 100 = fully fresh). Never rendered
  // in the email; optional so older persisted editions stay valid.
  freshness?: { subject: number; take: number; oneThing: number; overall: number };
}

// Newest first.
export function allEditions(): Edition[] {
  return [...EDITIONS].sort((a, b) => b.edition - a.edition);
}

export function getEdition(n: number): Edition | null {
  return EDITIONS.find((e) => e.edition === n) ?? null;
}

export function allEditionNumbers(): number[] {
  return EDITIONS.map((e) => e.edition);
}

export interface LibraryStats {
  total: number;
  firstDate: string | null;
  latestDate: string | null;
  latestEdition: number | null;
  avgContextScore: number | null;
  streak: number; // consecutive days up to the latest edition
}

export function libraryStats(): LibraryStats {
  const all = allEditions();
  if (!all.length) return { total: 0, firstDate: null, latestDate: null, latestEdition: null, avgContextScore: null, streak: 0 };
  const dates = all.map((e) => e.slug).sort(); // ascending
  const avg = Math.round(all.reduce((s, e) => s + e.contextScore.score, 0) / all.length);

  // Consecutive-day streak ending at the latest edition.
  let streak = 1;
  const desc = [...dates].reverse();
  for (let i = 1; i < desc.length; i++) {
    const prev = new Date(desc[i - 1] + "T00:00:00Z").getTime();
    const cur = new Date(desc[i] + "T00:00:00Z").getTime();
    if (Math.round((prev - cur) / 86_400_000) === 1) streak++;
    else break;
  }

  return {
    total: all.length,
    firstDate: dates[0],
    latestDate: dates[dates.length - 1],
    latestEdition: all[0].edition,
    avgContextScore: avg,
    streak,
  };
}

// Previous (older) and next (newer) editions by number.
export function adjacentEditions(n: number): { prev: Edition | null; next: Edition | null } {
  const all = allEditions();
  const prev = all.find((e) => e.edition < n) ?? null; // newest-first → first lower number
  const next = [...all].reverse().find((e) => e.edition > n) ?? null;
  return { prev, next };
}

// Editions grouped by calendar month (newest month first; newest edition first
// within each). Powers the timeline view — scroll through Bitcoin history one
// research note per day.
export interface EditionMonth {
  key: string; // YYYY-MM
  label: string; // "June 2026"
  editions: Edition[];
}
export function editionsByMonth(): EditionMonth[] {
  const groups = new Map<string, Edition[]>();
  for (const e of allEditions()) {
    const key = e.slug.slice(0, 7);
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, editions]) => {
      const d = new Date(`${key}-01T00:00:00Z`);
      const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
      return { key, label, editions };
    });
}

// Hand-picked "related research" for an edition — best-effort, deduped.
export function relatedEditions(e: Edition): { label: string; edition: Edition }[] {
  const others = allEditions().filter((x) => x.edition !== e.edition);
  const out: { label: string; edition: Edition }[] = [];
  const seen = new Set<number>();
  const add = (label: string, ed: Edition | undefined) => {
    if (ed && !seen.has(ed.edition)) {
      seen.add(ed.edition);
      out.push({ label, edition: ed });
    }
  };

  add("Highest Context Score", [...others].sort((a, b) => b.contextScore.score - a.contextScore.score)[0]);
  add(
    "Another Similar Moment",
    others.find((x) => x.feature.key === "similar"),
  );
  add(
    "A previous Extreme Fear reading",
    others.find((x) => /extreme fear/i.test(x.metrics.sentiment)),
  );
  add(
    "Latest Week Ahead",
    others.find((x) => x.feature.key === "weekahead"),
  );
  add(
    "Closest historical context",
    [...others].sort((a, b) => Math.abs(a.contextScore.score - e.contextScore.score) - Math.abs(b.contextScore.score - e.contextScore.score))[0],
  );

  return out.slice(0, 4);
}
