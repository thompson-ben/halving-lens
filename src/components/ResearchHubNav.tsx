import Link from "next/link";

// Cross-link strip tying the three research surfaces into one hub — Morning
// Research (daily), Weekly Research, and Research Findings (original notes).
// Shown at the top of each so a reader can move between them naturally.

const TABS = [
  { href: "/research", label: "Morning Research", blurb: "Daily" },
  { href: "/weekly", label: "Weekly Research", blurb: "Weekly" },
  { href: "/research/findings", label: "Research Findings", blurb: "Original notes" },
  { href: "/research/myths", label: "Myth vs Reality", blurb: "Evidence" },
] as const;

const ACTIVE_HREF = {
  morning: "/research",
  weekly: "/weekly",
  findings: "/research/findings",
  myths: "/research/myths",
} as const;

export function ResearchHubNav({ active }: { active: "morning" | "weekly" | "findings" | "myths" }) {
  const key = ACTIVE_HREF[active];
  return (
    <nav className="flex flex-wrap items-center gap-2 mb-2">
      <span className="text-[10.5px] uppercase tracking-[0.22em] text-ink-500 mr-1">HalvingLens Research</span>
      {TABS.map((t) => {
        const isActive = t.href === key;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-full border text-[12px] transition-colors ${
              isActive
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-white/[0.08] text-ink-300 hover:text-ink-100 hover:border-accent/30"
            }`}
          >
            {t.label}
            <span className="text-[10px] text-ink-500">{t.blurb}</span>
          </Link>
        );
      })}
    </nav>
  );
}
