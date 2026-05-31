"use client";

import { useState } from "react";
import { CycleOverlayChart } from "./CycleOverlayChart";

type Mode = "normalized" | "price";

const MODES: Array<{ id: Mode; label: string }> = [
  { id: "normalized", label: "Normalised (×)" },
  { id: "price", label: "Price (USD)" },
];

const COPY: Record<Mode, { title: string; sub: string }> = {
  normalized: {
    title: "Price · normalised to halving = 1×",
    sub: "Each cycle starts at 1× on its halving day. Log Y-axis · X = days since halving.",
  },
  price: {
    title: "Price · USD",
    sub: "Absolute BTC price in each cycle. Log Y-axis · X = days since halving.",
  },
};

export function CycleOverlayPanel({ height = 460 }: { height?: number }) {
  const [mode, setMode] = useState<Mode>("normalized");

  return (
    <div className="card p-4 sm:p-7 lg:p-8 relative">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-[18px] sm:text-[20px] font-medium tracking-tight-2 text-ink-100">
            {COPY[mode].title}
          </h2>
          <div className="text-[11.5px] text-ink-400 mt-1">{COPY[mode].sub}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={`px-3 py-1.5 rounded-md border transition-colors ${
                mode === m.id
                  ? "border-accent/30 bg-accent/10 text-accent"
                  : "border-white/[0.04] bg-white/[0.015] text-ink-350 hover:text-ink-100 hover:border-white/10"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <CycleOverlayChart mode={mode} height={height} />
      <div className="watermark">halvinglens.com · {mode === "price" ? "price" : "normalised"}</div>
    </div>
  );
}
