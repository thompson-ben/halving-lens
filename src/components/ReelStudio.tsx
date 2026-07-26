"use client";

import { useState } from "react";
import { Copy, Check, Clapperboard, Clock, Type, Film } from "lucide-react";
import type { ReelPackage } from "@/lib/reel";
import { track } from "@/lib/track";
import type { TrackedEvent } from "@/lib/analyticsEvents";

// Admin viewer for the Daily Reel package — every section as a copy-paste block
// so a creator can build the reel in CapCut in a few minutes. Generated
// server-side from today's live snapshot; this component only displays + copies.
export function ReelStudio({ reel, script }: { reel: ReelPackage; script: string }) {
  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-accent flex items-center gap-2">
          <Clapperboard size={14} /> Daily Reel package
        </h2>
        <CopyButton text={script} event="reel_copy_full" label="Copy full script" prominent />
      </div>

      {/* Insight + meta */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <span className="px-2 py-1 rounded-md bg-accent/15 text-accent font-medium">{reel.angleLabel}</span>
          <span className="inline-flex items-center gap-1 text-ink-400">
            <Clock size={12} /> ~{reel.estDurationSec}s
          </span>
          <span className="inline-flex items-center gap-1 text-ink-400">
            <Type size={12} /> {reel.voiceoverWordCount} words
          </span>
          <span className="text-ink-500">{reel.date}</span>
        </div>
        <p className="text-[10.5px] uppercase tracking-[0.18em] text-ink-500">The single most interesting insight today</p>
        <p className="text-[15px] text-ink-50 leading-relaxed font-medium">{reel.insight}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Block label="Title (≤ 8 words)" text={reel.title} event="reel_copy_title" />
        <Block label="Hook (0–3s)" text={reel.hook} event="reel_copy_hook" />
      </div>

      <Block label="Voiceover script (20–30s)" text={reel.voiceover} event="reel_copy_voiceover" />

      {/* Storyboard */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[12.5px] font-medium text-ink-100 flex items-center gap-1.5">
            <Film size={13} /> Visual storyboard
          </span>
          <CopyButton text={storyboardText(reel)} event="reel_copy_storyboard" label="Copy" />
        </div>
        <ol className="space-y-3">
          {reel.storyboard.map((sc) => (
            <li key={sc.n} className="flex gap-3">
              <span className="shrink-0 mt-0.5 w-6 h-6 rounded-md bg-white/[0.06] text-ink-300 text-[11px] font-mono grid place-items-center">
                {sc.n}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] text-ink-100 leading-snug">{sc.action}</p>
                <p className="text-[11px] text-ink-500 mt-1">
                  <span className="text-ink-400">{sc.durationSec}s</span> · {sc.source}
                </p>
                <p className="text-[11.5px] text-accent/90 mt-1">On-screen: “{sc.onScreenText}”</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* On-screen text + CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-[12.5px] font-medium text-ink-100">On-screen text overlays</span>
            <CopyButton text={reel.onScreenText.join("\n")} event="reel_copy_overlays" label="Copy" />
          </div>
          <ul className="space-y-1.5">
            {reel.onScreenText.map((t, i) => (
              <li key={i} className="text-[11.5px] text-ink-300 leading-relaxed">
                • {t}
              </li>
            ))}
          </ul>
        </div>
        <Block label="Call to action" text={reel.cta} event="reel_copy_cta" />
      </div>

      <Block label="Instagram caption" text={reel.instagram} event="reel_copy_caption" />
    </div>
  );
}

function storyboardText(reel: ReelPackage): string {
  return reel.storyboard
    .map((sc) => `Scene ${sc.n} (${sc.durationSec}s) — ${sc.action}\n  Screen: ${sc.source}\n  On-screen: "${sc.onScreenText}"`)
    .join("\n");
}

function Block({ label, text, event }: { label: string; text: string; event: TrackedEvent }) {
  return (
    <div className="card p-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span className="text-[12.5px] font-medium text-ink-100">{label}</span>
        <CopyButton text={text} event={event} label="Copy" />
      </div>
      <pre className="text-[11.5px] text-ink-300 leading-relaxed whitespace-pre-wrap font-sans max-h-56 overflow-auto">{text}</pre>
    </div>
  );
}

function CopyButton({
  text,
  event,
  label,
  prominent,
}: {
  text: string;
  event: TrackedEvent;
  label: string;
  prominent?: boolean;
}) {
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
    <button
      onClick={onCopy}
      className={
        prominent
          ? `inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
              copied ? "bg-signal-green/20 text-signal-green" : "bg-accent text-ink-950 hover:bg-accent-soft"
            }`
          : `inline-flex items-center gap-1.5 text-[11.5px] transition-colors ${
              copied ? "text-signal-green" : "text-accent hover:text-accent-soft"
            }`
      }
    >
      {copied ? <Check size={prominent ? 15 : 13} /> : <Copy size={prominent ? 15 : 13} />}
      {copied ? "Copied" : label}
    </button>
  );
}
