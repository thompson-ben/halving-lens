"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { track } from "@/lib/track";

// Personal referral link with copy + QR. The QR is rendered by a public,
// keyless QR service in the user's own browser.
export function ReferralShare({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&bgcolor=13161d&color=f4f1ea&data=${encodeURIComponent(link)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      track("referral_copy", {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-start">
      <div className="flex-1 w-full">
        <div className="card p-4 font-mono text-[12.5px] text-ink-200 break-all">{link}</div>
        <button
          onClick={copy}
          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent text-ink-950 text-[12.5px] font-medium hover:bg-accent-soft transition-colors"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy your link"}
        </button>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="Referral QR code" width={120} height={120} className="rounded-xl border border-white/[0.08] shrink-0" />
    </div>
  );
}
