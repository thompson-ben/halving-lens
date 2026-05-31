"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// Copy buttons for the X post + thread generated from the daily brief.
export function CopyPostButtons({ post, thread }: { post: string; thread: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton label="Copy post" text={post} />
      <CopyButton label="Copy thread" text={thread.join("\n\n———\n\n")} />
      <a
        href="/og"
        download="halving-lens.png"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[12px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors"
      >
        Download share image
      </a>
    </div>
  );
}

function CopyButton({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — no-op
    }
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-accent/25 bg-accent/[0.08] text-[12px] text-accent hover:bg-accent/[0.14] transition-colors"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}
