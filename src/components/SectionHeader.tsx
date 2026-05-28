export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        {eyebrow && (
          <div className="text-[10.5px] uppercase tracking-[0.18em] text-accent mb-1.5">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl lg:text-3xl font-semibold text-ink-100 tracking-tight">
          {title}
        </h1>
        {subtitle && <p className="mt-1.5 text-[13.5px] text-ink-300 max-w-xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
