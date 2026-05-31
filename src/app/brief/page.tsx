import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buildBrief, shortPost, threadPost } from "@/lib/brief";
import { cycleSummary } from "@/lib/cycleSummary";
import { CopyPostButtons } from "@/components/CopyPostButtons";
import { BriefSignup } from "@/components/BriefSignup";
import { DataBadge } from "@/components/DataBadge";
import { TodayVsPriorCycles } from "@/components/TodayVsPriorCycles";
import { WhatHappenedNext } from "@/components/WhatHappenedNext";
import { LastUpdated } from "@/components/LastUpdated";
import { DAYS_TO_NEXT_HALVING } from "@/lib/btcData";
import { fmtPct, fmtUsd } from "@/lib/format";

export const metadata = {
  title: "Daily Bitcoin Cycle Brief — halving.lens",
  description: "A daily, plain-English summary of where Bitcoin sits in the halving cycle.",
};

export default function BriefPage() {
  const b = buildBrief();
  const s = cycleSummary();
  const post = shortPost();
  const thread = threadPost();

  return (
    <div className="space-y-12">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">
            Bitcoin Cycle Brief
          </span>
          <span className="text-[11px] text-ink-400 font-mono">{b.date}</span>
          <DataBadge status="live-derived" />
        </div>
        <h1 className="font-display text-[30px] sm:text-[38px] lg:text-[48px] font-medium tracking-tightest text-ink-50 leading-[1.08] max-w-3xl">
          {b.headline}
        </h1>
        <div className="mt-4">
          <LastUpdated prefix="Generated" />
        </div>
      </header>

      {/* Snapshot numbers */}
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

      {/* The read */}
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

      {/* Share */}
      <section>
        <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100 mb-2">
          Share today&apos;s brief
        </h2>
        <p className="text-[12.5px] text-ink-400 mb-4 max-w-xl">
          Copy-ready for X — historical context, not advice.
        </p>
        <div className="card p-5 mb-4">
          <pre className="whitespace-pre-wrap font-sans text-[13px] text-ink-200 leading-relaxed">{post}</pre>
        </div>
        <CopyPostButtons post={post} thread={thread} />
      </section>

      {/* The supporting evidence, reused */}
      <TodayVsPriorCycles />
      <WhatHappenedNext />

      <BriefSignup />

      <section>
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft">
          Full cycle dashboard <ArrowUpRight size={14} />
        </Link>
      </section>

      <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">{b.disclaimer}</p>
    </div>
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
