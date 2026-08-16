import { briefIntel, type BriefIntel, type BriefStory } from "@/lib/briefIntel";

// A live, on-theme preview of the ACTUAL Daily Brief — not a static screenshot,
// and (since Programme 1) not the retired legacy edition either.
//
// TRUTH RULE: this component renders the canonical Daily Brief V2 payload
// (briefIntel — the same object briefEmailV2 renders and the same object the
// Cycle Dashboard quotes), in the same founder-approved hierarchy the email
// uses:
//
//   MASTHEAD → VERDICT → PRIMARY STORY → max ONE secondary → STATE OF THE
//   CYCLE → the Cycle Dashboard CTA
//
// Every sentence, number, state word, since-date and subject below is quoted
// verbatim from that payload. Nothing here computes intelligence, mints a
// threshold, or re-words the product for marketing: if the sentence isn't on
// the payload, it isn't on this page.
//
// Before this, the acquisition surfaces rendered the RETIRED edition engine
// under labels like "today's actual brief" — a retired composite score, a
// four-box scorecard and a forward-looking watch section, none of which exist
// in the delivered product.
//
// NO ROUTES AWAY: the paid landing deliberately offers no exit before signup,
// so the email's own links are rendered as inert text. This is a preview of an
// email, not the email.
//
// FALLBACK: if the canonical payload cannot be produced, the component renders
// NOTHING rather than a placeholder or a stale edition (the CDOE rule).
// Server component, zero client JS.

const GOLD = "#d9b96a";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** The canonical payload, or null on any failure — never a placeholder. */
function safeIntel(): BriefIntel | null {
  try {
    return briefIntel();
  } catch {
    return null;
  }
}

export function DailyBriefPreview({ label = "What tomorrow morning’s brief looks like" }: { label?: string } = {}) {
  const b = safeIntel();
  if (!b) return null;

  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.22em] mb-4" style={{ color: GOLD }}>{label}</div>

      {/* Email frame — sender + real subject line, mirroring the real email */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f15] overflow-hidden shadow-2xl">
        <div className="px-5 sm:px-7 py-4 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3 text-[11px] text-ink-500">
            <span>
              From <span className="text-ink-300">HalvingLens · brief@halvinglens.com</span>
            </span>
            <span className="hidden sm:inline">Delivered ~8am UK · {prettyDate(b.asOf)}</span>
          </div>
          <div className="mt-2 font-display text-[17px] sm:text-[19px] text-ink-50 leading-snug tracking-tight-2">
            {b.subject}
          </div>
        </div>

        <div className="px-5 sm:px-7 py-6 space-y-6">
          {/* 1 · The verdict — the whole checked market, in one line */}
          <section>
            <SectionTag>The verdict</SectionTag>
            <p className="mt-2 font-display text-[21px] sm:text-[25px] text-ink-50 leading-snug tracking-tight-2">
              {b.verdict.activityLabel}.
            </p>
            <p className="mt-2 text-[13.5px] text-ink-300 leading-relaxed">{b.verdict.countsLine}</p>
          </section>

          {/* 2 · The primary story — whichever shape earned the slot today */}
          <StoryCard story={b.story} />

          {/* 3 · Max ONE secondary (the payload enforces the limit) */}
          {b.alsoToday[0] && (
            <section>
              <SectionTag>Also today</SectionTag>
              <p className="mt-2 text-[13.5px] text-ink-300 leading-relaxed">
                {b.alsoToday[0].text} <Inert>More →</Inert>
              </p>
            </section>
          )}

          {/* 4 · State of the cycle — what has NOT changed, and since when */}
          <section>
            <SectionTag>State of the cycle</SectionTag>
            <div className="mt-2">
              {b.states
                .filter((r) => r.available && r.stateLabel)
                .map((r) => (
                  <div
                    key={r.id}
                    className="flex items-start justify-between gap-4 py-2.5 border-b border-white/[0.06] last:border-b-0"
                  >
                    <span className="text-[12.5px] text-ink-500 whitespace-nowrap">{r.label}</span>
                    <span className="text-right">
                      <span className="block text-[13.5px] font-medium text-ink-100">{r.stateLabel}</span>
                      <span className="block mt-0.5 text-[11.5px] text-ink-500">{stateTail(r)}</span>
                    </span>
                  </div>
                ))}
            </div>
          </section>

          {/* 5 · The permanent product CTA, in every edition */}
          <section className="text-center pt-1">
            <div className="text-[12.5px] text-ink-500">{b.cta.label}</div>
            <div
              className="mt-2.5 inline-block rounded-xl px-6 py-3 text-[13.5px] font-medium"
              style={{ background: GOLD, color: "#15120a" }}
            >
              {b.cta.sub} →
            </div>
          </section>

          <p className="pt-1 text-[11px] text-ink-500 border-t border-white/[0.06] leading-relaxed">
            A live example — today’s actual Brief. Historical context, not a prediction or financial advice.
            Your brief arrives free every morning; unsubscribe anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Story shapes — one block per payload kind, same order as the email ──────
