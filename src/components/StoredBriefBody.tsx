import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import type { StoredBrief } from "@/lib/brief";
import { CopyPostButtons } from "@/components/CopyPostButtons";
import { ContentPack } from "@/components/ContentPack";
import { DataBadge } from "@/components/DataBadge";
import { fmtPct, fmtUsd } from "@/lib/format";

const HEAT_LABEL: Record<string, string> = {
  cool: "Historically cool",
  neutral: "Neutral",
  heating: "Heating up",
  elevated: "Elevated risk",
  euphoria: "Extreme euphoria",
};
const LEVEL_TONE: Record<string, string> = {
  elevated: "text-signal-amber border-signal-amber/25",
  watch: "text-accent border-accent/20",
  calm: "text-ink-400 border-white/[0.06]",
};

// Renders a persisted historical brief — a real record of that day, not today's
// live data.
export function StoredBriefBody({ brief }: { brief: StoredBrief }) {
  const b = brief;
  return (
    <div className="space-y-12">
      <div>
        <Link
          href="/brief/archive"
          className="inline-flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-accent transition-colors"
        >
          <ArrowLeft size={12} /> Brief archive
        </Link>
      </div>

      <header className="pt-1">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-accent">
            Bitcoin Cycle Brief
          </span>
          <span className="text-[11px] text-ink-400 font-mono">{b.dateLabel}</span>
          <DataBadge status="live-derived" />
          <span className="text-[10px] text-ink-500 uppercase tracking-wide">Archived</span>
        </div>
        <h1 className="font-display text-[30px] sm:text-[38px] lg:text-[48px] font-medium tracking-tightest text-ink-50 leading-[1.08] max-w-3xl">
          {b.headline}
        </h1>
        {b.generatedAt && (
          <p className="mt-4 text-[11px] text-ink-500">
            Generated {format(new Date(b.generatedAt), "d MMM yyyy, HH:mm")} UTC
          </p>
        )}
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
        <Stat label="BTC price" value={fmtUsd(b.price)} />
        {b.changePct != null ? (
          <Stat label={`${b.changeLabel} change`} value={fmtPct(b.changePct, 1)} tone={b.changePct} />
        ) : (
          <Stat label="Cycle day" value={`${b.cycleDay}`} />
        )}
        <Stat label="Since halving" value={fmtPct(b.gainFromHalving, 0)} tone={b.gainFromHalving} />
        <Stat label="Through cycle" value={`${b.progressPct}%`} />
      </section>

      <section className="card-glow p-6 lg:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <Block title="Where we were">{b.summary}</Block>
          <Block title="Historical context">{b.support}</Block>
          <Block title="What made this cycle different">{b.whatsDifferent}</Block>
          <Block title="What to watch next">{b.whatToWatch}</Block>
          <Block title="Conclusion">{b.conclusion}</Block>
        </div>
        <div className="watermark">halvinglens.com · daily brief</div>
      </section>

      {b.insights.length > 0 && (
        <section>
          <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100 mb-4">
            Insights that day
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {b.insights.map((i) => (
              <div key={i.title} className="card p-6">
                <h3 className="text-[11px] font-medium text-accent uppercase tracking-[0.16em]">{i.title}</h3>
                <p className="mt-3 text-[13px] text-ink-200 leading-relaxed">{i.body}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {b.watchSignals.length > 0 && (
        <section>
          <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100 mb-4">
            What to watch (that day)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {b.watchSignals.map((w) => (
              <div key={w.signal} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[14px] font-medium text-ink-100 leading-snug">{w.signal}</h3>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[9.5px] uppercase tracking-wide ${LEVEL_TONE[w.level] ?? LEVEL_TONE.calm}`}>
                    {w.level}
                  </span>
                </div>
                <div className="mt-2.5 text-[13px] text-ink-100">{w.status}</div>
                <div className="mt-3 pt-3 border-t border-white/[0.04] text-[10.5px] text-ink-500">
                  Confidence: <span className="text-ink-300 capitalize">{w.confidence}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {b.content ? (
        <ContentPack pack={b.content} />
      ) : (
        <section>
          <h2 className="font-display text-[20px] font-medium tracking-tight-2 text-ink-100 mb-4">
            The post from that day
          </h2>
          <div className="card p-5 mb-4">
            <pre className="whitespace-pre-wrap break-words font-sans text-[13px] text-ink-200 leading-relaxed">
              {b.shortPost}
            </pre>
          </div>
          <CopyPostButtons post={b.shortPost} thread={[b.shortPost]} />
        </section>
      )}

      <section className="flex items-center gap-5 flex-wrap">
        <Link href="/brief" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft">
          Today&apos;s brief <ArrowRight size={14} />
        </Link>
        <Link href="/brief/archive" className="inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft">
          All briefs <ArrowRight size={14} />
        </Link>
      </section>

      <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-2xl">
        Historical cycle behaviour is not a forecast. This is educational analysis, not financial
        advice. Figures reflect the data at the time the brief was generated.
      </p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      {/* h2, not h3: these blocks sit directly under the page h1, and the
          former h3 produced an h1→h3 outline jump (caught by check-headings
          when the representative archived brief rotated). Styling unchanged. */}
      <h2 className="text-[11px] font-medium text-accent mb-1.5 uppercase tracking-[0.16em]">{title}</h2>
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
