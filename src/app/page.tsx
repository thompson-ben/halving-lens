import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { CycleSummaryHero } from "@/components/CycleSummaryHero";
import { WhatToWatch } from "@/components/WhatToWatch";
import { WhatChanged } from "@/components/WhatChanged";
import { CycleScorecard } from "@/components/CycleScorecard";
import { StretchPanel } from "@/components/StretchPanel";
import { TodayVsPriorCycles } from "@/components/TodayVsPriorCycles";
import { WhatHappenedNext } from "@/components/WhatHappenedNext";
import { WhatsDifferent } from "@/components/WhatsDifferent";
import { EvidenceDashboard } from "@/components/EvidenceDashboard";
import { BriefSignup } from "@/components/BriefSignup";
import { CycleOverlayChart } from "@/components/CycleOverlayChart";

export default function CycleDashboardPage() {
  return (
    <div className="space-y-14 lg:space-y-20">
      {/* 1. The answer first — Bitcoin Cycle Summary */}
      <CycleSummaryHero />

      {/* 1b. What to watch next — forward-looking signals */}
      <WhatToWatch />

      {/* 1c. What changed since yesterday — the daily habit hook */}
      <WhatChanged />

      {/* 1d. Cycle scorecard — the environment at a glance */}
      <CycleScorecard />

      {/* 2. Was this historically stretched? */}
      <StretchPanel />

      {/* 3. Today vs prior cycles */}
      <TodayVsPriorCycles />

      {/* 4. What happened next historically */}
      <WhatHappenedNext />

      {/* 5. What makes this cycle different */}
      <WhatsDifferent />

      {/* 6. The evidence behind the read */}
      <EvidenceDashboard />

      {/* Daily brief capture */}
      <BriefSignup />

      {/* 7. Deeper links — overlay moat + replay */}
      <section>
        <SectionHeader
          eyebrow="Go deeper"
          title="Every halving cycle, lined up from day zero"
          subtitle="All four cycles drawn on the same axis, aligned to halving day. The evidence behind the read."
          link={{ href: "/cycles", label: "Open full overlay" }}
        />
        <div className="card p-4 sm:p-7 relative">
          <CycleOverlayChart mode="normalized" height={340} />
          <div className="watermark">halving.lens · price · normalised</div>
        </div>
        <Link
          href="/cycles"
          className="sm:hidden mt-4 inline-flex items-center gap-1.5 text-[13px] text-accent"
        >
          Open full overlay <ArrowUpRight size={14} />
        </Link>
      </section>

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
          <div className="watermark">halving.lens · replay</div>
        </Link>
      </section>
    </div>
  );
}

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
