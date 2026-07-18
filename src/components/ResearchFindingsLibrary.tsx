"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { track } from "@/lib/track";
import type { ResearchFinding, FindingTopic } from "@/lib/findings";
import { findingBadges, findingLeaders } from "@/lib/researchBadges";
import { ResearchFindingCard } from "./ResearchFindingCard";

// Searchable, filterable library of every published Research Finding. Rankings
// (Most read / Most shared) come from real first-party analytics passed in as
// `engagement` — no fabricated numbers; with no data yet they fall back to newest.

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "read", label: "Most read" },
  { key: "shared", label: "Most shared" },
  { key: "pick", label: "Editor's Pick" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

interface Engagement {
  views: number;
  shares: number;
}

export function ResearchFindingsLibrary({
  findings,
  topics,
  engagement = {},
  todayISO,
}: {
  findings: ResearchFinding[];
  topics: FindingTopic[];
  engagement?: Record<string, Engagement>;
  todayISO: string;
}) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<FindingTopic | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const eng = (slug: string): Engagement => engagement[slug] ?? { views: 0, shares: 0 };
  const leaders = useMemo(() => findingLeaders(engagement), [engagement]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = findings.filter((f) => {
      if (topic !== "all" && !f.topics.includes(topic)) return false;
      if (!needle) return true;
      const hay = `${f.id} ${f.title} ${f.headline} ${f.summary} ${f.topics.join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
    // Newest is the tiebreaker for every sort, so empty analytics → sensible order.
    list = [...list].sort((a, b) => {
      if (sort === "read") return eng(b.slug).views - eng(a.slug).views || b.number - a.number;
      if (sort === "shared") return eng(b.slug).shares - eng(a.slug).shares || b.number - a.number;
      if (sort === "pick") return Number(!!b.editorsPick) - Number(!!a.editorsPick) || b.number - a.number;
      return b.number - a.number;
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findings, q, topic, sort, engagement]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (e.target.value.length === 3) track("findings_search", { q: e.target.value });
            }}
            placeholder="Search research…"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[13px] text-ink-100 placeholder:text-ink-500 focus:outline-none focus:border-accent/40"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setSort(s.key);
                track("findings_sort", { sort: s.key });
              }}
              className={`px-2.5 py-1.5 rounded-md text-[12px] transition-colors ${
                sort === s.key ? "bg-accent/15 text-accent" : "text-ink-400 hover:text-ink-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <TopicChip active={topic === "all"} onClick={() => setTopic("all")}>
          All
        </TopicChip>
        {topics.map((t) => (
          <TopicChip
            key={t}
            active={topic === t}
            onClick={() => {
              setTopic(t);
              track("findings_filter", { topic: t });
            }}
          >
            {t}
          </TopicChip>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="mt-8 text-[13px] text-ink-400">No findings match that search yet.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((f) => (
            <ResearchFindingCard
              key={f.id}
              f={f}
              badges={findingBadges(f, { engagement, leaders, todayISO })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[11.5px] border transition-colors ${
        active ? "border-accent/40 bg-accent/10 text-accent" : "border-white/[0.08] text-ink-400 hover:text-ink-200"
      }`}
    >
      {children}
    </button>
  );
}
