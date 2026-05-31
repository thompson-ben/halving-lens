import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  buildBrief,
  shortPost,
  threadPost,
  linkedinPost,
  etfInsight,
  sentimentInsight,
  cycleInsight,
  type Insight,
} from "@/lib/brief";
import { cycleSummary, whatChanged } from "@/lib/cycleSummary";
import { priorBrief } from "@/lib/briefArchive";
import { CopyPostButtons } from "@/components/CopyPostButtons";
import { BriefSignup } from "@/components/BriefSignup";
import { WhatToWatch } from "@/components/WhatToWatch";
import { WhatChanged } from "@/components/WhatChanged";
import { DataBadge } from "@/components/DataBadge";
import { TodayVsPriorCycles } from "@/components/TodayVsPriorCycles";
import { WhatHappenedNext } from "@/components/WhatHappenedNext";
import { CycleOverlayChart } from "@/components/CycleOverlayChart";
import { LastUpdated } from "@/components/LastUpdated";
import { DAYS_TO_NEXT_HALVING } from "@/lib/btcData";
import { fmtPct, fmtUsd } from "@/lib/format";

// The full daily brief, shared by /brief (today) and /brief/[date] (permalink).
export function BriefBody({ dateLabel }: { dateLabel?: string }) {
  const b = buildBrief();
  const s = cycleSummary();
  const changed = whatChanged(priorBrief());
  const post = shortPost(changed.available ? changed.items.map((i) => ({ area: i.area, summary: i.summary })) : undefined);
  const thread = threadPost();
  const linkedin = linkedinPost();

  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">
            Bitcoin Cycle Brief
          </span>
          <span className="text-[11px] text-ink-400 font-mono">{dateLabel ?? b.date}</span>
          <DataBadge status="live-derived" />
        </div>
        <h1 className="font-display text-[30px] sm:text-[38px] lg:text-[48px] font-medium tracking-tightest text-ink-50 leading-[1.08] max-w-3xl">
          {b.headline}
        </h1>
        <div className="mt-4">
          <LastUpdated prefix="Generated" />
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Stat label="BTC price" value={fmtUsd(s.price)} />
        {s.change24h != null ? (
          <Stat label={`${s.changeLabel} change`} value={fmtPct(s.change24h, 1)} tone={s.change24h} />
        ) : (
          <Stat label="Days to halving" value={`${DAYS_TO_NEXT_HALVING}`} />
        )}
        <Stat label="Cycle day" value={`${s.cycleDay}`} />
        <Stat label="Through cycle" value={`${s.progressPct}%`} />
      </section>

      <section className="card-glow p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <Block title="Where we are">{s.summary}</Block>
          <Block title="Historical context">{s.support}</Block>
          <Block title="What makes this cycle different">{s.whatsDifferent}</Block>
          <Block title="What to watch next">{s.whatToWatch}</Block>
          <Block title="Conclusion">{b.conclusion}</Block>
        </div>
        <div className="watermark">halving.lens · daily brief</div>
      </section>

      <section>
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100 mb-1.5">
          Chart of the day
        </h2>
        <p className="text-[12.5px] text-ink-400 mb-4 max-w-xl">
          All four cycles, aligned to halving day — price as a multiple of the halving price. The
          flatter current line is the divergence, at a glance.
        </p>
        <div className="card p-4 sm:p-7 relative">
          <CycleOverlayChart mode="normalized" height={320} />
          <div className="watermark">halving.lens · cycle overlay</div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100 mb-4">
          Today&apos;s insights
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <InsightCard insight={cycleInsight()} />
          <InsightCard insight={etfInsight()} />
          <InsightCard insight={sentimentInsight()} />
        </div>
      </section>

      <WhatChanged />

      <WhatToWatch />

      <section>
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100 mb-2">
          Share this brief
        </h2>
        <p className="text-[12.5px] text-ink-400 mb-4 max-w-xl">
          Copy-ready for X and LinkedIn — historical context, not advice.
        </p>
        <div className="card p-5 mb-4">
          <pre className="whitespace-pre-wrap break-words font-sans text-[13px] text-ink-200 leading-relaxed">
            {post}
          </pre>
        </div>
        <CopyPostButtons post={post} thread={thread} linkedin={linkedin} />
      </section>

      <TodayVsPriorCycles />
      <WhatHappenedNext />

      <BriefSignup />

      <section className="flex items-center gap-5 flex-wrap">
        <Link href="/brief/archive" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft">
          Brief archive <ArrowUpRight size={14} />
        </Link>
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft">
          Full cycle dashboard <ArrowUpRight size={14} />
        </Link>
      </section>

      <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">{b.disclaimer}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Link href={insight.href} className="card card-interactive p-6 block group hover:border-accent/25">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-medium text-accent uppercase tracking-[0.16em]">
          {insight.title}
        </h3>
        {!insight.available && (
          <span className="text-[9px] uppercase tracking-wide text-ink-500">soon</span>
        )}
      </div>
      <p className="mt-3 text-[13px] text-ink-200 leading-relaxed">{insight.body}</p>
      <div className="mt-4 inline-flex items-center gap-0.5 text-accent text-[11px] group-hover:gap-1.5 transition-all">
        Go deeper <ArrowUpRight size={11} />
      </div>
    </Link>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-medium text-accent mb-1.5 uppercase tracking-[0.16em]">{title}</h3>
      <p className="text-[14px] text-ink-200 leading-relaxed">{children}</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: number }) {
  const color = tone == null ? "text-ink-50" : tone >= 0 ? "text-signal-green" : "text-signal-red";
  return (
    <div className="bg-[#0b0f15] px-4 py-4">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-1.5 font-mono text-[16px] tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
