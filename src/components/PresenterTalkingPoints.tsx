// A studio "talking points" card for presenter mode — a deterministic running
// order the presenter can read straight down. Every point is passed in from the
// page's live data; this component only lays it out. Historical context, never
// prediction.
export interface TalkingPoint {
  label: string;
  text: string;
}

export function PresenterTalkingPoints({ title, points }: { title: string; points: TalkingPoint[] }) {
  if (!points.length) return null;
  return (
    <section className="card-glow p-5 sm:p-6">
      <div className="text-[11px] uppercase tracking-[0.2em] text-accent mb-3">Talking points · {title}</div>
      <ol className="space-y-3 text-[15px] text-ink-200 leading-snug">
        {points.map((p, i) => (
          <li key={i}>
            <span className="text-ink-500">{p.label} — </span>
            {p.text}
          </li>
        ))}
      </ol>
    </section>
  );
}
