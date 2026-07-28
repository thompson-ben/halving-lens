"use client";

import { useEffect, useState } from "react";

// The Start Here chapter rail — seven quiet dots on wide screens that echo
// which chapter is on screen. A reading companion, not a completion gauge:
// no percentages, no progress bar, no interaction beyond a jump link. Hidden
// below xl, where the numbered chapter eyebrows carry orientation alone.

const GOLD = "#d9b96a";

export function ChapterRail({ ids, labels }: { ids: string[]; labels: string[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null);
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(ids.indexOf(entry.target.id));
        }
      },
      { rootMargin: "-40% 0px -50% 0px" },
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);

  return (
    <nav
      aria-label="Chapters"
      className="hidden xl:flex flex-col gap-3 fixed right-8 top-1/2 -translate-y-1/2 z-10"
    >
      {ids.map((id, i) => (
        <a
          key={id}
          href={`#${id}`}
          title={labels[i]}
          aria-label={`${labels[i]}${i === active ? " (current)" : ""}`}
          className="block w-2 h-2 rounded-full transition-colors"
          style={{ background: i === active ? GOLD : "rgba(255,255,255,0.14)" }}
        />
      ))}
    </nav>
  );
}
