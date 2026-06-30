// HalvingLens Research Findings — the permanent, citable library of original
// discoveries. Each finding receives a permanent HalvingLens Research ID
// (HL-R001, HL-R002, …) that is never reused and is referenced consistently
// across the platform (pages, Daily/Weekly Research, emails, social).
//
// Editorial standard: concise institutional research notes. Evidence first,
// conclusion second. Historical context, not prediction. No hype, no price
// targets, no advice. Every claim is supported by data already inside HalvingLens.
//
// Headline figures are rendered LIVE from the underlying engine where a finding
// declares an `evidence` component, so the cited numbers can never drift from the
// live tools — only the framing and conclusion are authored and fixed.

export type FindingTopic =
  | "Accumulation"
  | "Dynamic DCA"
  | "Distribution"
  | "Sentiment"
  | "Fear & Greed"
  | "ETF"
  | "Drawdowns"
  | "Similar Moments";

export interface FindingRelated {
  label: string;
  href: string;
  kind: "finding" | "tool" | "weekly" | "brief" | "page";
}

export interface FindingMyth {
  myth: string;
  reality: string;
  takeaway: string;
}

// A live-data block to embed inside the "Historical Evidence" section. Keeps a
// permanent note honest: the prose is fixed, the figures recompute from source.
export type FindingEvidence = "dca-threeway";

export interface ResearchFinding {
  id: string; // "HL-R001" — permanent citation ID, never reused
  slug: string; // "hl-r001"
  number: number; // 1
  title: string; // question / paper title
  headline: string; // the conclusion, in one line
  summary: string; // one sentence for cards & meta description
  datePublished: string; // YYYY-MM-DD (fixed once published)
  topics: FindingTopic[];
  keyConclusion: string;
  background: string[];
  methodology: string[];
  evidenceIntro: string[]; // narrative around the live evidence block
  evidence?: FindingEvidence; // live data component, if any
  limitations: string[];
  whyThisMatters: string[];
  myth: FindingMyth;
  related: FindingRelated[];
}

// ── The library (append-only; newest entries get the next free ID) ───────────
export const FINDINGS: ResearchFinding[] = [
  {
    id: "HL-R001",
    slug: "hl-r001",
    number: 1,
    title: "Does Taking Profits Beat Dynamic DCA?",
    headline:
      "Within the assumptions tested, Dynamic DCA produced greater long-term Bitcoin accumulation than a profit-taking strategy.",
    summary:
      "Across Bitcoin's full weekly history, a buy-only Dynamic DCA rule retained more Bitcoin per dollar invested than a distribution strategy that trimmed into overheated conditions — even after the distribution plan reinvested its realised profit.",
    datePublished: "2026-06-30",
    topics: ["Dynamic DCA", "Distribution", "Accumulation"],
    keyConclusion:
      "Across the historical data available, and within the assumptions tested, a buy-only Dynamic DCA rule — sizing each weekly purchase by the Accumulation Index and never selling — retained the largest long-term Bitcoin position and the highest end value per dollar of new money contributed. A distribution variant that trimmed holdings in historically overheated conditions, paid tax on the realised gain, and reinvested the proceeds on later dips recovered most — but not all — of the Bitcoin it gave up. This is an observed historical outcome, not a prediction, recommendation, or claim about the future.",
    background: [
      "Long-term Bitcoin holders face a recurring question: should you ever take profits, or simply keep accumulating? “Sell when it's overheated” is intuitive — but does it actually leave you with more Bitcoin over a full cycle, or less?",
      "HalvingLens already reconstructs a point-in-time Accumulation Index for every week of Bitcoin's history. That lets us test the question directly, on the data, rather than argue it in the abstract.",
      "We compare three mechanical rules over the same window and the same weekly budget: a flat purchase (Standard DCA), a purchase scaled by the historical environment (Dynamic DCA), and a scaled purchase that also trims, taxes, banks and reinvests in overheated conditions (Distribution).",
    ],
    methodology: [
      "The Accumulation Index is reconstructed point-in-time for every week (trailing 200-day and 200-week averages plus drawdown from the running all-time high) so a historical score uses only data an observer would have had at the time — no look-ahead.",
      "All three rules run over the same window (from the first week the 200-week factor is available) and the same base weekly budget, buying at each week's sample price.",
      "Standard DCA buys a flat amount every week. Dynamic DCA scales the weekly buy by the Index band — more when historically cheap, less when overheated — and never sells.",
      "Distribution uses the same buy ladder but, in the overheated band, stops buying and trims a fixed slice of the holding each week: the target trim divided by the average historical length of an overheated stretch.",
      "Each trim's realised profit (over the average-cost basis of the Bitcoin sold) is taxed at a flat illustrative 20%; the net is banked as cash and redeployed into extra buys when the Index returns to attractive-or-cheaper, spread across a typical cheap stretch.",
      "Results are compared per $1,000 of new money the saver actually contributed, so recycled internal profit does not flatter the distribution plan. End value counts Bitcoin held plus any uninvested cash.",
    ],
    evidenceIntro: [
      "The table below recomputes from the live engine over Bitcoin's full weekly history, so the figures stay current as the data updates. The pattern, not any single number, is the finding.",
      "Across every intensity preset tested, the buy-only Dynamic DCA rule ended with the most value per dollar of new money and the largest Bitcoin position. Distribution's reinvestment recovered the large majority of the Bitcoin it sold, but the combination of tax and selling coins that continued to appreciate in a long uptrend left it a step behind simple accumulation.",
    ],
    evidence: "dca-threeway",
    limitations: [
      "Bitcoin's history contains only a handful of cycles. Weekly observations overlap and are highly autocorrelated; they are not independent samples.",
      "The entire record sits within a long secular uptrend. A rule that avoids selling is naturally favoured when the asset trends up over the measured window; a different price path could produce a different ranking.",
      "Capital gains are modelled as a flat 20% of realised profit. This is an illustration, not a tax calculation for any jurisdiction, and ignores allowances, rates, lots and timing rules that materially affect real outcomes.",
      "The trim and redeployment rules are sensible illustrative defaults, not optimised parameters. Outcomes depend on the chosen window, presets and tax assumption.",
      "This is descriptive history of mechanical rules applied to past data. It is not financial advice, not a prediction, and not a statement that one approach is “best” for any individual.",
    ],
    whyThisMatters: [
      "Distribution is not “wrong.” It simply optimises for a different objective than maximum accumulation: it realises gains, raises a cash reserve, and reduces drawdowns along the way.",
      "If the goal is the largest possible long-term Bitcoin position, the historical evidence here favours patient, environment-aware accumulation over trimming and reinvesting.",
      "If the goal is to smooth volatility, lock in some profit, or fund spending, distribution served that purpose — at a measurable cost to the final stack.",
      "The useful takeaway is to match the rule to the objective, and to know the historical trade-off before choosing. That clarity — evidence over opinion — is the point of this note.",
    ],
    myth: {
      myth: "Taking profits always beats buy-and-hold.",
      reality:
        "Across Bitcoin's history, a buy-only Dynamic DCA rule retained the largest long-term position. Trimming into overheated conditions raised cash and cut drawdowns, but gave up Bitcoin even after the profit was reinvested.",
      takeaway: "Profit-taking optimises for a different goal — smoother returns and realised cash — not maximum accumulation.",
    },
    related: [
      { label: "Accumulation Index — run the three-way backtest yourself", href: "/accumulation", kind: "tool" },
      { label: "Morning Research — the daily analyst note", href: "/research", kind: "page" },
      { label: "Weekly Research — the week in context", href: "/weekly", kind: "weekly" },
      { label: "Today's Brief", href: "/brief", kind: "brief" },
    ],
  },
];

