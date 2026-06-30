"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { isSaved, toggleSave } from "@/lib/personalize";
import { getProfile, pushLocalToServer } from "@/lib/profileClient";
import { track } from "@/lib/track";
import { ProfilePrompt } from "./ProfilePrompt";

// Save/favourite research. Works instantly for everyone (local-first). If signed
// in, it syncs to your HalvingLens Profile; if not, it offers — never forces —
// a profile so progress follows you across devices.
export function SaveButton({ kind, title, href }: { kind: string; title: string; href: string }) {
  const [saved, setSaved] = useState(false);
  const [prompt, setPrompt] = useState(false);
  useEffect(() => setSaved(isSaved(href)), [href]);

  const onClick = async () => {
    const now = toggleSave({ kind, title, href });
    setSaved(now);
    track("favourite_toggle", { kind, action: now ? "save" : "unsave" });
    const me = await getProfile();
    if (me.signedIn) void pushLocalToServer();
    else if (now) setPrompt(true); // only offer when saving, not unsaving
  };

  return (
    <>
      <button
        onClick={onClick}
        aria-pressed={saved}
        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors ${
          saved ? "border-accent/40 bg-accent/[0.1] text-accent" : "border-white/[0.08] bg-white/[0.02] text-ink-300 hover:text-ink-100 hover:border-accent/30"
        }`}
      >
        <Bookmark size={13} className={saved ? "fill-current" : ""} />
        {saved ? "Saved" : "Save"}
      </button>
      <ProfilePrompt open={prompt} onClose={() => setPrompt(false)} reason="Saved. Keep it across all your devices." />
    </>
  );
}
