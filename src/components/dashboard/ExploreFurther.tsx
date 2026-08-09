import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

// Explore further (CD3) — a deliberately small set of broader destinations,
// not the navigation reproduced. The intelligence above already deep-links
// contextually (every Watch card and mover row carries its metric's page);
// these four are the high-value next steps that don't hang off a single
// reading. Compact text links, no cards.

const DESTINATIONS = [
  {
    href: "/state-of-bitcoin",
    label: "The State of Bitcoin",
    desc: "The full weekly read — every reading ranked and explained.",
  },
  {
    href: "/market-health",
    label: "Market Health",
    desc: "The composite score behind the header, factor by factor.",
  },
  {
    href: "/similar-moments",
    label: "Similar moments",
    desc: "Days in past cycles that most resemble this one.",
  },
  {
    href: "/historical-price-paths",
    label: "Historical Price Paths",
    desc: "Every cycle's drawdowns and recoveries, aligned.",
  },
] as const;

export function ExploreFurther() {
  return (
    <section aria-label="Explore further">
      <h2 className="eyebrow text-ink-500 mb-3">Explore further</h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {DESTINATIONS.map((d) => (
          <li key={d.href}>
            <Link href={d.href} className="group inline-flex flex-col">
              <span className="inline-flex items-center gap-1 text-body text-ink-100 group-hover:text-accent transition-colors">
                {d.label}
                <ArrowUpRight className="w-3 h-3 text-ink-500 group-hover:text-accent" aria-hidden />
              </span>
              <span className="text-caption text-ink-500">{d.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
