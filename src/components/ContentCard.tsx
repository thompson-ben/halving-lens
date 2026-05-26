"use client";

import { useState } from "react";
import { Heart, MessageCircle, Eye, Bookmark, Share2, ExternalLink, Sparkles, Check, X, Dna } from "lucide-react";
import { ScoreBadge } from "./ScoreBadge";
import { StatusBadge } from "./StatusBadge";
import { formatNumber, relativeTime } from "@/lib/utils";
import { PLATFORM_LABELS, type Platform, type ContentStatus } from "@/types";

export type ContentCardItem = {
  id: string;
  platform: string;
  originalAuthor?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  carMake?: string | null;
  carModel?: string | null;
  likes?: number | null;
  comments?: number | null;
  views?: number | null;
  saves?: number | null;
  shares?: number | null;
  aiScore?: number | null;
  aiReason?: string | null;
  rightsStatus: string;
  status: string;
  discoveredAt: string | Date;
  width?: number | null;
  height?: number | null;
  bestSimilarityScore?: number | null;
  similarToPost?: {
    id: string;
    caption?: string | null;
    permalink?: string | null;
    thumbnailUrl?: string | null;
  } | null;
};

export function ContentCard({
  item,
  onChange,
}: {
  item: ContentCardItem;
  onChange?: (next: ContentCardItem) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  async function setStatus(status: ContentStatus) {
    setBusy(status);
    try {
      const res = await fetch(`/api/content/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const data = await res.json();
        onChange?.({ ...item, ...data.item });
      }
    } finally {
      setBusy(null);
    }
  }

  async function generateCaption() {
    setGenerating(true);
    try {
      await fetch("/api/captions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: item.id }),
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <article className="card card-hover overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-ink-850 overflow-hidden">
        {item.thumbnailUrl ? (
          // Plain <img> to avoid next/image domain constraints in fresh installs.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.caption ?? "Content"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-400 text-sm">No preview</div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className="badge bg-ink-950/70 text-ink-100 border-ink-700">
            {PLATFORM_LABELS[item.platform as Platform] ?? item.platform}
          </span>
          <StatusBadge status={item.status} />
          {item.width && item.height && (
            <span
              className="badge bg-ink-950/70 text-ink-200 border-ink-700 tabular-nums"
              title={`${item.width} × ${item.height}px`}
            >
              {aspectLabel(item.width, item.height)}
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">
          <ScoreBadge score={item.aiScore ?? null} />
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between text-xs text-ink-300 mb-2">
          <span className="font-medium text-ink-100">{item.originalAuthor ?? "Unknown"}</span>
          <span>{relativeTime(item.discoveredAt)}</span>
        </div>

        {(item.carMake || item.carModel) && (
          <div className="text-sm text-ink-100 mb-1.5">
            {item.carMake} <span className="text-ink-300">{item.carModel}</span>
          </div>
        )}

        <p className="text-sm text-ink-200 line-clamp-3 mb-3">{item.caption}</p>

        <div className="grid grid-cols-5 gap-2 text-xs text-ink-300 mb-3">
          <Stat icon={Heart} value={item.likes} />
          <Stat icon={MessageCircle} value={item.comments} />
          <Stat icon={Eye} value={item.views} />
          <Stat icon={Bookmark} value={item.saves} />
          <Stat icon={Share2} value={item.shares} />
        </div>

        {item.bestSimilarityScore != null && item.bestSimilarityScore > 0 && (
          <div className="mb-3 flex items-center gap-2 text-xs text-ink-200 bg-ink-850 border border-ink-700 rounded-lg p-2">
            <Dna className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>
              <span className="font-semibold text-ink-100">{Math.round(item.bestSimilarityScore * 100)}%</span>
              <span className="text-ink-300"> DNA match</span>
              {item.similarToPost?.caption && (
                <span className="text-ink-400"> · similar to “{item.similarToPost.caption.slice(0, 40)}{item.similarToPost.caption.length > 40 ? "…" : ""}”</span>
              )}
            </span>
            {item.similarToPost?.permalink && (
              <a
                href={item.similarToPost.permalink}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-accent hover:underline shrink-0"
              >
                view
              </a>
            )}
          </div>
        )}

        {item.aiReason && (
          <button
            onClick={() => setReason(reason ? null : item.aiReason ?? null)}
            className="text-xs text-accent hover:underline mb-3 text-left"
          >
            {reason ? "Hide reasoning" : "Why this should perform well"}
          </button>
        )}
        {reason && (
          <div className="text-xs text-ink-200 bg-ink-850 border border-ink-700 rounded-lg p-3 mb-3">{reason}</div>
        )}

        <div className="mt-auto flex items-center gap-2 flex-wrap">
          <a href={item.url} target="_blank" rel="noreferrer" className="btn-ghost text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> Open
          </a>
          <button
            onClick={generateCaption}
            disabled={generating}
            className="btn-ghost text-xs"
            title="Generate AI captions"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {generating ? "…" : "Captions"}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setStatus("shortlisted")}
            disabled={busy === "shortlisted"}
            className="btn-ghost text-xs"
            title="Shortlist"
          >
            Shortlist
          </button>
          <button
            onClick={() => setStatus("approved")}
            disabled={busy === "approved"}
            className="btn-primary text-xs"
            title="Approve"
          >
            <Check className="w-3.5 h-3.5" /> Approve
          </button>
          <button
            onClick={() => setStatus("rejected")}
            disabled={busy === "rejected"}
            className="btn-ghost text-xs text-signal-red"
            title="Reject"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
}

function aspectLabel(w: number, h: number): string {
  const r = w / h;
  if (Math.abs(r - 1) <= 0.03) return "1:1";
  if (Math.abs(r - 0.8) <= 0.03) return "4:5";
  if (r >= 1.5) return "landscape";
  if (r <= 0.7) return "9:16";
  return `${w}×${h}`;
}

function Stat({ icon: Icon, value }: { icon: typeof Heart; value?: number | null }) {
  return (
    <div className="flex items-center gap-1">
      <Icon className="w-3.5 h-3.5" />
      <span>{formatNumber(value)}</span>
    </div>
  );
}
