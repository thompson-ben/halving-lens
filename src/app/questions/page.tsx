import { QuestionCard } from "@/components/questions/QuestionCard";
import { SITE_URL } from "@/lib/site";
import { STANDING_CLOSE } from "@/lib/fourReferencePrices";
import { allQuestions, categoriesWithContent } from "@/lib/questions";

// Bitcoin Questions — the hub (PR-Q1). A permanent research reference
// library, deliberately NOT a blog index: no dates, no authors, no "latest
// posts", no reading times, no trending labels (founder amendment 8).
// Questions shelve under their category headings; only categories with
// published content render.

const DESC =
  "Straight answers to Bitcoin's most-asked questions, from the historical record and live HalvingLens data. We don't predict the future — we explain what history tells us.";

export const metadata = {
  title: "Bitcoin Questions — answered by the record",
  description: DESC,
  alternates: { canonical: "/questions" },
  openGraph: { title: "Bitcoin Questions", description: DESC, url: "/questions", type: "website" },
  twitter: { card: "summary_large_image", title: "Bitcoin Questions", description: DESC },
};

const GOLD = "#d9b96a";

export default function QuestionsHubPage() {
  const shelves = categoriesWithContent();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Bitcoin Questions",
    description: DESC,
    url: `${SITE_URL}/questions`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: allQuestions().map((q, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: q.question,
        url: `${SITE_URL}/questions/${q.slug}`,
      })),
    },
  };

  return (
    <div className="space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="pt-2">
        <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
          Evidence, not opinion
        </div>
        <h1 className="font-display text-[34px] lg:text-[48px] font-medium tracking-tightest text-ink-50 leading-[1.05] max-w-3xl">
          Bitcoin Questions
        </h1>
        <p className="mt-4 text-[14.5px] lg:text-[15.5px] text-ink-300 max-w-2xl leading-relaxed">
          Straight answers from the historical record. We don&apos;t predict the future — we explain what
          history tells us. Every answer combines the measured record with live HalvingLens data, so it
          stays current without ever becoming a forecast.
        </p>
      </header>

      {shelves.map(({ category, questions }) => (
        <section key={category}>
          <h2 className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
            {category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {questions.map((q) => (
              <QuestionCard key={q.slug} entry={q} />
            ))}
          </div>
        </section>
      ))}

      <p className="text-[11.5px] text-ink-500 max-w-3xl leading-relaxed">
        This library grows deliberately: every answer is built on the observed record, with its evidence
        windows and sample sizes stated. {STANDING_CLOSE}
      </p>
    </div>
  );
}
