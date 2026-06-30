// Content engine for Research Findings. Every finding automatically generates a
// cross-channel content pack — Instagram carousel + caption, X thread, LinkedIn
// article, an email teaser, and OpenGraph copy — all stamped with the permanent
// HalvingLens Research ID so the citation travels with the content.
//
// Text only. Nothing is auto-posted; this is a copy-paste kit. Historical
// context, not advice — the compliance voice is baked into the templates.

import type { ResearchFinding } from "./findings";
import { SITE_HOST, absoluteUrl } from "./site";

export interface CarouselSlide {
  kicker: string; // small label, e.g. "MYTH" / "HL-R001"
  title: string;
  body: string;
}

export interface FindingContentPack {
  ogTitle: string;
  ogSubtitle: string;
  instagramCarousel: CarouselSlide[];
  instagramCaption: string;
  xThread: string[];
  linkedin: string;
  emailTeaser: { subject: string; body: string };
}

function url(f: ResearchFinding): string {
  return absoluteUrl(`/research/findings/${f.slug}`);
}

// Myth vs Reality carousel — the recurring social series, reused as the spine of
// the Instagram deck for any finding that carries a myth.
export function findingCarousel(f: ResearchFinding): CarouselSlide[] {
  return [
    { kicker: f.id, title: f.title, body: "HalvingLens Research — historical context, not prediction." },
    { kicker: "MYTH", title: f.myth.myth, body: "The common assumption." },
    { kicker: "REALITY", title: f.myth.reality, body: "What the historical data actually showed." },
    { kicker: "EVIDENCE", title: f.headline, body: "Tested across Bitcoin's full weekly history, within the assumptions stated." },
    { kicker: "TAKEAWAY", title: f.myth.takeaway, body: "Match the rule to the objective." },
    { kicker: "READ THE RESEARCH", title: `${f.id} on ${SITE_HOST}`, body: `${SITE_HOST}/research/findings/${f.slug}` },
  ];
}

export function findingInstagramCaption(f: ResearchFinding): string {
  const tags = ["#Bitcoin", "#BTC", "#research", "#DCA", "#HalvingLens"];
  return [
    `${f.id} — ${f.title}`,
    "",
    `MYTH: ${f.myth.myth}`,
    `REALITY: ${f.myth.reality}`,
    "",
    f.myth.takeaway,
    "",
    `Full research note (${f.id}) → link in bio · ${SITE_HOST}/research/findings/${f.slug}`,
    "Historical context. Not prediction. Not financial advice.",
    "",
    tags.join(" "),
  ].join("\n");
}

export function findingXThread(f: ResearchFinding): string[] {
  const out: string[] = [];
  out.push(`${f.id} — ${f.title}\n\n${f.headline}\n\nA HalvingLens research note. 🧵`);
  out.push(`The myth: ${f.myth.myth}\n\nIntuitive — but does it actually leave you with more Bitcoin over a full cycle?`);
  out.push(
    `We tested three mechanical rules over Bitcoin's full weekly history, same window and budget: flat DCA, Dynamic DCA (scaled by our Accumulation Index), and Distribution (trim + tax + reinvest in overheated conditions).`,
  );
  out.push(`The reality: ${f.myth.reality}`);
  out.push(`Why it matters: ${f.whyThisMatters[0]} ${f.whyThisMatters[3] ?? ""}`.trim());
  out.push(
    `Limitations matter: few cycles, overlapping samples, a long secular uptrend, and a simplified flat tax. This is descriptive history, not a prediction or advice.`,
  );
  out.push(`Full note, methodology and the live evidence table:\n${url(f)}\n\nCite it as ${f.id}.`);
  return out;
}

export function findingLinkedin(f: ResearchFinding): string {
  return [
    `${f.id} · HalvingLens Research`,
    "",
    f.title,
    "",
    f.keyConclusion,
    "",
    `Myth: ${f.myth.myth}`,
    `Reality: ${f.myth.reality}`,
    "",
    "Method, in brief: a point-in-time Accumulation Index drives three mechanical rules over Bitcoin's full weekly history — flat DCA, Dynamic DCA, and a Distribution variant that trims, taxes and reinvests in overheated conditions. All compared per $1,000 of new money contributed.",
    "",
    `Important context: ${f.limitations[1]} ${f.limitations[4]}`,
    "",
    `Read the full research note (${f.id}), including methodology, limitations and a live evidence table:`,
    url(f),
    "",
    "Historical context. Not prediction. Not financial advice.",
  ].join("\n");
}

export function findingEmailTeaser(f: ResearchFinding): { subject: string; body: string } {
  return {
    subject: `New research: ${f.id} — ${f.title}`,
    body: [
      `We've published a new HalvingLens research note.`,
      "",
      `${f.id} — ${f.title}`,
      f.headline,
      "",
      f.summary,
      "",
      `Read the full note, methodology and live evidence: ${url(f)}`,
      "",
      "Historical context. Not prediction. Not financial advice.",
    ].join("\n"),
  };
}

export function findingContentPack(f: ResearchFinding): FindingContentPack {
  return {
    ogTitle: `${f.id} — ${f.title}`,
    ogSubtitle: f.headline,
    instagramCarousel: findingCarousel(f),
    instagramCaption: findingInstagramCaption(f),
    xThread: findingXThread(f),
    linkedin: findingLinkedin(f),
    emailTeaser: findingEmailTeaser(f),
  };
}