function StoryCard({ story: s }: { story: BriefStory }) {
  if (s.kind === "mover") {
    return (
      <Card highlight={!!s.bandWord}>
        <SectionTag>{s.bandWord ? "Something changed" : "The one that moved"}</SectionTag>
        <div className="mt-2 text-[15px] text-ink-300">{s.label}</div>
        <div className="mt-1 flex items-baseline gap-3 flex-wrap">
          <span className="font-display text-[34px] sm:text-[40px] text-ink-50 leading-none tracking-tightest tabular-nums">
            {s.movement}
          </span>
          {s.bandWord && (
            <span className="text-[11.5px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>{s.bandWord}</span>
          )}
        </div>
        <div className="mt-1.5 text-[10.5px] uppercase tracking-[0.18em] text-ink-500">{s.periodLabel}</div>
        <p className="mt-3 text-[13.5px] text-ink-300 leading-relaxed">
          {s.meaning} {s.evidence && <span className="text-ink-500">{s.evidence}.</span>}
        </p>
        <p className="mt-2 text-[12.5px] text-ink-500">
          Now {s.valueLabel}
          {s.stateWord ? ` · ${s.stateWord}` : ""}
          {s.thirtyDay ? ` · ${s.thirtyDay}` : ""}
        </p>
        <div className="mt-3"><Inert>Explore {s.label} →</Inert></div>
      </Card>
    );
  }
  if (s.kind === "state_change") {
    return (
      <Card>
        <SectionTag>A state changed</SectionTag>
        <p className="mt-2 font-display text-[19px] sm:text-[22px] text-ink-50 leading-snug">{s.headline}</p>
        <p className="mt-2 text-[12.5px] text-ink-500">Current reading: {s.currentLabel}</p>
        <div className="mt-3"><Inert>Explore {s.label} →</Inert></div>
      </Card>
    );
  }
  if (s.kind === "etf") {
    return (
      <Card>
        <SectionTag>The story is demand</SectionTag>
        <p className="mt-2 font-display text-[19px] sm:text-[22px] text-ink-50 leading-snug">
          Net {s.nowLine}
          {s.changeLine ? `, against the ${s.changeLine}` : ""}.
        </p>
        {s.contextLine && <p className="mt-3 text-[13.5px] text-ink-300 leading-relaxed">{s.contextLine}</p>}
        {s.concentrationLine && <p className="mt-2 text-[12.5px] text-ink-500">{s.concentrationLine}</p>}
        {s.asOf && <p className="mt-2 text-[11.5px] text-ink-500">Trading-day series · as of {prettyDate(s.asOf)}</p>}
        <div className="mt-3"><Inert>Explore ETF flows →</Inert></div>
      </Card>
    );
  }
  if (s.kind === "quiet_duration") {
    return (
      <Card>
        <SectionTag>The quiet finding</SectionTag>
        <p className="mt-2 font-display text-[19px] sm:text-[22px] text-ink-50 leading-snug">{s.line}</p>
        {s.alsoLine && <p className="mt-2 text-[12.5px] text-ink-500">{s.alsoLine}</p>}
        <div className="mt-3"><Inert>Explore {s.label} →</Inert></div>
      </Card>
    );
  }
  if (s.kind === "quiet_lens") {
    return (
      <Card>
        <SectionTag>The quiet finding · same point, past cycles</SectionTag>
        <p className="mt-2 font-display text-[19px] sm:text-[22px] text-ink-50 leading-snug">{s.sentence}</p>
        <div className="mt-3"><Inert>See the cycle comparison →</Inert></div>
      </Card>
    );
  }
  return (
    <Card>
      <SectionTag>The quiet finding</SectionTag>
      <p className="mt-2 font-display text-[18px] sm:text-[20px] text-ink-50 leading-snug">{s.line}</p>
    </Card>
  );
}

/** The email's state-row tail, composed exactly as briefEmailV2 composes it. */
function stateTail(r: BriefIntel["states"][number]): string {
  return [
    r.detail || "",
    r.sinceDate && !r.sinceIsSeriesStart ? `since ${prettyDate(r.sinceDate)}` : "",
    r.id === "etf" && r.asOf ? `as of ${prettyDate(r.asOf)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function Card({ children, highlight = false }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <section
      className="rounded-xl bg-white/[0.02] p-4 sm:p-5"
      style={{ border: `1px solid ${highlight ? "rgba(217,185,106,0.28)" : "rgba(255,255,255,0.07)"}` }}
    >
      {children}
    </section>
  );
}

// The email carries links here; the preview shows them as inert text so the
// paid landing keeps its no-route-away-before-signup discipline.
function Inert({ children }: { children: React.ReactNode }) {
  return <span className="text-[12.5px] font-medium" style={{ color: GOLD }}>{children}</span>;
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500">{children}</div>;
}
