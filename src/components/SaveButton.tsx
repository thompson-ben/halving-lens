"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { isSaved, toggleSave } from "@/lib/personalize";
import { track } from "@/lib/track";

// Save/favourite a piece of research to the local dashboard. No account needed.
export function SaveButton({ kind, title, href }: { kind: string; title: string; href: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => setSaved(isSaved(href)), [href]);

  return (
    <button
      onClick={() => {
        const now = toggleSave({ kind, title, href });
        setSaved(now);
        track("favourite_toggle", { kind, action: now ? "save" : "unsave" });
      }}
      aria-pressed={saved}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors ${
        saved
          ? "border-accent/40 bg-accent/[0.1] text-accent"
          : "border-white/[0.08] bg-white/[0.02] text-ink-300 hover:text-ink-100 hover:border-accent/30"
      }`}
    >
      <Bookmark size={13} className={saved ? "fill-current" : ""} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
