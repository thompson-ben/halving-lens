"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { track } from "@/lib/track";

// Copy-link + social share for a research edition. The X/LinkedIn/Facebook
// intents open in a new tab; copy uses the clipboard. All fire a research_share
// event so we can see which editions get shared.
export function ShareButtons({ url, title, edition }: { url: string; title: string; edition: number }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      track("research_share", { edition, via: "copy" });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const links = [
    { label: "X", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}`, via: "x" },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, via: "linkedin" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, via: "facebook" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[12px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors"
      >
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        {copied ? "Copied" : "Copy link"}
      </button>
      {links.map((l) => (
        <a
          key={l.via}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("research_share", { edition, via: l.via })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[12px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors"
        >
          Share to {l.label}
        </a>
      ))}
    </div>
  );
}
