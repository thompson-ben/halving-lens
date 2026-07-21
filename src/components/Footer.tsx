import Link from "next/link";
import { SOCIAL_LINKS, CONTACT_EMAIL } from "@/lib/socialLinks";

// Site-wide footer (P2.1): premium, restrained, and honest. Publisher identity,
// a subscribe route, real navigation, legal links, and only the live social
// channels. Rendered inside the site chrome, so it's hidden on the deliberately
// chrome-free paid landings (/free, /start), same as the TopBar/Sidebar.

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Research",
    links: [
      { label: "Daily Brief archive", href: "/brief/archive" },
      { label: "Weekly Research", href: "/weekly/archive" },
      { label: "Research library", href: "/research" },
      { label: "Metric library", href: "/metrics" },
    ],
  },
  {
    heading: "Publication",
    links: [
      { label: "About", href: "/about" },
      { label: "Methodology", href: "/methodology" },
      { label: "Hall of Founders", href: "/founders" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Contact", href: `mailto:${CONTACT_EMAIL}` },
    ],
  },
];

export function Footer() {
  const year = new Date().getUTCFullYear();
  return (
    <footer className="border-t border-white/[0.06] mt-16">
      <div className="max-w-[1320px] mx-auto px-8 lg:px-14 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 lg:gap-8">
          {/* Brand + subscribe */}
          <div>
            <div className="font-display text-[18px] font-medium tracking-tight-2 text-ink-100">
              Halvinglens<span className="text-accent">.com</span>
            </div>
            <p className="mt-3 text-[12.5px] text-ink-400 leading-relaxed max-w-xs">
              An independent Bitcoin research publication. Historical cycle context — evidence-led,
              with no hype and no price predictions.
            </p>
            <Link
              href="/#subscribe"
              className="mt-4 inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-accent text-ink-950 text-[12.5px] font-medium hover:bg-accent-soft transition-colors"
            >
              Get the daily brief
            </Link>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <div className="text-[10.5px] uppercase tracking-[0.18em] text-ink-500 mb-3.5">{col.heading}</div>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] text-ink-300 hover:text-accent transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-[11.5px] text-ink-500 leading-relaxed max-w-xl">
            © {year} HalvingLens · Founded and published by Ben Thompson. Educational historical
            context — not financial advice, not a prediction, no price targets.
          </p>
          <div className="flex items-center gap-4 text-[12px]">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer me"
                className="text-ink-400 hover:text-accent transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