// ── Accessors ────────────────────────────────────────────────────────────────
export function allFindings(): ResearchFinding[] {
  return [...FINDINGS].sort((a, b) => b.number - a.number);
}

export function findingBySlug(slug: string): ResearchFinding | null {
  return FINDINGS.find((f) => f.slug === slug.toLowerCase()) ?? null;
}

export function latestFindings(n = 3): ResearchFinding[] {
  return allFindings().slice(0, n);
}

export function findingSlugs(): string[] {
  return FINDINGS.map((f) => f.slug);
}

// All topics that appear across the library, in a stable canonical order.
const TOPIC_ORDER: FindingTopic[] = [
  "Accumulation",
  "Dynamic DCA",
  "Distribution",
  "Sentiment",
  "Fear & Greed",
  "ETF",
  "Drawdowns",
  "Similar Moments",
];
export function findingTopics(): FindingTopic[] {
  const present = new Set<FindingTopic>();
  for (const f of FINDINGS) for (const t of f.topics) present.add(t);
  return TOPIC_ORDER.filter((t) => present.has(t));
}

export function findingStats(): { total: number; latestId: string; firstYear: string } {
  const list = allFindings();
  return {
    total: list.length,
    latestId: list[0]?.id ?? "—",
    firstYear: (FINDINGS[0]?.datePublished ?? "").slice(0, 4),
  };
}

// The next free citation ID — used when a new finding is authored so IDs stay
// monotonic and are never reused.
export function nextFindingId(): string {
  const max = FINDINGS.reduce((m, f) => Math.max(m, f.number), 0);
  return `HL-R${String(max + 1).padStart(3, "0")}`;
}

// Findings that share a topic with the given list (for cross-referencing from
// Daily/Weekly Research, tools and other findings). Excludes a given slug.
export function relatedFindings(topics: FindingTopic[], excludeSlug?: string, limit = 3): ResearchFinding[] {
  const want = new Set(topics);
  return allFindings()
    .filter((f) => f.slug !== excludeSlug && f.topics.some((t) => want.has(t)))
    .slice(0, limit);
}

// Cross-reference a finding from a topic keyword used elsewhere (e.g. a tool page
// referencing "Dynamic DCA"). Returns the single most recent matching finding.
export function findingForTopic(topic: FindingTopic): ResearchFinding | null {
  return allFindings().find((f) => f.topics.includes(topic)) ?? null;
}
