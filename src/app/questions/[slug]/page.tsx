import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { JourneyNext } from "@/components/JourneyNext";
import { TrackedSection } from "@/components/TrackedSection";
import { BriefSignup } from "@/components/BriefSignup";
import { DailyBriefPreview } from "@/components/DailyBriefPreview";
import { QuestionAnswerCard } from "@/components/questions/QuestionAnswerCard";
import { QuestionBlock } from "@/components/questions/QuestionBlock";
import { QuestionCard } from "@/components/questions/QuestionCard";
import { STANDING_CLOSE } from "@/lib/fourReferencePrices";
import { SITE_URL } from "@/lib/site";
import { allQuestions, questionBySlug, relatedQuestions } from "@/lib/questions";
import { QUESTION_BLOCKS } from "@/lib/questions/blocks";
import { evidenceContext, resolveTokens } from "@/lib/questions/evidence";

// Bitcoin Questions — the single template every question renders through
// (PR-Q1). Evidence-dependent prose resolves through the typed token layer;
// live blocks come from the block registry; Article dates are editorial only
// (dateModified never moves on a data refresh — the live evidence carries its
// own dataUpdatedAt). The FAQPage acceptedAnswer is the first, token-free
// paragraph of the Short Answer — the stable editorial answer, exactly as
// rendered (founder amendment 1). No claim is made about rich-result display.

const GOLD = "#d9b96a";

export function generateStaticParams() {
  return allQuestions().map((q) => ({ slug: q.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const q = questionBySlug(params.slug);
  if (!q) return {};
  const title = `${q.question} — answered by the record`;
  return {
    title,
    description: q.description,
    alternates: { canonical: `/questions/${q.slug}` },
    openGraph: { title: q.question, description: q.description, url: `/questions/${q.slug}`, type: "article" },
    twitter: { card: "summary_large_image", title: q.question, description: q.description },
  };
}

export default function QuestionPage({ params }: { params: { slug: string } }) {
  const q = questionBySlug(params.slug);
  if (!q) notFound();

  const ctx = evidenceContext();
  const resolve = (text: string) => resolveTokens(text, ctx.tokens);
  const related = relatedQuestions(q);
  const url = `${SITE_URL}/questions/${q.slug}`;

  // Structured data — Article + FAQPage (stable first paragraph only) +
  // BreadcrumbList. Generated from the registry; never hand-written per page.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: q.question,
      description: q.description,
      datePublished: q.added,
      dateModified: q.revised,
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "HalvingLens", url: SITE_URL },
      publisher: { "@type": "Organization", name: "HalvingLens", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: q.question,
          acceptedAnswer: { "@type": "Answer", text: q.shortAnswer[0] },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "HalvingLens", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Bitcoin Questions", item: `${SITE_URL}/questions` },
        { "@type": "ListItem", position: 3, name: q.question, item: url },
      ],
    },
  ];

  return (
    <div className="space-y-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="pt-2">
        <nav aria-label="Breadcrumb" className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>
          <Link href="/questions" className="hover:text-ink-100 transition-colors">
            Bitcoin Questions
          </Link>
          <span className="text-ink-500"> · {q.category}</span>
        </nav>
        <h1 className="font-display text-[32px] lg:text-[46px] font-medium tracking-tightest text-ink-50 leading-[1.08] max-w-3xl">
          {q.question}
        </h1>
      </header>

      <TrackedSection id="question-answer">
        <QuestionAnswerCard paragraphs={q.shortAnswer.map(resolve)} />
      </TrackedSection>

      <section>
        <h2 className="font-display text-[22px] lg:text-[26px] font-medium text-ink-50 mb-5">What history tells us</h2>
        <div className="space-y-7 max-w-3xl">
          {q.history.map((s) => (
            <div key={s.heading}>
              <h3 className="text-[14.5px] font-medium text-ink-100 mb-2.5">{s.heading}</h3>
              <div className="space-y-3">
                {s.body.map((p, i) => (
                  <p key={i} className="text-[13.5px] text-ink-300 leading-relaxed">
                    {resolve(p)}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <TrackedSection id="question-live-data">
        <section>
          <h2 className="font-display text-[22px] lg:text-[26px] font-medium text-ink-50">
            Today&apos;s data
            <span className="ml-3 align-middle text-[10.5px] font-sans font-normal uppercase tracking-[0.18em] text-ink-500">
              Live · updated {ctx.dataUpdatedAt}
            </span>
          </h2>
          <div className="mt-5 space-y-8">
            {q.blocks.map((id) => (
              <QuestionBlock key={id} def={QUESTION_BLOCKS[id]} dataUpdatedAt={ctx.dataUpdatedAt} />
            ))}
          </div>
        </section>
      </TrackedSection>

      <section>
        <h2 className="font-display text-[22px] lg:text-[26px] font-medium text-ink-50 mb-4">Things to watch</h2>
        <ul className="space-y-2.5 max-w-3xl">
          {q.watch.map((w) => (
            <li key={w.href}>
              <Link href={w.href} className="group flex items-baseline gap-2 text-[13.5px]">
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0 self-center text-ink-500 group-hover:text-ink-200 transition-colors" aria-hidden />
                <span className="text-ink-300 group-hover:text-ink-100 transition-colors leading-relaxed">{w.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-display text-[22px] lg:text-[26px] font-medium text-ink-50 mb-4">Related questions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {related.map((r) => (
            <QuestionCard key={r.slug} entry={r} />
          ))}
        </div>
      </section>

      <TrackedSection id="question-brief-close">
        <section className="space-y-6">
          <DailyBriefPreview />
          <BriefSignup compact />
          <p className="text-[11.5px] text-ink-500 leading-relaxed">
            {STANDING_CLOSE} <span className="text-ink-600">·</span> Editorially reviewed {q.reviewed}.
          </p>
        </section>
      </TrackedSection>

      <JourneyNext from="/questions" />
    </div>
  );
}
