import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { HomeHero } from "@/components/HomeHero";
import { CycleSummaryHero } from "@/components/CycleSummaryHero";
import { WhyCheckToday } from "@/components/WhyCheckToday";
import { WhatChanged } from "@/components/WhatChanged";
import { WhatToWatch } from "@/components/WhatToWatch";
import { CycleScorecard } from "@/components/CycleScorecard";
import { StretchPanel } from "@/components/StretchPanel";
import { WhatHappenedNext } from "@/components/WhatHappenedNext";
import { DownsidePreview } from "@/components/DownsidePreview";
import { WhatsDifferent } from "@/components/WhatsDifferent";
import { EvidenceDashboard } from "@/components/EvidenceDashboard";
import { BriefSignup } from "@/components/BriefSignup";
import { DailyBriefPreview } from "@/components/DailyBriefPreview";
import { SocialProof } from "@/components/SocialProof";
import { editionContent } from "@/lib/emailBrief";
import { CycleOverlayChart } from "@/components/CycleOverlayChart";
import { TrackedSection } from "@/components/TrackedSection";
import { FeatureVote } from "@/components/FeatureVote";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { ResearchFindingCard } from "@/components/ResearchFindingCard";
import { latestFindings } from "@/lib/findings";

export default function CycleDashboardPage() {
  const edition = editionContent();
  return (
    <div className="space-y-14 lg:space-y-20">
      {/* 1. Demonstrate first — dynamic insight + mini cycle-context chart */}
      <TrackedSection id="hero"><HomeHero /></TrackedSection>

      {/* 2. The moat visual — every cycle lined up from day zero */}
      <TrackedSection id="signature-view">
        <section>
          <SectionHeader
            eyebrow="The signature view"
            title="Every halving cycle, lined up from day zero"
            subtitle="All four cycles on the same axis, aligned to halving day — the comparison that doesn't exist anywhere else free."
            link={{ href: "/cycles", label: "Open full overlay" }}
          />
          <div className="card p-4 sm:p-7 relative">
            <CycleOverlayChart mode="normalized" height={340} />
            <div className="watermark">halvinglens.com · price · normalised</div>
          </div>
          <Link
            href="/cycles"
            className="sm:hidden mt-4 inline-flex items-center gap-1.5 text-[13px] text-accent"
          >
            Open full overlay <ArrowUpRight size={14} />
          </Link>
        </section>
      </TrackedSection>

      {/* 3. Show the product — a live example of the daily brief (P4.3) */}
      <TrackedSection id="brief-preview">
        <section>
          <SectionHeader
            eyebrow="The daily brief"
            title="The Bitcoin cycle, explained in one morning brief"
            subtitle="Free, evidence-led, and written without hype or predictions. Here's a live example of what lands in your inbox."
          />
          <DailyBriefPreview edition={edition} label="A live example — today's actual brief" />
          <div className="mt-6">
            <Link
              href="/#subscribe"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent text-ink-950 text-[14px] font-medium hover:bg-accent-soft transition-colors"
            >
              Get the free daily brief <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
      </TrackedSection>

      {/* 2b. The full cycle read — detailed thermometer + numbers */}
      <section>
        <SectionHeader
          eyebrow="Today's full read"
          title="Where Bitcoin sits in the cycle"
          subtitle="The complete read behind the headline — risk level, confidence and how today compares with prior cycles."
        />
        <CycleSummaryHero />
        <FeedbackWidget variant="inline" section="cycle_summary" contentType="homepage_section" />
      </section>

      {/* 3. Why check today — compact daily-habit reminder */}
      <WhyCheckToday />

      {/* 3a. Original research — the publisher signal */}
      <section>
        <SectionHeader
          eyebrow="Original research"
          title="Latest Research Findings"
          subtitle="Permanent, citable discoveries from Bitcoin's history — evidence first, conclusions second. Historical context, not prediction."
          link={{ href: "/research/findings", label: "All research findings" }}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {latestFindings(3).map((f) => (
            <ResearchFindingCard key={f.id} f={f} />
          ))}
        </div>
        <Link
          href="/research/findings"
          className="sm:hidden mt-4 inline-flex items-center gap-1.5 text-[13px] text-accent"
        >
          All research findings <ArrowUpRight size={14} />
        </Link>
      </section>

      {/* 5. What changed since yesterday */}
      <TrackedSection id="what-changed" feedback="what_changed"><WhatChanged /></TrackedSection>

      {/* 6. What to watch next */}
      <TrackedSection id="what-to-watch" feedback="what_to_watch"><WhatToWatch /></TrackedSection>

      {/* 7. Cycle scorecard — the environment at a glance */}
      <TrackedSection id="scorecard" feedback="cycle_scorecard"><CycleScorecard /></TrackedSection>

      {/* 8. Was this historically stretched? */}
      <TrackedSection id="stretch"><StretchPanel /></TrackedSection>

      {/* 9. What happened next historically */}
      <TrackedSection id="what-happened-next"><WhatHappenedNext /></TrackedSection>

      {/* 9b. Downside risk context — kept inline (no dedicated page for it) */}
      <TrackedSection id="downside" feedback="downside_preview"><DownsidePreview /></TrackedSection>

      {/* 10. What makes this cycle different */}
      <TrackedSection id="whats-different"><WhatsDifferent /></TrackedSection>

      {/* 11. The evidence behind the read — kept inline */}
      <TrackedSection id="evidence"><EvidenceDashboard /></TrackedSection>

      {/* Flagship teasers — the modules that DO have a dedicated page (Accumulation,
          Cycle comparison) are linked here instead of stacked inline (P4 simplification). */}
      <TrackedSection id="flagship-teasers">
        <section>
          <SectionHeader
            eyebrow="Go deeper"
            title="The full analysis, on dedicated pages"
            subtitle="Each of these has its own page with the complete read — the homepage keeps things brief."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FLAGSHIP_TEASERS.map((s) => (
              <Link key={s.href} href={s.href} className="card card-interactive p-5 flex items-center justify-between gap-4 group hover:border-accent/30">
                <div>
                  <div className="text-[14px] font-medium text-ink-100">{s.title}</div>
                  <div className="text-[12.5px] text-ink-400 mt-0.5">{s.desc}</div>
                </div>
                <ArrowUpRight size={16} className="text-accent shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      </TrackedSection>

      {/* Daily brief capture */}
      <div id="subscribe" className="scroll-mt-24">
        <BriefSignup />
        <div className="mt-4">
          <SocialProof />
        </div>
      </div>

      <section>
        <Link
          href="/replay"
          className="card-glow card-interactive p-7 lg:p-10 block hover:border-accent/30 group relative overflow-hidden"
        >
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="max-w-2xl">
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-3">
                Signature feature
              </div>
              <h2 className="font-display text-[24px] lg:text-[32px] font-medium tracking-tight-2 text-ink-100 leading-tight">
                Scrub through every halving cycle.
                <br />
                <span className="text-ink-300">Watch how each one played out.</span>
              </h2>
              <p className="mt-4 text-[14px] text-ink-300 leading-relaxed">
                Drag the timeline and watch price move across all four cycles at the same day from
                halving. Compare cycles side-by-side at any point in their arc.
              </p>
            </div>
            <div className="flex items-center gap-3 text-accent group-hover:gap-4 transition-all duration-200">
              <Play size={18} fill="currentColor" />
              <span className="text-[13px] font-medium">Open Cycle Replay</span>
              <ArrowUpRight size={15} />
            </div>
          </div>
          <div className="watermark">halvinglens.com · replay</div>
        </Link>
      </section>

      {/* Validation: vote on what's next + page feedback */}
      <FeatureVote />
      <FeedbackWidget />
    </div>
  );
}

const FLAGSHIP_TEASERS = [
  { title: "Accumulation Index", desc: "How attractive today is versus Bitcoin's whole history.", href: "/accumulation" },
  { title: "Cycle comparison", desc: "Today's cycle against 2012, 2016 and 2020, aligned to halving day.", href: "/cycles" },
];

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  link,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  link?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-6">
      <div>
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">{eyebrow}</div>
        <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          {title}
        </h2>
        <p className="mt-2.5 text-[13.5px] text-ink-300 max-w-xl">{subtitle}</p>
      </div>
      {link && (
        <Link
          href={link.href}
          className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] text-accent hover:text-accent-soft whitespace-nowrap"
        >
          {link.label} <ArrowUpRight size={13} />
        </Link>
      )}
    </div>
  );
}
