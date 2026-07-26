"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { track } from "@/lib/track";
import type { SearchEntry } from "@/lib/searchIndex";

// TopBar site search (PR139). The index is built server-side (searchIndex.ts)
// and passed in as a prop — this component only filters, ranks and navigates.
// Fully keyboard accessible (combobox/listbox pattern): arrows move, Enter
// follows, Escape closes. Tracked via the PR136 pre-registered events:
// search_impression (first focus per mount), search_query (debounced),
// search_result_click {q, to, rank}.

const MAX_RESULTS = 8;

function score(e: SearchEntry, q: string): number {
  const t = e.title.toLowerCase();
  const k = e.keywords?.toLowerCase() ?? "";
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.split(/\s+/).some((w) => w.startsWith(q))) return 60;
  if (k.split(/\s+/).some((w) => w.startsWith(q))) return 50;
  if (t.includes(q)) return 30;
  if (k.includes(q)) return 20;
  return 0;
}

export function SiteSearch({ entries }: { entries: SearchEntry[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const impressionFired = useRef(false);
  const queryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (query.length < 2) return [];
    return entries
      .map((e) => ({ e, s: score(e, query) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, MAX_RESULTS)
      .map((r) => r.e);
  }, [entries, query]);

  // Debounced query event — one row per settled query, with its result count.
  useEffect(() => {
    if (queryTimer.current) clearTimeout(queryTimer.current);
    if (query.length < 2) return;
    queryTimer.current = setTimeout(() => {
      track("search_query", { q: query.slice(0, 80), results: results.length });
    }, 800);
    return () => {
      if (queryTimer.current) clearTimeout(queryTimer.current);
    };
  }, [query, results.length]);

  // Close on outside click.
  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const follow = (e: SearchEntry, rank: number) => {
    track("search_result_click", { q: query.slice(0, 80), to: e.path, rank });
    setOpen(false);
    setQ("");
    router.push(e.path);
  };

  const showList = open && query.length >= 2;

  return (
    <div ref={rootRef} className="relative flex-1 max-w-md">
      <Search
        size={14}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
        strokeWidth={1.8}
      />
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls="site-search-results"
        aria-activedescendant={showList && results[active] ? `site-search-opt-${active}` : undefined}
        aria-label="Search HalvingLens"
        placeholder="Search — metrics, research, pages…"
        value={q}
        onChange={(ev) => {
          setQ(ev.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => {
          setOpen(true);
          if (!impressionFired.current) {
            impressionFired.current = true;
            track("search_impression", {});
          }
        }}
        onKeyDown={(ev) => {
          if (!showList) return;
          if (ev.key === "ArrowDown") {
            ev.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (ev.key === "ArrowUp") {
            ev.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (ev.key === "Enter" && results[active]) {
            ev.preventDefault();
            follow(results[active], active + 1);
          } else if (ev.key === "Escape") {
            setOpen(false);
          }
        }}
        className="w-full h-10 pl-10 pr-3 rounded-lg bg-white/[0.025] border border-white/[0.04] text-[13px] text-ink-100 placeholder:text-ink-400 focus:outline-none focus:border-accent/30 focus:bg-white/[0.04] transition-colors"
      />

      {showList && (
        <ul
          id="site-search-results"
          role="listbox"
          aria-label="Search results"
          className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/[0.08] bg-ink-850 shadow-card overflow-hidden z-30"
        >
          {results.length === 0 ? (
            <li className="px-4 py-3 text-[12.5px] text-ink-400">
              No matches — try a metric name or page title.
            </li>
          ) : (
            results.map((e, i) => (
              <li key={e.path} role="option" id={`site-search-opt-${i}`} aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => follow(e, i + 1)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                    i === active ? "bg-white/[0.05]" : ""
                  }`}
                >
                  <span className="text-[13px] text-ink-100 truncate">{e.title}</span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-ink-500 shrink-0">
                    {e.group}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
