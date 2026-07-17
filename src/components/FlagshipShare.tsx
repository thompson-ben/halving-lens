"use client";

import { useState } from "react";
import { Link2, Check, ImageDown, Copy, Share2 } from "lucide-react";
import { track } from "@/lib/track";
import { SITE_HOST } from "@/lib/site";

// A premium, image-first share kit for the flagship pages. The "asset" is the
// page's own OG card (same-origin PNG), so what a viewer shares is the exact
// branded design already established across HalvingLens — no screenshots, no
// editing. Every action degrades gracefully when a browser API is unavailable.
export interface FlagshipShareProps {
  page: string; // e.g. "/state-of-bitcoin"
  label: string; // human page name for the share text
  blurb: string; // one-line share caption
  ogPath?: string; // OG image endpoint (defaults to `${page}/opengraph-image`)
}

export function FlagshipShare({ page, label, blurb, ogPath }: FlagshipShareProps) {
  const url = `https://${SITE_HOST}${page}`;
  const img = ogPath ?? `${page}/opengraph-image`;
  const fileName = `halvinglens${page.replace(/\//g, "-")}.png`;
  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${blurb} — ${label}, halvinglens.com`)}&url=${encodeURIComponent(url)}`;

  const [copiedLink, setCopiedLink] = useState(false);
  const [imgState, setImgState] = useState<"idle" | "copying" | "copied" | "unsupported">("idle");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      track("copy_link", { page });
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const copyImage = async () => {
    // Clipboard image write isn't universally supported; fall back to a note.
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      setImgState("unsupported");
      setTimeout(() => setImgState("idle"), 2500);
      return;
    }
    try {
      setImgState("copying");
      const res = await fetch(img);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
      track("copy_image", { page });
      setImgState("copied");
      setTimeout(() => setImgState("idle"), 2000);
    } catch {
      setImgState("unsupported");
      setTimeout(() => setImgState("idle"), 2500);
    }
  };

  const nativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: `${label} — halvinglens.com`, text: blurb, url });
      track("share", { page, method: "native" });
    } catch {
      /* user dismissed */
    }
  };

  return (
    <section aria-label="Share this page" className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
        {/* The generated asset — the exact branded card that travels with the link */}
        <a
          href={img}
          download={fileName}
          onClick={() => track("share_image", { page })}
          className="group relative block shrink-0 w-full sm:w-[220px] aspect-[1200/630] rounded-lg overflow-hidden border border-white/[0.08] bg-ink-950"
          title="Download the share image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={`${label} share card`} loading="lazy" className="w-full h-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-ink-950/0 group-hover:bg-ink-950/40 transition-colors">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5 text-[11px] text-ink-50 bg-ink-950/70 rounded-full px-2.5 py-1">
              <ImageDown size={12} /> Download
            </span>
          </span>
        </a>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.16em] text-accent">Share this page</div>
          <p className="mt-1 text-[12.5px] text-ink-400 leading-relaxed">
            A ready-made, on-brand image — no screenshots. Post it anywhere, or share the link.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={img}
              download={fileName}
              onClick={() => track("share_image", { page })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-ink-950 text-[12px] font-medium hover:bg-accent-soft transition-colors"
            >
              <ImageDown size={13} /> Download PNG
            </a>
            <button
              onClick={copyImage}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-accent/25 bg-accent/[0.08] text-accent text-[12px] font-medium hover:bg-accent/[0.14] transition-colors"
            >
              {imgState === "copied" ? <Check size={13} /> : <Copy size={13} />}
              {imgState === "copied" ? "Copied" : imgState === "copying" ? "Copying…" : imgState === "unsupported" ? "Use Download" : "Copy image"}
            </button>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[12px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors"
            >
              {copiedLink ? <Check size={13} /> : <Link2 size={13} />}
              {copiedLink ? "Copied" : "Copy link"}
            </button>
            <a
              href={xHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("share", { page, method: "x" })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[12px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors"
            >
              Share on X
            </a>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button
                onClick={nativeShare}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[12px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors"
              >
                <Share2 size={13} /> More
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
