import { approvedTestimonials } from "@/lib/testimonials";

// Public display of APPROVED testimonials (P6.2). Server component: renders
// nothing until there are approved quotes, so there's never an empty or
// placeholder state. Only the display name + optional role are shown — no email
// or hash.
const GOLD = "#d9b96a";

export async function Testimonials({ limit = 3, heading = "What readers say" }: { limit?: number; heading?: string }) {
  const items = await approvedTestimonials(limit);
  if (items.length === 0) return null;

  return (
    <section>
      <div className="text-[10.5px] uppercase tracking-[0.22em] mb-5" style={{ color: GOLD }}>{heading}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((t) => (
          <figure key={t.id} className="card p-5">
            <blockquote className="text-[13.5px] text-ink-100 leading-relaxed">“{t.quote}”</blockquote>
            <figcaption className="mt-3 text-[12px] text-ink-400">
              {t.displayName}
              {t.role ? <span className="text-ink-500"> · {t.role}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
