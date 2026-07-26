"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { track } from "@/lib/track";
import type { TrackedEvent } from "@/lib/analyticsEvents";
import type { ContentPack as Pack } from "@/lib/brief";

// Cross-channel content engine: one brief → ready-to-paste copy for every
// channel. No auto-posting, no APIs — just copy buttons that cut content time
// to near zero while keeping the message consistent.
export function ContentPack({ pack }: { pack: Pack }) {
  const tabs: Array<{ key: string; label: string; text: string; event: TrackedEvent }> = [
    { key: "xPost", label: "X post", text: pack.xPost, event: "copy_post" },
    { key: "xThread", label: "X thread", text: pack.xThread.join("\n\n———\n\n"), event: "copy_thread" },
    { key: "instagram", label: "Instagram", text: pack.instagram, event: "copy_instagram" },
    { key: "linkedin", label: "LinkedIn", text: pack.linkedin, event: "copy_linkedin" },
    {
      key: "email",
      label: "Email",
      text: `Subject: ${pack.emailSubject}\n\n${pack.emailBody}`,
      event: "copy_email",
    },
  ];
  const [active, setActive] = useState(tabs[0].key);
  const current = tabs.find((t) => t.key === active)!;

  return (
    <section>
      <div className="mb-4">
        <div className="text-[10.5px] uppercase tracking-[0.22em] text-accent mb-2">Content pack</div>
        <h2 className="font-display text-[22px] lg:text-[26px] font-medium tracking-tight-2 text-ink-100 leading-tight">
          Today&apos;s brief, ready for every channel
        </h2>
        <p className="mt-2 text-[13px] text-ink-300 max-w-2xl leading-relaxed">
          One source, five formats — copy and paste. No auto-posting; you stay in control.
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
                active === t.key
                  ? "bg-accent/15 text-accent border border-accent/30"
                  : "border border-white/[0.08] text-ink-300 hover:text-ink-100 hover:border-white/20"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <pre className="whitespace-pre-wrap break-words font-sans text-[13px] text-ink-200 leading-relaxed bg-[#0b0f15] rounded-lg p-4 border border-white/[0.05] max-h-[420px] overflow-auto">
          {current.text}
        </pre>

        <div className="mt-4">
          <CopyButton label={`Copy ${current.label}`} text={current.text} event={current.event} />
        </div>
      </div>
    </section>
  );
}

function CopyButton({ label, text, event }: { label: string; text: string; event: TrackedEvent }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      track(event);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-ink-950 text-[12.5px] font-medium hover:bg-accent-soft transition-colors"
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied" : label}
    </button>
  );
}
