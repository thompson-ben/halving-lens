// The Short Answer card (PR-Q1) — the visually distinct, answer-first unit at
// the top of every question page. Paragraphs arrive PRE-RESOLVED (the page
// resolves evidence tokens server-side); the first paragraph is the stable
// editorial answer that also feeds the FAQPage markup.

const GOLD = "#d9b96a";

export function QuestionAnswerCard({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="card p-6 lg:p-7 border-l-2" style={{ borderLeftColor: GOLD }}>
      <div className="text-[10.5px] uppercase tracking-[0.18em] mb-3" style={{ color: GOLD }}>
        Short answer
      </div>
      <div className="space-y-3.5">
        {paragraphs.map((p, i) => (
          <p key={i} className={`leading-relaxed ${i === 0 ? "text-[15px] lg:text-[16px] text-ink-100" : "text-[13.5px] lg:text-[14px] text-ink-300"}`}>
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
