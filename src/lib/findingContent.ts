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
  // Built entirely from the finding's own fields, so it's correct for every note.
  const out: string[] = [];
  out.push(`${f.id} — ${f.title}\n\n${f.headline}\n\nA HalvingLens research note. 🧵`);
  out.push(`The myth: ${f.myth.myth}`);
  if (f.background[0]) out.push(f.background[0]);
  out.push(`What the history shows: ${f.myth.reality}`);
  out.push(`In short: ${f.summary}`);
  if (f.whyThisMatters[0]) out.push(`Why it matters: ${f.whyThisMatters[0]}`);
  out.push(`The caveats matter: ${f.limitations[0]} This is descriptive history — not a prediction or advice.`);
  out.push(`Full note, methodology and the live evidence:\n${url(f)}\n\nCite it as ${f.id}.`);
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
    f.methodology[0] ? `Method, in brief: ${f.methodology[0]}` : "",
    "",
    `Important context: ${f.limitations[0]}${f.limitations[f.limitations.length - 1] ? ` ${f.limitations[f.limitations.length - 1]}` : ""}`,
    "",
    `Read the full research note (${f.id}), including methodology, limitations and a live evidence table:`,
    url(f),
    "",
    "Historical context. Not prediction. Not financial advice.",
  ]
    .filter((l) => l !== "")
    .join("\n");
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
