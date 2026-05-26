// Thin wrapper around RSS / Atom feed parsing. Used by the discovery engine
// to ingest car-blog and editorial feeds without scraping.
//
// `rss-parser` handles both RSS 2.0 and Atom (Carscoops, Motor1, Autoblog…).
// og:image extraction is a best-effort regex against the article HTML — it
// covers the common `<meta property="og:image" content="…">` shape that all
// major editorial CMSes emit, and silently falls back to whatever image the
// feed itself provided.

import Parser from "rss-parser";
import { env } from "./env";

export type RSSItem = {
  feedUrl: string;
  feedTitle: string;
  title: string;
  link: string;
  pubDate?: string;
  author?: string;
  summary?: string;
  thumbnailUrl?: string;
};

export class RSSError extends Error {
  constructor(message: string, public readonly feedUrl?: string) {
    super(message);
    this.name = "RSSError";
  }
}

const parser = new Parser({
  timeout: 8_000,
  headers: {
    "User-Agent": "SupercarContentEngine/0.1 (+https://github.com/) RSS sync",
  },
});

/**
 * Fetch and parse a single feed. Best-effort: returns an empty array on
 * network or parse failure so the caller can continue with the next feed.
 */
export async function fetchFeed(feedUrl: string, maxItems = 20): Promise<RSSItem[]> {
  try {
    const feed = await parser.parseURL(feedUrl);
    const feedTitle = feed.title ?? feedUrl;
    return (feed.items ?? []).slice(0, maxItems).map((item) => {
      const enclosureUrl = item.enclosure?.url;
      const mediaContent = (item as { ["media:content"]?: { $?: { url?: string } } })["media:content"];
      const mediaThumb = (item as { ["media:thumbnail"]?: { $?: { url?: string } } })["media:thumbnail"];
      return {
        feedUrl,
        feedTitle,
        title: item.title ?? "(untitled)",
        link: item.link ?? "",
        pubDate: item.isoDate ?? item.pubDate,
        author: item.creator ?? item.author,
        summary: item.contentSnippet ?? item.content,
        thumbnailUrl: enclosureUrl ?? mediaContent?.$?.url ?? mediaThumb?.$?.url,
      };
    }).filter((i) => i.link);
  } catch {
    return [];
  }
}

const OG_IMAGE_RE = /<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i;
const OG_IMAGE_RE_REVERSED = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i;

/**
 * Best-effort og:image extraction. Returns null on any failure so the caller
 * can fall back to whatever image the feed itself provided.
 */
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
    // og:image always lives in <head>; 64 KB is enough to capture it without
    // streaming the whole article body.
    const buf = await res.arrayBuffer();
    const head = new TextDecoder("utf-8", { fatal: false }).decode(
      buf.slice(0, Math.min(buf.byteLength, 64 * 1024)),
    );
    const m = head.match(OG_IMAGE_RE) ?? head.match(OG_IMAGE_RE_REVERSED);
    if (!m) return null;
    return decodeHtmlEntities(m[1]);
  } catch {
    return null;
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// ---------------------------------------------------------------------------
// Mock fallback — keeps the dashboard demonstrable without network access.
// ---------------------------------------------------------------------------
const MOCK_ITEMS: RSSItem[] = [
  {
    feedUrl: "https://mock.example/carscoops",
    feedTitle: "Carscoops (mock)",
    title: "Pagani Utopia Roadster confirmed — V12 manual, 99 units",
    link: "https://mock.example/pagani-utopia-roadster",
    pubDate: new Date().toISOString(),
    author: "Carscoops",
    summary: "Pagani revealed the open-top Utopia, retaining the AMG V12 and gated manual.",
    thumbnailUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=70",
  },
  {
    feedUrl: "https://mock.example/motor1",
    feedTitle: "Motor1 (mock)",
    title: "Ferrari 296 Speciale spotted testing at Fiorano",
    link: "https://mock.example/ferrari-296-speciale",
    pubDate: new Date().toISOString(),
    author: "Motor1",
    summary: "Heavily-camouflaged 296 mule running fresh aero and a louder exhaust note.",
    thumbnailUrl: "https://images.unsplash.com/photo-1592198084033-aade902d1aae?auto=format&fit=crop&w=900&q=70",
  },
  {
    feedUrl: "https://mock.example/autoblog",
    feedTitle: "Autoblog (mock)",
    title: "Lamborghini Temerario gets first track outing",
    link: "https://mock.example/lamborghini-temerario",
    pubDate: new Date().toISOString(),
    author: "Autoblog",
    summary: "Sant'Agata's Huracan successor takes to the circuit for shakedown laps.",
    thumbnailUrl: "https://images.unsplash.com/photo-1626668893632-6f3a4466d22f?auto=format&fit=crop&w=900&q=70",
  },
];

export function getMockFeedItems(): RSSItem[] {
  return MOCK_ITEMS;
}

export function shouldUseMockRSS(): boolean {
  return env.useMockData;
}
