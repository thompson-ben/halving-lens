"use client";

import { useState } from "react";
import { Copy, Check, Link2, ImageDown } from "lucide-react";
import { track } from "@/lib/track";
import type { FindingContentPack } from "@/lib/findingContent";

// Copy-paste content kit for a Research Finding: X thread, Instagram carousel +
// caption, LinkedIn, email teaser, permanent link and the OG share image.
// Text only — nothing is auto-posted.

export function FindingShareKit({
  pack,
  findingId,
  url,
  ogImagePath,
}: {
  pack: FindingContentPack;
  findingId: string;
  url: string;
  ogImagePath: string;
}) {
  const xThread = pack.xThread.map((t, i) => `${i + 1}/${pack.xThread.length} ${t}`).join("\n\n———\n\n");
  const carousel = pack.instagramCarousel.map((s, i) => `Slide ${i + 1} · ${s.kicker}\n${s.title}\n${s.body}`).join("\n\n");
  const emailFull = `Subject: ${pack.emailTeaser.subject}\n\n${pack.emailTeaser.body}`;

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
