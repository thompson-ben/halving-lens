"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

// Truthful subscriber-count social proof (P6.1). Client component: fetches the
// REAL active count from /api/social-proof on mount, which rounds DOWN to a
// band and gates on SOCIAL_PROOF_MIN server-side. Renders nothing until a
// number arrives, and nothing at all when below threshold / store unconfigured
// — so it can never show a fabricated or tiny number, and never exposes
// identities. Fetching client-side (instead of at render) keeps the count live
// even though the landing pages are statically rendered.
export function SocialProof({ className, label }: { className?: string; label?: string }) {
  const [readers, setReaders] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/social-proof")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d.readers === "number") setReaders(d.readers);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (readers == null) return null;

  return (
    <p className={`inline-flex items-center gap-1.5 text-[12px] text-ink-400 ${className ?? ""}`}>
      <Users size={13} className="text-ink-500 shrink-0" />
      {label ?? `Join ${readers.toLocaleString()}+ readers getting the daily brief.`}
    </p>
  );
}
