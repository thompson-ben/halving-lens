"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Check, Link2, ImageDown, Package, RefreshCw, Share2 } from "lucide-react";
import { track } from "@/lib/track";
import { makeZip, type ZipEntry } from "@/lib/zip";
import type { FindingContentPack } from "@/lib/findingContent";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Can this device share image files? (iPhone Safari / Android Chrome → the share
// sheet offers "Save N Images" → Photos. Desktop browsers generally can't.)
function canShareImages(): boolean {
  try {
    if (typeof navigator === "undefined" || !navigator.canShare || !navigator.share) return false;
    const probe = new File([new Blob(["x"])], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

// Copy-paste content kit for a Research Finding: X thread, Instagram carousel +
// caption, LinkedIn, email teaser, permanent link and the OG share image.
// Text only — nothing is auto-posted.

export function FindingShareKit({
  pack,
  findingId,
  slug,
  url,
  ogImagePath,
}: {
  pack: FindingContentPack;
  findingId: string;
  slug: string;
  url: string;
  ogImagePath: string;
}) {
  const xThread = pack.xThread.map((t, i) => `${i + 1}/${pack.xThread.length} ${t}`).join("\n\n———\n\n");
  const carousel = pack.instagramCarousel.map((s, i) => `Slide ${i + 1} · ${s.kicker}\n${s.title}\n${s.body}`).join("\n\n");
  const emailFull = `Subject: ${pack.emailTeaser.subject}\n\n${pack.emailTeaser.body}`;
  const slideCount = pack.instagramCarousel.length;

  const [zipping, setZipping] = useState(false);
  const downloadAll = async () => {
    setZipping(true);
    try {
      const entries: ZipEntry[] = await Promise.all(
        Array.from({ length: slideCount }, async (_, i) => {
          const res = await fetch(`/research/findings/${slug}/card/${i}`);
          return { name: `halvinglens-${findingId.toLowerCase()}-${String(i + 1).padStart(2, "0")}.png`, data: new Uint8Array(await res.arrayBuffer()) };
        }),
      );
      saveBlob(makeZip(entries), `halvinglens-${findingId.toLowerCase()}-carousel.zip`);
      track("content_download_zip", { finding: findingId, slides: slideCount });
    } finally {
      setZipping(false);
    }
  };

  // Native "Save all to Photos" — only on devices whose share sheet accepts image
  // files. Files are pre-fetched so the share() call fires synchronously inside
  // the tap gesture (iOS rejects it otherwise).
  const [shareable, setShareable] = useState(false);
  const [filesReady, setFilesReady] = useState(false);
  const filesRef = useRef<File[]>([]);

  useEffect(() => setShareable(canShareImages()), []);

  useEffect(() => {
    if (!shareable) return;
    let cancelled = false;
    setFilesReady(false);
    filesRef.current = [];
    (async () => {
      const files = await Promise.all(
        Array.from({ length: slideCount }, async (_, i) => {
          try {
            const res = await fetch(`/research/findings/${slug}/card/${i}`);
            if (!res.ok) return null;
            const blob = await res.blob();
            return new File([blob], `halvinglens-${findingId.toLowerCase()}-${String(i + 1).padStart(2, "0")}.png`, { type: "image/png" });
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      filesRef.current = files.filter(Boolean) as File[];
      setFilesReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [shareable, slideCount, slug, findingId]);

  const shareAll = useCallback(async () => {
    const files = filesRef.current;
    if (!files.length) return;
    try {
      await navigator.share({ files, title: `HalvingLens — ${findingId} carousel` });
      track("content_share_all", { finding: findingId, slides: files.length });
    } catch {
      /* user cancelled or share unavailable — no-op */
    }
  }, [findingId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <CopyButton id={findingId} label="Copy link" text={url} event="copy_link" icon={<Link2 size={13} />} prominent />
        <CopyButton id={findingId} label={`Cite as ${findingId}`} text={findingId} event="copy_citation" />
        <a
          href={ogImagePath}
          download={`halvinglens-${findingId.toLowerCase()}.png`}
          onClick={() => track("share_image", { finding: findingId })}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[12px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors"
        >
          <ImageDown size={13} /> Download share image
        </a>
      </div>

      {/* Rendered Instagram carousel — one branded PNG per slide, no manual design */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500">Instagram carousel · {slideCount} slides</div>
          <div className="flex items-center gap-2">
            {shareable && (
              <button
                onClick={shareAll}
                disabled={!filesReady}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-ink-950 text-[11.5px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60"
              >
                {filesReady ? <Share2 size={12} /> : <RefreshCw size={12} className="animate-spin" />}
                Save all to Photos
              </button>
            )}
            <button
              onClick={downloadAll}
              disabled={zipping}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors disabled:opacity-60 ${
                shareable
                  ? "border border-white/[0.1] text-ink-200 hover:border-white/25 hover:text-ink-50"
                  : "bg-accent text-ink-950 hover:bg-accent-soft"
              }`}
            >
              {zipping ? <RefreshCw size={12} className="animate-spin" /> : <Package size={12} />}
              {zipping ? "Preparing…" : "Download all (.zip)"}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {pack.instagramCarousel.map((s, i) => (
            <a
              key={i}
              href={`/research/findings/${slug}/card/${i}`}
              download={`halvinglens-${findingId.toLowerCase()}-${i + 1}.png`}
              onClick={() => track("share_image", { finding: findingId, slide: i + 1 })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] text-[11.5px] text-ink-300 hover:text-ink-100 hover:border-accent/30 transition-colors"
              title={s.title}
            >
              <ImageDown size={12} /> {i + 1}
            </a>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <CopyButton id={findingId} label="X thread" text={xThread} event="copy_x" />
        <CopyButton id={findingId} label="Instagram caption" text={pack.instagramCaption} event="copy_instagram" />
        <CopyButton id={findingId} label="Instagram carousel" text={carousel} event="copy_carousel" />
        <CopyButton id={findingId} label="LinkedIn" text={pack.linkedin} event="copy_linkedin" />
        <CopyButton id={findingId} label="Email teaser" text={emailFull} event="copy_email" />
      </div>

      <details className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <summary className="text-[12px] text-ink-300 cursor-pointer select-none">Preview the generated content</summary>
        <div className="mt-3 space-y-4">
          <Preview title="X thread" body={xThread} />
          <Preview title="Instagram carousel" body={carousel} />
          <Preview title="Instagram caption" body={pack.instagramCaption} />
          <Preview title="LinkedIn" body={pack.linkedin} />
          <Preview title="Email teaser" body={emailFull} />
        </div>
      </details>
    </div>
  );
}

function Preview({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-[0.16em] text-ink-500 mb-1.5">{title}</div>
      <pre className="text-[12px] text-ink-300 leading-relaxed whitespace-pre-wrap font-sans">{body}</pre>
    </div>
  );
}

function CopyButton({
  id,
  label,
  text,
  event,
  icon,
  prominent,
}: {
  id: string;
  label: string;
  text: string;
  event: string;
  icon?: React.ReactNode;
  prominent?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      track(event, { finding: id });
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
      {copied ? <Check size={13} /> : icon ?? <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}
