"use client";

import { useCallback, useState } from "react";
import { Download, RefreshCw, Copy, Check, Package, Image as ImageIcon } from "lucide-react";
import { makeZip, type ZipEntry } from "@/lib/zip";
import { track } from "@/lib/track";

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

export function ContentPackStudio({
  slug,
  dateLabel,
  cards,
  copy,
}: {
  slug: string;
  dateLabel: string;
  cards: StudioCard[];
  copy: StudioCopy;
}) {
  const [version, setVersion] = useState(() => Date.now());
  const [busy, setBusy] = useState<string | null>(null);

  const cardUrl = useCallback(
    (id: string) => `/admin/content/card/${id}?v=${version}`,
    [version],
  );

  const downloadOne = useCallback(
    async (card: StudioCard) => {
      setBusy(card.id);
      try {
        const res = await fetch(cardUrl(card.id));
        if (!res.ok) throw new Error(`${res.status}`);
        saveBlob(await res.blob(), `halvinglens-${slug}-${card.index}-${card.id}.png`);
        track("content_download_card", { card: card.id });
      } finally {
        setBusy(null);
      }
    },
    [cardUrl, slug],
  );

  const downloadZip = useCallback(async () => {
    setBusy("zip");
    try {
      const entries: ZipEntry[] = await Promise.all(
        cards.map(async (c) => {
          const res = await fetch(cardUrl(c.id));
          const buf = new Uint8Array(await res.arrayBuffer());
          return { name: `halvinglens-${slug}-${c.index}-${c.id}.png`, data: buf };
        }),
      );
      saveBlob(makeZip(entries), `halvinglens-${slug}-content-pack.zip`);
      track("content_download_zip", { slug });
    } finally {
      setBusy(null);
    }
  }, [cardUrl, cards, slug]);

  const regenerate = useCallback(() => setVersion(Date.now()), []);

  return (
    <div className="space-y-8">
      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={downloadZip}
          disabled={busy != null}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-ink-950 text-[13px] font-medium hover:bg-accent-soft transition-colors disabled:opacity-60"
        >
          {busy === "zip" ? <RefreshCw size={15} className="animate-spin" /> : <Package size={15} />}
          Download full pack (.zip)
        </button>
        <button
          onClick={regenerate}
          disabled={busy != null}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/[0.1] text-ink-200 text-[13px] hover:border-white/25 hover:text-ink-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={15} /> Regenerate
        </button>
        <span className="text-[12px] text-ink-500">
          {cards.length} cards · 1080×1350 · Instagram portrait · {dateLabel}
        </span>
      </div>

      {/* Card previews */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        {cards.map((card) => (
          <div key={card.id} className="card p-3">
            <div className="relative rounded-lg overflow-hidden bg-[#0a0e14] border border-white/[0.05]" style={{ aspectRatio: "4 / 5" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardUrl(card.id)}
                alt={card.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex items-center justify-between gap-2 mt-3 px-1">
              <span className="text-[12px] text-ink-300">
                <span className="text-ink-500 font-mono mr-1.5">{card.index}</span>
                {card.name}
              </span>
              <button
                onClick={() => downloadOne(card)}
                disabled={busy != null}
                title="Download PNG"
                className="inline-flex items-center gap-1.5 text-[11.5px] text-accent hover:text-accent-soft disabled:opacity-50"
              >
                {busy === card.id ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
                PNG
              </button>
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
        </div>
      </div>
    </div>
  );
}

function CopyBlock({ label, text, event }: { label: string; text: string; event: string }) {
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
