import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function PlannedView({
  eyebrow,
  title,
  description,
  features,
}: {
  eyebrow: string;
  title: string;
  description: string;
  features: { name: string; detail: string; paidAt?: string }[];
}) {
  return (
    <div className="max-w-3xl py-6">
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-2">{eyebrow}</div>
      <h1 className="font-display text-3xl font-semibold text-ink-100 tracking-tight">{title}</h1>
      <p className="mt-3 text-[14px] text-ink-300 max-w-2xl leading-relaxed">{description}</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <div key={f.name} className="card p-5">
            <div className="text-[12.5px] font-medium text-ink-100">{f.name}</div>
            <p className="mt-1 text-[12px] text-ink-400 leading-relaxed">{f.detail}</p>
            {f.paidAt && (
              <div className="mt-3 text-[10.5px] uppercase tracking-wider text-accent/70">
                Paid at · <span className="text-accent">{f.paidAt}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-1.5 text-[13px] text-accent hover:text-accent-soft"
      >
        Back to dashboard <ArrowRight size={14} />
      </Link>
    </div>
  );
}
