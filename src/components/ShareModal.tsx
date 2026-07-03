"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Copy, Check, Share2, Mail, Linkedin, Download, QrCode } from "lucide-react";
import { track } from "@/lib/track";
import { shareSlugForPath, shortUrl, shareIntentUrl, labelForSlug, type ShareMethod } from "@/lib/shareLinks";

// The premium share modal. Everything shares the current page via its branded
// short link (/r/<slug>) so every channel is measurable. Minimal, professional,
// no gimmicks — QR, copy, native share, X, LinkedIn, email.
export function ShareModal({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const slug = shareSlugForPath(path);
  const link = shortUrl(slug);
  const qrSrc = `/api/qr?slug=${encodeURIComponent(slug)}`;
  const heading = labelForSlug(slug);
  const [copied, setCopied] = useState(false);
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Fire once on open: the modal was opened and a QR was shown for this page.
  useEffect(() => {
    track("share_open", { slug, path });
    track("qr_view", { slug, path });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fire = (method: ShareMethod) => track("share", { slug, path, method });

  const withMethod = (m: string) => `${link}?s=${m}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      fire("copy");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const native = async () => {
    try {
      await navigator.share({ title, url: withMethod("native") });
      fire("native");
    } catch {
      /* cancelled */
    }
  };

  // Render through a portal to <body>. The Share button lives inside the top bar,
  // whose backdrop-filter makes it the containing block for position:fixed — so
  // without a portal the "fixed inset-0" overlay anchors to the 72px top bar and
  // renders off the top of the page instead of covering the viewport.
  if (typeof document === "undefined") return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Share this page"
    >
      <div
        className="w-full sm:max-w-sm bg-[#0d1016] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] sm:max-h-[88dvh] overflow-y-auto overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — sticky so Close is always reachable when the body scrolls */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/[0.06] bg-[#0d1016]">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500">Share</div>
            <div className="text-[14px] text-ink-100 font-medium truncate">{heading}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 -mr-1 rounded-lg text-ink-400 hover:text-ink-100 hover:bg-white/[0.05] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Branded QR */}
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrSrc} alt="Scan to open this page" width={200} height={240} className="w-[150px] sm:w-[184px] h-auto rounded-xl" />
            <a
              href={`${qrSrc}&caption=${encodeURIComponent(`halvinglens.com/r/${slug}`)}`}
              download={`halvinglens-${slug}.svg`}
              onClick={() => fire("qr")}
              className="mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] text-ink-400 hover:text-ink-100 transition-colors"
            >
              <Download size={12} /> Download QR
            </a>
          </div>

          {/* Copy link */}
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-1.5 pl-3">
            <span className="flex-1 min-w-0 truncate font-mono text-[12.5px] text-ink-300">halvinglens.com/r/{slug}</span>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-ink-950 text-[12px] font-medium hover:bg-accent-soft transition-colors shrink-0"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Channels */}
          <div className="grid grid-cols-4 gap-2">
            {canNative && (
              <Channel label="Share" onClick={native} icon={<Share2 size={16} />} />
            )}
            <Channel label="X" href={shareIntentUrl("x", withMethod("x"), title)} onClick={() => fire("x")} icon={<XIcon />} />
            <Channel label="LinkedIn" href={shareIntentUrl("linkedin", withMethod("linkedin"), title)} onClick={() => fire("linkedin")} icon={<Linkedin size={16} />} />
            <Channel label="Email" href={shareIntentUrl("email", withMethod("email"), title)} onClick={() => fire("email")} icon={<Mail size={16} />} />
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-500">
            <QrCode size={12} /> Scan or tap — lands on this exact page.
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

function Channel({ label, icon, href, onClick }: { label: string; icon: React.ReactNode; href?: string; onClick?: () => void }) {
  const cls =
    "flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] text-ink-200 hover:text-ink-50 hover:border-accent/30 transition-colors";
  const body = (
    <>
      {icon}
      <span className="text-[10.5px]">{label}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={cls}>
        {body}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

// X (Twitter) glyph — lucide has no X-brand mark.
function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}
