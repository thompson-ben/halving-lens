import { editionContent } from "@/lib/emailBrief";
import type { Edition } from "@/lib/research";

// A live, on-theme preview of the actual Daily Brief — NOT a static screenshot.
// It renders today's real edition (editionContent()) in an email-styled frame so
// a visitor sees exactly the kind of thing that lands in their inbox tomorrow.
// Server component, zero client JS and no chart library — it stays lightweight
// above the fold on the paid landing (P1.2 / P1.7). Everything shown is real
// data; nothing is fabricated.
//
// Reusable: pass an `edition` to avoid re-deriving it, or let it call
// editionContent() itself (both are cheap + deterministic for the day).

const GOLD = "#d9b96a";

export function DailyBriefPreview({ edition, label = "What tomorrow morning’s brief looks like" }: { edition?: Edition; label?: string }) {
  const e = edition ?? editionContent();
  const health = e.marketHealth.slice(0, 4);
  const watching = e.watching.slice(0, 3);

  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>{label}</div>

      {/* Email frame */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f15] overflow-hidden shadow-2xl">
        {/* Header bar — sender + subject, mirrors the real email */}
        <div className="px-5 sm:px-7 py-4 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3 text-[11px] text-ink-500">
            <span>
              From <span className="text-ink-300">HalvingLens · brief@halvinglens.com</span>
            </span>
            <span className="hidden sm:inline">Delivered ~8am UK · {e.readMin}-min read</span>
          </div>
          <div className="mt-2 font-display text-[17px] sm:text-[19px] text-ink-50 leading-snug tracking-tight-2">
            {e.subject}
          </div>
        </div>

        <div className="px-5 sm:px-7 py-6 space-y-6">
          {/* Today's cycle position */}
          <section>
            <SectionTag>Today’s cycle position</SectionTag>
            <p className="mt-2 font-display text-[16px] sm:text-[18px] text-ink-100 leading-snug">{e.take}</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] text-ink-500">Context score</span>
              <span className="font-display text-[16px] text-ink-50">{e.contextScore.score}/100</span>
              <span className="text-[11.5px]" style={{ color: GOLD }}>{e.contextScore.label}</span>
            </div>
          </section>

          {/* Scorecard */}
          {health.length > 0 && (
            <section>
              <SectionTag>The scorecard</SectionTag>
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-white/[0.06] bg-white/[0.06] overflow-hidden">
                {health.map((h) => (
                  <div key={h.label} className="bg-[#0b0f15] px-3 py-3.5">
                    <div className="text-[9.5px] uppercase tracking-[0.14em] text-ink-400">{h.label}</div>
                    <div className="mt-1 font-display text-[16px] leading-none" style={{ color: h.color || undefined }}>
                      {h.metric ?? h.value}
                    </div>
                    {h.metric && <div className="mt-1 text-[10.5px] text-ink-500">{h.value}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* What changed */}
          <section>
            <SectionTag>What changed</SectionTag>
            <p className="mt-2 text-[13.5px] text-ink-300 leading-relaxed">{e.oneThing}</p>
          </section>

          {/* Historical context */}
          {e.historicalContext && (
            <section>
              <SectionTag>Historical context</SectionTag>
              <p className="mt-2 text-[13.5px] text-ink-300 leading-relaxed">
                <span className="text-ink-100">Closest past moment: {e.historicalContext.match}</span>{" "}
                <span style={{ color: GOLD }}>({e.historicalContext.similarity}% match)</span>. {e.historicalContext.body}
              </p>
            </section>
          )}

          {/* What to watch */}
          {watching.length > 0 && (
            <section>
              <SectionTag>What to watch next</SectionTag>
              <ul className="mt-2 space-y-1.5">
                {watching.map((w) => (
                  <li key={w.signal} className="flex items-start justify-between gap-3 text-[12.5px]">
                    <span className="text-ink-300">{w.signal}</span>
                    <span className="text-ink-500 shrink-0">{w.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="pt-1 text-[11px] text-ink-500 border-t border-white/[0.06] leading-relaxed">
            A live example — today’s actual edition. Historical context, not a prediction or financial advice.
            Your brief arrives free every morning; unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">{children}</div>;
}
