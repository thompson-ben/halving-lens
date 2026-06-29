"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Edition } from "@/lib/research";
import { track } from "@/lib/track";

const GOLD = "#d9b96a";

function sentimentBand(s: string): string {
  const x = s.toLowerCase();
  if (x.includes("extreme fear")) return "Extreme Fear";
  if (x.includes("fear")) return "Fear";
  if (x.includes("extreme greed")) return "Extreme Greed";
  if (x.includes("greed")) return "Greed";
  return "Neutral";
}

const CONTEXT_BANDS = [
  { key: "80", label: "80+", test: (n: number) => n >= 80 },
  { key: "70", label: "70+", test: (n: number) => n >= 70 },
  { key: "60", label: "60+", test: (n: number) => n >= 60 },
  { key: "40", label: "40+", test: (n: number) => n >= 40 },
  { key: "0", label: "Below 40", test: (n: number) => n < 40 },
];

export function ResearchLibrary({ editions }: { editions: Edition[] }) {
  const [q, setQ] = useState("");
  const [feature, setFeature] = useState<string>("");
  const [sentiment, setSentiment] = useState<string>("");
  const [ctx, setCtx] = useState<string>("");

  const features = useMemo(() => Array.from(new Set(editions.map((e) => e.feature.title))).sort(), [editions]);
  const sentiments = useMemo(() => Array.from(new Set(editions.map((e) => sentimentBand(e.metrics.sentiment)))), [editions]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const band = CONTEXT_BANDS.find((b) => b.key === ctx);
    return editions.filter((e) => {
      if (needle && !e.search.includes(needle)) return false;
      if (feature && e.feature.title !== feature) return false;
      if (sentiment && sentimentBand(e.metrics.sentiment) !== sentiment) return false;
      if (band && !band.test(e.contextScore.score)) return false;
      return true;
    });
  }, [editions, q, feature, sentiment, ctx]);

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
      active ? "border-accent/40 bg-accent/[0.12] text-accent" : "border-white/[0.08] bg-white/[0.02] text-ink-400 hover:text-ink-200"
    }`;

  return (
    <div className="space-y-8">
      {/* Search */}
      <div className="relative max-w-xl">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim().length > 1) track("research_search", { q: q.trim().slice(0, 60) });
          }}
          placeholder="Search every edition — ETF, drawdown, fear, accumulation…"
          aria-label="Search research"
          className="w-full h-11 pl-10 pr-4 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[14px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40"
        />
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <FilterRow label="Feature">
          <button className={chip(feature === "")} onClick={() => setFeature("")}>All</button>
          {features.map((f) => (
            <button key={f} className={chip(feature === f)} onClick={() => { setFeature(f); track("research_filter", { feature: f }); }}>{f}</button>
          ))}
        </FilterRow>
        <FilterRow label="Sentiment">
          <button className={chip(sentiment === "")} onClick={() => setSentiment("")}>All</button>
          {sentiments.map((sName) => (
            <button key={sName} className={chip(sentiment === sName)} onClick={() => { setSentiment(sName); track("research_filter", { sentiment: sName }); }}>{sName}</button>
          ))}
        </FilterRow>
        <FilterRow label="Context Score">
          <button className={chip(ctx === "")} onClick={() => setCtx("")}>All</button>
          {CONTEXT_BANDS.map((b) => (
            <button key={b.key} className={chip(ctx === b.key)} onClick={() => { setCtx(b.key); track("research_filter", { context: b.label }); }}>{b.label}</button>
          ))}
        </FilterRow>
      </div>

      <div className="text-[12px] text-ink-500">{filtered.length} edition{filtered.length === 1 ? "" : "s"}</div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-[13px] text-ink-400 py-10 text-center">No editions match those filters yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <EditionCard key={e.edition} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 flex-wrap">
      <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 pt-2 w-24 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function EditionCard({ e }: { e: Edition }) {
  return (
    <Link
      href={`/research/${e.edition}`}
      className="card card-interactive p-5 flex flex-col gap-3 group hover:border-accent/30"
    >
      <div className="flex items-center justify-between text-[11px]">
        <span className="font-mono" style={{ color: GOLD }}>#{e.edition}</span>
        <span className="text-ink-500">{e.slug}</span>
      </div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-500">{e.feature.title}</div>
      <p className="font-display text-[16px] text-ink-50 leading-snug line-clamp-3">{e.take}</p>
      <div className="mt-auto flex items-center justify-between pt-2">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-[22px] text-ink-50">{e.contextScore.score}</span>
          <span className="text-[11px]" style={{ color: GOLD }}>{"★".repeat(e.contextScore.stars)}</span>
        </div>
        <div className="text-[11px] text-ink-500">{e.confidence.level} · {e.readMin} min</div>
      </div>
    </Link>
  );
}
