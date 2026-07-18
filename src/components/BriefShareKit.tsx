"use client";

import { useState } from "react";
import { Link2, Check, Quote, ImageDown } from "lucide-react";
import { track } from "@/lib/track";

// Compact "cite & share" row for an Evidence Brief. Deliberately lighter than the
// full finding share kit — the micro-format wants one citation, one link, and the
// share image, not a carousel. Text only; nothing is auto-posted.

export function BriefShareKit({
  briefId,
  question,
  url,
  ogImagePath,
}: {
  briefId: string;
  question: string;
  url: string;
  ogImagePath: string;
}) {
  const [copied, setCopied] = useState<"link" | "cite" | null>(null);
  const citation = `HalvingLens Research, ${briefId} — “${question}” · ${url}`;
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(`${question} (${briefId}, HalvingLens Research)`);

  const copy = async (what: "link" | "cite", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      track("brief_share", { brief: briefId, via: `copy_${what}` });
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const btn =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[12px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button onClick={() => copy("cite", citation)} className={btn}>
        {copied === "cite" ? <Check size={13} /> : <Quote size={13} />}
        {copied === "cite" ? "Citation copied" : "Copy citation"}
      </button>
      <button onClick={() => copy("link", url)} className={btn}>
        {copied === "link" ? <Check size={13} /> : <Link2 size={13} />}
        {copied === "link" ? "Copied" : "Copy link"}
      </button>
      <a
        href={`https://twitter.com/intent/tweet?text=${t}&url=${u}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("brief_share", { brief: briefId, via: "x" })}
        className={btn}
      >
        Share to X
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("brief_share", { brief: briefId, via: "linkedin" })}
        className={btn}
      >
        Share to LinkedIn
      </a>
      <a href={ogImagePath} target="_blank" rel="noopener noreferrer" onClick={() => track("brief_share", { brief: briefId, via: "image" })} className={btn}>
        <ImageDown size={13} /> Share image
      </a>
    </div>
  );
}
