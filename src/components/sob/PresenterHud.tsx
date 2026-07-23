"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, RotateCcw, ListOrdered, X, Copy, Check, ChevronRight } from "lucide-react";
import { PRESENTER_RUNNING_ORDER, EPISODE_TARGET_LABEL } from "@/lib/presenterScript";

// Presenter HUD — floating recording aid for "Documenting the Cycle". It is
// overlay chrome (position: fixed), NOT part of the page scroll, so the recorded
// page stays clean and the prompts never appear as page content. It shows the
// current section's cue (tracked by scroll), a lightweight recording timer with
// section timing guidance, and a drawer with the full running order, bridge
// lines and a copyable episode script. Only mounted in presenter mode.

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PresenterHud({ episodeScript }: { episodeScript: string }) {
  const order = PRESENTER_RUNNING_ORDER;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [copied, setCopied] = useState(false);
  // The page's presenter-stage is a transformed ancestor, which would re-anchor
  // position:fixed to it instead of the viewport. Portal to <body> to escape it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  // Recording timer.
  useEffect(() => {
    if (running) {
      tick.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => {
        if (tick.current) clearInterval(tick.current);
      };
    }
  }, [running]);

  // Track the section currently in view via its data-sob-section anchor.
  useEffect(() => {
    const els = order
      .map((s) => document.querySelector(`[data-sob-section="${s.id}"]`))
      .filter((el): el is Element => !!el);
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const id = (visible.target as HTMLElement).dataset.sobSection;
          const idx = order.findIndex((s) => s.id === id);
          if (idx >= 0) setCurrentIdx(idx);
        }
      },
      { threshold: [0.2, 0.5], rootMargin: "-20% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [order]);

  const cur = order[currentIdx];
  const next = order[currentIdx + 1] ?? null;
  const targetTotal = order.reduce((a, s) => a + s.targetSeconds, 0);

  const copyScript = () => {
    navigator.clipboard?.writeText(episodeScript).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      },
      () => {},
    );
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Floating cue + timer — bottom-left overlay chrome (frame out when recording). */}
      <div className="presenter-hud">
        <div className="presenter-hud__row">
          <button type="button" onClick={() => setRunning((r) => !r)} className="presenter-hud__btn" title={running ? "Pause timer" : "Start timer"}>
            {running ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button type="button" onClick={() => { setElapsed(0); setRunning(false); }} className="presenter-hud__btn" title="Reset timer">
            <RotateCcw size={12} />
          </button>
          <span className="presenter-hud__timer tabular-nums">{mmss(elapsed)}</span>
          <span className="presenter-hud__target">/ target {mmss(targetTotal)} · {EPISODE_TARGET_LABEL}</span>
          <button type="button" onClick={() => setDrawer(true)} className="presenter-hud__btn presenter-hud__btn--wide" title="Running order & script">
            <ListOrdered size={13} /> <span>Running order</span>
          </button>
        </div>
        <div className="presenter-hud__cue">
          <span className="presenter-hud__step">{currentIdx + 1}/{order.length}</span>
          <div>
            <div className="presenter-hud__title">{cur.title} <span className="presenter-hud__dur">· ~{cur.targetSeconds}s</span></div>
            <div className="presenter-hud__prompt">{cur.cue}</div>
            {next && <div className="presenter-hud__next">Next: {next.title}</div>}
          </div>
        </div>
      </div>

      {/* Running-order drawer — cues, bridge lines, copyable script. */}
      {drawer && (
        <div className="presenter-drawer" role="dialog" aria-label="Presenter running order">
          <div className="presenter-drawer__head">
            <span>Running order · {EPISODE_TARGET_LABEL}</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={copyScript} className="presenter-hud__btn presenter-hud__btn--wide" title="Copy the full episode script">
                {copied ? <Check size={13} /> : <Copy size={13} />} <span>{copied ? "Copied" : "Copy script"}</span>
              </button>
              <button type="button" onClick={() => setDrawer(false)} className="presenter-hud__btn" title="Close"><X size={14} /></button>
            </div>
          </div>
          <div className="presenter-drawer__body">
            {order.map((s, i) => (
              <div key={s.id} className={`presenter-drawer__item ${i === currentIdx ? "is-current" : ""}`}>
                <div className="presenter-drawer__item-head">
                  <span className="presenter-hud__step">{i + 1}</span>
                  <span className="presenter-drawer__item-title">{s.title}</span>
                  <span className="presenter-hud__dur">~{s.targetSeconds}s</span>
                </div>
                <div className="presenter-drawer__cue">{s.cue}</div>
                {s.bridge && (
                  <div className="presenter-drawer__bridge">
                    <ChevronRight size={11} /> <span>&ldquo;{s.bridge}&rdquo;</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}
