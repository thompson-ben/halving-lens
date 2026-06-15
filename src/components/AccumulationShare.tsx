"use client";

import { useState } from "react";
import { Copy, Check, ImageDown } from "lucide-react";
import { track } from "@/lib/track";

// "Copy Summary" + per-channel share for the Accumulation page. Reuses the
// site's copy-button pattern; all strings are generated server-side from the
// live read so nothing is fabricated. Historical-context framing throughout.
export interface AccumulationShareProps {
  summary: string; // the short, paste-anywhere social version
  x: string;
  linkedin: string;
  instagram: string;
  email: string;
}

export function AccumulationShare({ summary, x, linkedin, instagram, email }: AccumulationShareProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <span className="text-[11px] uppercase tracking-[0.16em] text-accent">Share summary</span>
          <CopyButton label="Copy summary" text={summary} event="copy_summary" prominent />
        </div>
        <pre className="text-[12px] text-ink-300 leading-relaxed whitespace-pre-wrap font-sans">{summary}</pre>
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyButton label="Copy for X" text={x} event="copy_post" />
        <CopyButton label="Copy for LinkedIn" text={linkedin} event="copy_linkedin" />
        <CopyButton label="Copy Instagram caption" text={instagram} event="copy_instagram" />
        <CopyButton label="Copy email" text={email} event="copy_email" />
        <a
          href="/accumulation/opengraph-image"
          download="halvinglens-accumulation.png"
          onClick={() => track("share_image", { page: "accumulation" })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[12px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors"
        >
          <ImageDown size={13} /> Download share image
        </a>
      </div>
    </div>
  );
}

function CopyButton({
  label,
  text,
  event,
  prominent,
}: {
  label: string;
  text: string;
  event: string;
  prominent?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      track(event, { page: "accumulation" });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  };
  const base = prominent
    ? "bg-accent text-ink-950 hover:bg-accent-soft"
    : "border border-accent/25 bg-accent/[0.08] text-accent hover:bg-accent/[0.14]";
  return (
    <button onClick={copy} className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors ${base}`}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}
