import Link from "next/link";
import { Wallet, Activity, TrendingDown, ArrowUpRight } from "lucide-react";
import { cycleSummary } from "@/lib/cycleSummary";

// "What makes this cycle different?" — the ETF-era divergence story, in plain
// English, with the live evidence that supports it.
export function WhatsDifferent() {
  const s = cycleSummary();

  const points = [
    {
      icon: Wallet,
      title: "Spot ETF demand",
      body: "The 2024 cycle is the first with US spot Bitcoin ETFs — large, regulated buyers that didn't exist in 2012, 2016 or 2020.",
      href: "/etf",
    },
    {
      icon: TrendingDown,
      title: "Flatter, slower price",
      body: "Price has expanded more gently than the classic four-year rhythm — cooler than prior cycles at the same point.",
      href: "/cycles",
    },
    {
      icon: Activity,
      title: "Sentiment not euphoric",
      body: "Market mood has stayed more measured than the euphoria that marked previous cycle tops.",
      href: "/sentiment",
    },
  ];

  return (
    <section>
      <div className="mb-6">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">
          Cycle divergence
        </div>
        <h2 className="font-display text-[24px] lg:text-[30px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          What makes this cycle different?
        </h2>
        <p className="mt-2.5 text-[14px] text-ink-300 max-w-2xl leading-relaxed">{s.whatsDifferent}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {points.map((p) => (
          <Link
            key={p.title}
            href={p.href}
            className="card card-interactive p-6 block group hover:border-accent/25"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.03] border border-white/[0.05] text-accent">
              <p.icon size={16} strokeWidth={1.8} />
            </span>
            <h3 className="mt-4 font-display text-[16px] font-medium tracking-tight-2 text-ink-100 group-hover:text-accent transition-colors">
              {p.title}
            </h3>
            <p className="mt-2 text-[12.5px] text-ink-300 leading-relaxed">{p.body}</p>
            <div className="mt-4 inline-flex items-center gap-0.5 text-accent text-[11px] group-hover:gap-1.5 transition-all">
              See the data <ArrowUpRight size={11} />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-5 card-glow p-6 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="text-[10px] uppercase tracking-[0.18em] text-accent mb-2">What to watch next</div>
          <p className="text-[14px] text-ink-200 leading-relaxed">{s.whatToWatch}</p>
        </div>
        <div className="watermark">halvinglens.com · what to watch</div>
      </div>
    </section>
  );
}
