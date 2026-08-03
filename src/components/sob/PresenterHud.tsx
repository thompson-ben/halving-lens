"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Play, Pause, RotateCcw, ListOrdered, X, Copy, Check, ChevronRight } from "lucide-react";
import { EPISODE_TARGET_LABEL } from "@/lib/presenterScript";
import type { PresenterSectionView } from "@/lib/presenterEpisode";

// Presenter HUD (2.0, PR-SB5) — floating recording aid for "Documenting the
// Cycle". Overlay chrome (position: fixed), NOT part of the page scroll, so
// the recorded page stays clean. Everything it says arrives as props from the
// briefing model via the server — it computes no facts and phrases no
// transitions of its own.
//
// It shows: which act the presenter is in (tracked against one reading line —
// the same deterministic rule as the Act 4 rail, so every act takes its turn
// exactly once), the act's cue, the SPOKEN bridge into the next act (the same
// line printed on the page), a per-act pace readout against the act's target,
// and a drawer with the full running order and a copyable episode script.
//
// Keyboard: T start/pause the timer · N / P next / previous act.
// (G toggles guides and Esc exits — owned by PresenterMode.)

/** How far down the viewport the presenter is assumed to be reading. Acts are
 *  tall, so the active act is the LAST one whose top has passed this line. */
const READING_LINE = 0.35;

function mmss(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PresenterHud({ episodeScript, sections }: { episodeScript: string; sections: PresenterSectionView[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [actElapsed, setActElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [copied, setCopied] = useState(false);
  // The page's presenter-stage is a transformed ancestor, which would re-anchor
  // position:fixed to it instead of the viewport. Portal to <body> to escape it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Recording timer — total and within-act. The act clock restarts when the
  // presenter moves on, so the pace readout always refers to the act on screen.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setElapsed((e) => e + 1);
      setActElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => setActElapsed(0), [currentIdx]);

  // Track the act being presented: the last section whose top has passed the
  // reading line. One deterministic rule — no intersection bands for a tall
  // act to fall between.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const line = window.innerHeight * READING_LINE;
      let idx = 0;
      sections.forEach((s, i) => {
        const el = document.querySelector(`[data-sob-section="${s.id}"]`);
        if (el && el.getBoundingClientRect().top <= line) idx = i;
      });
      setCurrentIdx(idx);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [sections]);

  const goTo = (i: number) => {
    const s = sections[i];
    if (!s) return;
    document.querySelector(`[data-sob-section="${s.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Keyboard: T timer, N/P navigate. G and Esc belong to PresenterMode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === "t") setRunning((r) => !r);
      if (k === "n") goTo(Math.min(currentIdx + 1, sections.length - 1));
      if (k === "p") goTo(Math.max(currentIdx - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, sections]);

  const cur = sections[currentIdx];
  const next = sections[currentIdx + 1] ?? null;
  const targetTotal = sections.reduce((a, s) => a + s.targetSeconds, 0);
  const overAct = actElapsed > cur.targetSeconds;

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
      {/* Floating cue + timers — bottom-left overlay chrome (frame out when recording). */}
      <div className="presenter-hud">
        <div className="presenter-hud__row">
          <button type="button" onClick={() => setRunning((r) => !r)} className="presenter-hud__btn" title={running ? "Pause timer (T)" : "Start timer (T)"}>
            {running ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button type="button" onClick={() => { setElapsed(0); setActElapsed(0); setRunning(false); }} className="presenter-hud__btn" title="Reset timer">
            <RotateCcw size={12} />
          </button>
          <span className="presenter-hud__timer tabular-nums">{mmss(elapsed)}</span>
          <span className="presenter-hud__target">/ target {mmss(targetTotal)} · {EPISODE_TARGET_LABEL}</span>
          <button type="button" onClick={() => setDrawer(true)} className="presenter-hud__btn presenter-hud__btn--wide" title="Running order & script">
            <ListOrdered size={13} /> <span>Running order</span>
          </button>
        </div>
        {/* Act progress — one tick per part of the running order. */}
        <div className="presenter-hud__ticks" aria-hidden>
          {sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className={`presenter-hud__tick ${i < currentIdx ? "is-done" : ""} ${i === currentIdx ? "is-current" : ""}`}
              title={s.title}
            />
          ))}
        </div>
        <div className="presenter-hud__cue">
          <span className="presenter-hud__step">{currentIdx + 1}/{sections.length}</span>
          <div>
            <div className="presenter-hud__title">
              {cur.title}{" "}
              <span className={`presenter-hud__pace tabular-nums ${overAct ? "is-over" : ""}`}>
                {mmss(actElapsed)} / ~{mmss(cur.targetSeconds)}{overAct ? " over" : ""}
              </span>
            </div>
            <div className="presenter-hud__prompt">{cur.cue}</div>
            {cur.bridge && <div className="presenter-hud__bridge">&ldquo;{cur.bridge}&rdquo;</div>}
            {next && <div className="presenter-hud__next">Next: {next.title} · N/P to move</div>}
          </div>
        </div>
      </div>

      {/* Running-order drawer — cues, spoken bridges, copyable script. */}
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
            {sections.map((s, i) => (
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
