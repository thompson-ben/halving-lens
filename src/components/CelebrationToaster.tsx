"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// A calm, premium micro-celebration. One small toast at a time: gentle
// fade/slide, a soft cyan glow, an icon and one short sentence. Auto-dismisses
// after ~3.8s, closable by hand, and honours prefers-reduced-motion (the slide
// is dropped via Tailwind's motion-reduce variant — a quiet fade remains).
// No sound, no confetti. Satisfaction, not distraction.
export interface Celebration {
  icon: string;
  title: string;
  message: string;
}

const VISIBLE_MS = 3800;
const EXIT_MS = 280;

export function CelebrationToaster({ celebrations }: { celebrations: Celebration[] }) {
  const [queue, setQueue] = useState<Celebration[]>(celebrations);
  const [current, setCurrent] = useState<Celebration | null>(null);
  const [shown, setShown] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Pull the next celebration when idle.
  useEffect(() => {
    if (current || queue.length === 0) return;
    setCurrent(queue[0]);
    setQueue((q) => q.slice(1));
  }, [current, queue]);

  const dismiss = useCallback(() => {
    setShown(false);
    window.setTimeout(() => setCurrent(null), EXIT_MS);
  }, []);

  useEffect(() => {
    if (!current) return;
    const inT = window.setTimeout(() => setShown(true), 20); // next tick → animate in
    const outT = window.setTimeout(dismiss, VISIBLE_MS);
    return () => {
      window.clearTimeout(inT);
      window.clearTimeout(outT);
    };
  }, [current, dismiss]);

  if (!mounted || !current) return null;

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-5 z-[120] flex justify-center px-4 pointer-events-none"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex items-start gap-3 max-w-sm w-full sm:w-auto rounded-2xl border border-accent/30 bg-[#0d1016]/95 backdrop-blur px-4 py-3.5 transition-all duration-300 ease-out motion-reduce:transition-opacity ${
          shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 motion-reduce:translate-y-0"
        }`}
        style={{ boxShadow: "0 0 40px -8px rgba(45, 212, 191, 0.5), 0 8px 30px -12px rgba(0,0,0,0.6)" }}
        role="status"
      >
        <div className="text-[22px] leading-none mt-0.5" aria-hidden="true">{current.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.18em] text-accent/80">New achievement</div>
          <div className="mt-1 text-[14px] font-medium text-ink-50">{current.title}</div>
          <div className="mt-0.5 text-[12.5px] leading-snug text-ink-400">{current.message}</div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="p-1 -mr-1 -mt-0.5 rounded-lg text-ink-500 hover:text-ink-200 hover:bg-white/[0.05] transition-colors shrink-0"
        >
          <X size={15} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
