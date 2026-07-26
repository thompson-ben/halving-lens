"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, RefreshCw, Copy, Check, Package, Image as ImageIcon, Share2, Layers, CheckCircle2 } from "lucide-react";
import { makeZip, type ZipEntry } from "@/lib/zip";
import { track } from "@/lib/track";
import type { TrackedEvent } from "@/lib/analyticsEvents";

export interface StudioCard {
  id: string;
  index: number;
  name: string;
}
export interface StudioCopy {
  caption: string;
  thread: string;
  linkedin: string;
  email: string;
  story?: string;
  youtube?: string;
}
export interface StudioPack {
  id: string; // "daily" | "historical"
  label: string; // button label, e.g. "Generate Daily Brief Pack"
  slug: string;
  dateLabel: string;
  cards: StudioCard[];
  copy: StudioCopy;
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Can this device share image files? (iPhone Safari / Android Chrome → the share
// sheet offers "Save Image" → Photos. Desktop browsers generally can't.)
function canShareImages(): boolean {
  try {
    if (typeof navigator === "undefined" || !navigator.canShare || !navigator.share) return false;
    const probe = new File([new Blob(["x"])], "probe.png", { type: "image/png" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function ContentPackStudio({ packs, initialPackId }: { packs: StudioPack[]; initialPackId?: string }) {
  // Honour a pre-selected pack (e.g. arriving from the Intelligence Queue's
  // "Generate Creative" → /admin/content?pack=…), falling back to the first pack.
  const [activeId, setActiveId] = useState(packs.some((p) => p.id === initialPackId) ? initialPackId : packs[0]?.id);
  const [version, setVersion] = useState(() => Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [shareable, setShareable] = useState(false);
  // Pre-fetched File objects, so a "Save to Photos" tap can call navigator.share
  // synchronously within the user gesture (iOS rejects it otherwise).
  const filesRef = useRef<Record<string, File>>({});
  const [filesReady, setFilesReady] = useState(false);

  const active = useMemo(() => packs.find((p) => p.id === activeId) ?? packs[0], [packs, activeId]);
  const { slug, dateLabel, cards, copy } = active;

  const cardUrl = useCallback(
    (id: string) => `/admin/content/card/${id}?pack=${active.id}&v=${version}`,
    [active.id, version],
  );

  useEffect(() => setShareable(canShareImages()), []);

  // Switching pack invalidates prefetched files and forces a fresh render.
  const selectPack = useCallback(
    (id: string) => {
      if (id === activeId) return;
      setActiveId(id);
      setVersion(Date.now());
      track("content_pack_switch", { pack: id });
    },
    [activeId],
  );

  // Prefetch the active pack's card images as Files whenever pack/version
  // changes (share only).
  useEffect(() => {
    if (!shareable) return;
    let cancelled = false;
    setFilesReady(false);
    filesRef.current = {};
    (async () => {
      await Promise.all(
        cards.map(async (c) => {
          try {
            const res = await fetch(cardUrl(c.id));
            if (!res.ok) return;
            const blob = await res.blob();
            filesRef.current[c.id] = new File([blob], `halvinglens-${active.id}-${slug}-${c.index}-${c.id}.png`, {
              type: "image/png",
            });
          } catch {
            /* ignore — share button stays best-effort */
          }
        }),
      );
      if (!cancelled) setFilesReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [shareable, version, cards, slug, cardUrl, active.id]);

  const shareFiles = async (files: File[], title: string, event: TrackedEvent, props?: Record<string, unknown>) => {
    if (!files.length) return;
    try {
      await navigator.share({ files, title });
      track(event, props ?? {});
    } catch {
      /* user cancelled or share unavailable — no-op */
    }
  };

  const downloadOne = useCallback(
    async (card: StudioCard) => {
      setBusy(card.id);
      try {
        const res = await fetch(cardUrl(card.id));
        if (!res.ok) throw new Error(`${res.status}`);
        saveBlob(await res.blob(), `halvinglens-${active.id}-${slug}-${card.index}-${card.id}.png`);
        track("content_download_card", { card: card.id, pack: active.id });
      } finally {
        setBusy(null);
      }
    },
    [cardUrl, slug, active.id],
  );

  const downloadZip = useCallback(async () => {
    setBusy("zip");
    try {
      const entries: ZipEntry[] = await Promise.all(
        cards.map(async (c) => {
          const res = await fetch(cardUrl(c.id));
          const buf = new Uint8Array(await res.arrayBuffer());
          return { name: `halvinglens-${active.id}-${slug}-${c.index}-${c.id}.png`, data: buf };
        }),
      );
      saveBlob(makeZip(entries), `halvinglens-${active.id}-${slug}-content-pack.zip`);
      track("content_download_zip", { slug, pack: active.id });
    } finally {
      setBusy(null);
    }
  }, [cardUrl, cards, slug, active.id]);

  const regenerate = useCallback(() => setVersion(Date.now()), []);

  // Log this pack as published, so the editorial engine can keep future posts
  // distinct (no repeated hero chart / layout / angle within the rolling window).
  const [postState, setPostState] = useState<"idle" | "posting" | "done" | "error">("idle");
  const markPosted = useCallback(async () => {
    setPostState("posting");
    try {
      const res = await fetch("/api/admin/social-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: active.id, postDate: slug }),
      });
      setPostState(res.ok ? "done" : "error");
      if (res.ok) track("content_pack_posted", { pack: active.id });
      setTimeout(() => setPostState("idle"), 2600);
    } catch {
      setPostState("error");
      setTimeout(() => setPostState("idle"), 2600);
    }
  }, [active.id, slug]);

  const allFiles = () => cards.map((c) => filesRef.current[c.id]).filter(Boolean) as File[];

  return (
    <div className="space-y-8">
      {/* Pack selector — the two content types */}
      <div className="flex items-center gap-3 flex-wrap">
        {packs.map((p) => {
          const on = p.id === active.id;
          return (
            <button
              key={p.id}
              onClick={() => selectPack(p.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                on
                  ? "bg-accent text-ink-950 hover:bg-accent-soft"
                  : "border border-white/[0.1] text-ink-200 hover:border-white/25 hover:text-ink-50"
              }`}
            >
              <Layers size={15} /> {p.label}
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        {shareable && (
          <button
            onClick={() => shareFiles(allFiles(), `halvinglens.com — ${active.label} ${dateLabel}`, "content_share_all", { slug, pack: active.id })}
            disabled={!filesReady}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-ink-950 text-[13px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60"
          >
            {filesReady ? <Share2 size={15} /> : <RefreshCw size={15} className="animate-spin" />}
            Save all to Photos
          </button>
        )}
        <button
          onClick={downloadZip}
          disabled={busy != null}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors disabled:opacity-60 ${
            shareable
              ? "border border-white/[0.1] text-ink-200 hover:border-white/25 hover:text-ink-50"
              : "bg-accent text-ink-950 hover:bg-accent-soft"
          }`}
        >
          {busy === "zip" ? <RefreshCw size={15} className="animate-spin" /> : <Package size={15} />}
          Download .zip
        </button>
        <button
          onClick={regenerate}
          disabled={busy != null}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.1] text-ink-200 text-[13px] hover:border-white/25 hover:text-ink-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={15} /> Regenerate
        </button>
        <button
          onClick={markPosted}
          disabled={postState === "posting"}
          title="Record this pack as published so the engine varies future posts"
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-[13px] transition-colors disabled:opacity-60 ${
            postState === "done"
              ? "border-signal-green/40 text-signal-green"
              : postState === "error"
                ? "border-signal-red/40 text-signal-red"
                : "border-white/[0.1] text-ink-200 hover:border-white/25 hover:text-ink-50"
          }`}
        >
          {postState === "posting" ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          {postState === "done" ? "Logged" : postState === "error" ? "Failed — retry" : "Mark as posted"}
        </button>
        <span className="text-[12px] text-ink-500">
          {cards.length} cards · 1080×1350 · Instagram portrait · {dateLabel}
        </span>
      </div>

      {shareable && (
        <p className="-mt-4 text-[11.5px] text-ink-500">
          On iPhone, &ldquo;Save to Photos&rdquo; opens the share sheet — choose <span className="text-ink-300">Save {cards.length} Images</span> to add them straight to your photo library.
        </p>
      )}

      {/* Card previews */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <div key={card.id} className="card p-3">
            <div className="relative rounded-lg overflow-hidden bg-[#0a0e14] border border-white/[0.05]" style={{ aspectRatio: "4 / 5" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cardUrl(card.id)} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="flex items-center justify-between gap-2 mt-3 px-1">
              <span className="text-[12px] text-ink-300">
                <span className="text-ink-500 font-mono mr-1.5">{card.index}</span>
                {card.name}
              </span>
              <div className="flex items-center gap-3">
                {shareable && (
                  <button
                    onClick={() =>
                      shareFiles(
                        [filesRef.current[card.id]].filter(Boolean) as File[],
                        `halvinglens.com — ${card.name}`,
                        "content_share_card",
                        { card: card.id, pack: active.id },
                      )
                    }
                    disabled={!filesReady}
                    title="Save to Photos"
                    className="inline-flex items-center gap-1.5 text-[11.5px] text-accent hover:text-accent-soft disabled:opacity-50"
                  >
                    <Share2 size={13} /> Save
                  </button>
                )}
                <button
                  onClick={() => downloadOne(card)}
                  disabled={busy != null}
                  title="Download PNG to files"
                  className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-400 hover:text-ink-100 disabled:opacity-50"
                >
                  {busy === card.id ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                  PNG
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Captions & copy */}
      <div>
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent mb-4 flex items-center gap-2">
          <ImageIcon size={13} /> Captions &amp; copy
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CopyBlock label="Instagram caption" text={copy.caption} event="copy_instagram" />
          <CopyBlock label="X thread" text={copy.thread} event="copy_thread" />
          <CopyBlock label="LinkedIn post" text={copy.linkedin} event="copy_linkedin" />
          <CopyBlock label="Email summary" text={copy.email} event="copy_email" />
          {copy.story && <CopyBlock label="Story caption" text={copy.story} event="copy_summary" />}
          {copy.youtube && <CopyBlock label="YouTube Community post" text={copy.youtube} event="copy_post" />}
        </div>
      </div>
    </div>
  );
}

function CopyBlock({ label, text, event }: { label: string; text: string; event: TrackedEvent }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      track(event);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  };
  return (
    <div className="card p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[12.5px] font-medium text-ink-100">{label}</span>
        <button
          onClick={onCopy}
          className={`inline-flex items-center gap-1.5 text-[11.5px] transition-colors ${
            copied ? "text-signal-green" : "text-accent hover:text-accent-soft"
          }`}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="text-[11.5px] text-ink-300 leading-relaxed whitespace-pre-wrap font-sans max-h-44 overflow-auto">
        {text}
      </pre>
    </div>
  );
}
