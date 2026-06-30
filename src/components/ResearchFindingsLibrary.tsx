"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { track } from "@/lib/track";
import type { ResearchFinding, FindingTopic } from "@/lib/findings";
import { ResearchFindingCard } from "./ResearchFindingCard";

// Searchable, filterable library of every published Research Finding.

const SORTS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "az", label: "A–Z" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

export function ResearchFindingsLibrary({ findings, topics }: { findings: ResearchFinding[]; topics: FindingTopic[] }) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<FindingTopic | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = findings.filter((f) => {
      if (topic !== "all" && !f.topics.includes(topic)) return false;
      if (!needle) return true;
      const hay = `${f.id} ${f.title} ${f.headline} ${f.summary} ${f.topics.join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
    list = [...list].sort((a, b) => {
      if (sort === "az") return a.title.localeCompare(b.title);
      if (sort === "oldest") return a.number - b.number;
      return b.number - a.number;
    });
    return list;
  }, [findings, q, topic, sort]);

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
            <ResearchFindingCard key={f.id} f={f} />
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
