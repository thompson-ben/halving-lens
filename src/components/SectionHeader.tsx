// Shared section header. Renders an h2 by default — a page must have exactly
// one h1 (its hero/title), so a reusable section header must never emit h1
// (PR132). `as` allows h3 for subsections; styling is class-based and
// identical regardless of tag. Note: currently unimported (the homepage uses
// its own local variant); the API exists so any future import is safe by
// construction.
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  as?: "h2" | "h3";
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        {eyebrow && (
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-1.5">
            {eyebrow}
          </div>
        )}
        <Heading className="font-display text-2xl lg:text-3xl font-semibold text-ink-100 tracking-tight">
          {title}
        </Heading>
        {subtitle && <p className="mt-1.5 text-[13.5px] text-ink-300 max-w-xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
