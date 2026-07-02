"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Share2 } from "lucide-react";
import { ShareModal } from "./ShareModal";

// The subtle, universal Share button. Sits in the top bar on every content page
// and always shares the current page. Understated by design — a quiet affordance,
// not a call to action.
export function ShareTrigger() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("HalvingLens");

  // Read the live document title when opening (server can't know it).
  useEffect(() => {
    if (open) setTitle(document.title || "HalvingLens");
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Share this page"
        title="Share this page"
        className="inline-flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-ink-300 hover:text-ink-50 hover:border-accent/30 transition-colors"
      >
        <Share2 size={14} strokeWidth={1.9} />
        <span className="hidden sm:inline text-[12px]">Share</span>
      </button>
      {open && <ShareModal path={pathname} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
