// Auction-site connector. Polls structured feeds (RSS today; sitemap
// polling possible later) from auction houses and ingests lots into the
// discovery queue with `platform: "auction"`.
//
// Bring a Trailer is the only major auction house with a public RSS
// feed today (https://bringatrailer.com/feed/). RM Sotheby's, Mecum,
// Barrett-Jackson and Cars & Bids will require sitemap polling or
// structured JSON endpoints — future work, slot them under
// `AUCTION_SOURCES` below as we extend support.
//
// The module deliberately keeps its own feed reader rather than importing
// the RSS module — auction items get year-from-title extraction and a
// distinct house attribution that the generic RSS module shouldn't carry.

import Parser from "rss-parser";
import { env } from "./env";

export type AuctionItem = {
  feedUrl: string;
  house: string;
  url: string;
  title: string;
  summary?: string;
  thumbnailUrl?: string;
  year?: number;
  pubDate?: string;
};

const parser = new Parser({
  timeout: 8_000,
  headers: {
    "User-Agent": "SupercarContentEngine/0.1 (+https://github.com/) auction sync",
  },
});

// Known auction sources with structured feeds. Extend this list as new
// houses publish feeds; per-environment overrides go on
// `Source.config.feeds` keyed by feed URL.
export const KNOWN_FEEDS: Array<{ house: string; feedUrl: string }> = [
  { house: "Bring a Trailer", feedUrl: "https://bringatrailer.com/feed/" },
];

const YEAR_RE = /\b(19[5-9]\d|20[0-4]\d)\b/;

function houseForUrl(url: string): string {
  return KNOWN_FEEDS.find((f) => f.feedUrl === url)?.house ?? new URL(url).hostname;
}

export async function fetchAuctionFeed(feedUrl: string, maxItems = 20): Promise<AuctionItem[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const house = houseForUrl(feedUrl);
    return (feed.items ?? []).slice(0, maxItems).map((item) => {
      const title = item.title ?? "(untitled lot)";
      const yearMatch = title.match(YEAR_RE);
      const enclosureUrl = item.enclosure?.url;
      const mediaContent = (item as { ["media:content"]?: { $?: { url?: string } } })["media:content"];
      return {
        feedUrl,
        house,
        url: item.link ?? "",
        title,
        summary: item.contentSnippet ?? item.content,
        thumbnailUrl: enclosureUrl ?? mediaContent?.$?.url,
        year: yearMatch ? Number(yearMatch[0]) : undefined,
        pubDate: item.isoDate ?? item.pubDate,
      };
    }).filter((i) => i.url);
  } catch {
    return [];
  }
}

const OG_IMAGE_RE = /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i;
const OG_IMAGE_RE_REVERSED = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i;

export async function extractOgImage(articleUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6_000);
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": "SupercarContentEngine/0.1 og:image probe" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const head = new TextDecoder("utf-8", { fatal: false }).decode(
      buf.slice(0, Math.min(buf.byteLength, 64 * 1024)),
    );
    const m = head.match(OG_IMAGE_RE) ?? head.match(OG_IMAGE_RE_REVERSED);
    if (!m) return null;
    return m[1].replace(/&amp;/g, "&");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mock fallback — used when USE_MOCK_DATA is set.
// ---------------------------------------------------------------------------
const MOCK_ITEMS: AuctionItem[] = [
  {
    feedUrl: "https://mock.example/bat",
    house: "Bring a Trailer",
    url: "https://mock.example/bat/1995-ferrari-f50",
    title: "1995 Ferrari F50 — Rosso Corsa over Crema",
    summary: "Documented 8,400-mile F50, classiche-certified, ready for Monterey.",
    thumbnailUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=70",
    year: 1995,
    pubDate: new Date().toISOString(),
  },
  {
    feedUrl: "https://mock.example/rmsothebys",
    house: "RM Sotheby's",
    url: "https://mock.example/rms/2005-porsche-carrera-gt",
    title: "2005 Porsche Carrera GT — 4,200 miles, GT Silver",
    summary: "One of 1,270 examples produced, fully serviced with clutch documentation.",
    thumbnailUrl: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=900&q=70",
    year: 2005,
    pubDate: new Date().toISOString(),
  },
  {
    feedUrl: "https://mock.example/bat",
    house: "Bring a Trailer",
    url: "https://mock.example/bat/1990-ferrari-f40",
    title: "1990 Ferrari F40 — Non-cat, non-adjust, classiche",
    summary: "Rare non-cat, non-adjust F40 with comprehensive maintenance history.",
    thumbnailUrl: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=900&q=70",
    year: 1990,
    pubDate: new Date().toISOString(),
  },
];

export function getMockAuctionItems(): AuctionItem[] {
  return MOCK_ITEMS;
}

export function shouldUseMockAuction(): boolean {
  return env.useMockData;
}
