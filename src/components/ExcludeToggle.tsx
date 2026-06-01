"use client";

import { useEffect, useState } from "react";
import { EyeOff, Eye } from "lucide-react";
import { isOptedOut, setOptOut } from "@/lib/track";

// Toggle to exclude your own browser from analytics (so testing doesn't skew
// the numbers). State lives in localStorage on this device.
export function ExcludeToggle() {
  const [excluded, setExcluded] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setExcluded(isOptedOut());
    setReady(true);
  }, []);

  const toggle = () => {
    const next = !excluded;
    setOptOut(next);
    setExcluded(next);
  };

  if (!ready) return null;

  return (
    <button
      onClick={toggle}
      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-[12.5px] transition-colors ${
        excluded
          ? "border-signal-green/30 bg-signal-green/[0.08] text-signal-green"
          : "border-white/[0.08] text-ink-300 hover:text-ink-100 hover:border-white/20"
      }`}
      title="Stops this browser's visits from being counted in analytics"
    >
      {excluded ? <EyeOff size={14} /> : <Eye size={14} />}
      {excluded ? "My visits are excluded" : "Exclude my visits"}
    </button>
  );
}
